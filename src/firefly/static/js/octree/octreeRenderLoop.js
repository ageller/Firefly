function updateOctree(){

	viewerParams.FPS = viewerParams.fps_list.reduce((a, b) => a + b, 0)/viewerParams.fps_list.length;

	//check and remove duplicates from scene (I don't know why this happens)
	if (viewerParams.octree.drawCount % 50 == 0) removeDuplicatesFromScene();

	//check if we should reset the draw buffer
	var dateCheck = new Date().getTime()/1000.
	if ((dateCheck - viewerParams.octree.drawStartTime) > viewerParams.octree.maxDrawInterval && viewerParams.octree.drawPass > 100  && viewerParams.octree.drawCount < viewerParams.octree.toDraw.length){
		console.log('clearing drawing buffer', viewerParams.octree.toDraw.length)
		viewerParams.octree.drawStartTime = new Date().getTime()/1000;
		clearDrawer();
		clearRemover();
	}

	//check if we've successfully drawn all the particles
	if (viewerParams.octree.drawCount >= viewerParams.octree.drawIndex && viewerParams.octree.drawIndex > 0) {
		console.log('done drawing', viewerParams.octree.drawCount, viewerParams.octree.drawIndex);
		clearDrawer();
	}


	//check if we've successfully re moved all the particles
	if (viewerParams.octree.removeCount >= viewerParams.octree.removeIndex && viewerParams.octree.removeIndex > 0) {
		console.log('done removing', viewerParams.octree.removeCount, viewerParams.octree.removeIndex);
		clearRemover();
	}
	//remove any nodes that are flagged for removal
	if (viewerParams.octree.toRemove.length > 0 && viewerParams.octree.removeCount > viewerParams.octree.removeIndex) removeUnwantedNodes();

	//draw the nodes that are flagged for drawing
	if (viewerParams.octree.toDraw.length > 0 && viewerParams.octree.drawCount > viewerParams.octree.drawIndex) drawWantedNodes();

	//check if the object is in view (if not, we won't draw and can remove; though note that this will not pick up new nodes that shouldn't be drawn)
	//https://github.com/mrdoob/three.js/issues/15339
	viewerParams.camera.updateMatrix();
	viewerParams.camera.updateMatrixWorld();
	viewerParams.frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(viewerParams.camera.projectionMatrix, viewerParams.camera.matrixWorldInverse));  


	//tweak the number of particles based on the fps
	//not sure what limits I should set here
	viewerParams.octree.NParticleFPSModifier = Math.max(0.01, Math.min(1., viewerParams.FPS/viewerParams.octree.targetFPS));

	//rather than a for loop to go through the particles, I am going to manually iterate so that I can draw from one each draw pass
	//this way the scene gets filled in more regularly, instead of filling in one particle group at a time
	var p = viewerParams.partsKeys[viewerParams.octree.pIndex];

	//first get all the sizes and distances and sort
	var toSort = []
	var indices = []
	if (viewerParams.octree.nodes.hasOwnProperty(p)){
		viewerParams.octree.nodes[p].forEach(function(node,i){
			setNodeDrawParams(node);

			//don't include any nodes that are marked for removal
			if (!viewerParams.octree.toRemoveIDs.includes(p+node.id)){
				toSort.push(node.cameraDistance);
				//toSort.push(node.screenSize/node.cameraDistance);
				indices.push(i);
			}
		});
		//sort from big to small
		//indices.sort(function (a, b) { return toSort[a] > toSort[b] ? -1 : toSort[a] < toSort[b] ? 1 : 0; });
		//sort from small to big
		indices.sort(function (a, b) { return toSort[a] < toSort[b] ? -1 : toSort[a] > toSort[b] ? 1 : 0; });

		indices.forEach(function(index){

			var node = viewerParams.octree.nodes[p][index];
			var obj = viewerParams.scene.getObjectByName(p+node.id);

			if (viewerParams.octree.drawPass > viewerParams.partsKeys.length){
				//adjust particles that are already drawn (I want this to work every time and on all nodes)
				if (obj){

					if (node.screenSize >= viewerParams.octree.minNodeScreenSize && node.inView){
						//particles to adjust (I could make this an if statement t only change if needed, but would that even speed things up?)
						obj.material.uniforms.maxToRender.value = node.NparticlesToRender;
						obj.material.uniforms.octreePointScale.value = node.particleSizeScale;
						obj.material.needsUpdate = true;
						if (node.particles.Coordinates.length >= node.NparticlesToRender) reduceOctreeParticles(node)
					} else {
						//particles to remove
						if (viewerParams.octree.toRemove.length < viewerParams.octree.maxToRemove && node.particles.Coordinates.length > Math.floor(node.Nparticles*viewerParams.octree.minFracParticlesToDraw[p]) && !viewerParams.octree.toRemoveIDs.includes(p+node.id)){
							//console.log('removing node', p, node.id, node.NparticlesToRender, node.Nparticles, node.particles.Coordinates.length, node.screenSize, node.inView)
							viewerParams.octree.toRemove.push([p, node.id]); //will be removed later
							viewerParams.octree.toRemoveIDs.push(p+node.id);
						}

					}
				}
			}

			//add to the draw list, only when there are available slots in viewerParams.octree.toDraw
			if (viewerParams.octree.toDraw.length < viewerParams.octree.maxFilesToRead) {
				if (!viewerParams.octree.toDrawIDs.includes(p+node.id) && node.NparticlesToRender > 0){
					//new nodes
					if (!obj && node.screenSize >= viewerParams.octree.minNodeScreenSize && node.inView ){
						//console.log('drawing node', p, node.id, node.NparticlesToRender, node.Nparticles, node.particles.Coordinates.length, node.screenSize, node.inView)
						viewerParams.octree.toDraw.push([p, node.id, false]);
						viewerParams.octree.toDrawIDs.push(p+node.id);
					}
					
					//existing node that needs more particles
					if (obj && node.particles.Coordinates.length < node.NparticlesToRender && viewerParams.octree.toDraw.length < viewerParams.octree.maxFilesToRead && node.inView){
						//console.log('updating node', p, node.id, node.NparticlesToRender, node.Nparticles, node.particles.Coordinates.length, node.screenSize, node.inView)
						viewerParams.octree.toDraw.push([p, node.id, true]); //will be updated later
						viewerParams.octree.toDrawIDs.push(p+node.id);
					} 
				}

				if (viewerParams.octree.toDraw.length >= viewerParams.octree.maxFilesToRead) {
					viewerParams.octree.drawCount = 0;
					viewerParams.octree.drawIndex = -1;
					console.log('reached draw limit', p, viewerParams.octree.toDraw.length);
					return false;
				}
				return true;
			}
		})

	}

	//increment relevant variables
	viewerParams.octree.drawPass += 1;
	viewerParams.octree.pIndex = (viewerParams.octree.pIndex + 1) % viewerParams.partsKeys.length;

	
}

function clearDrawer(){
	viewerParams.octree.drawCount = 0;
	viewerParams.octree.drawIndex = -1;
	viewerParams.octree.toDraw = [];
	viewerParams.octree.toDrawIDs = [];

}

function clearRemover(){
	viewerParams.octree.removeCount = 0;
	viewerParams.octree.removeIndex = -1;
	viewerParams.octree.toRemove = [];
	viewerParams.octree.toRemoveIDs = [];
}

function removeDuplicatesFromScene(){
	//For some reason duplicate nodes get drawn to the scene.  This will remove them
	var keepNames = [];
	var removeNames = [];
	viewerParams.scene.traverse(function(obj){
		if (obj.isMesh || obj.isLine || obj.isPoints) {
			if (keepNames.includes(obj.name)) {
				removeNames.push(obj.name);
			} else {
				keepNames.push(obj.name);
			}
		}
	})
	if (removeNames.length > 0){
		console.log('have duplicates in scene', removeNames.length, removeNames)
		removeNames.forEach(function(name){
			obj = viewerParams.scene.getObjectByName(name);
			if (obj) viewerParams.scene.remove(obj);
		})
	}

}
function removeUnwantedNodes(){
	console.log('removing', viewerParams.octree.toRemove.length);
	viewerParams.octree.removeCount = 0;
	viewerParams.octree.removeIndex = viewerParams.octree.toRemove.length;
	viewerParams.octree.toRemove.forEach(function(arr){
		var p = arr[0];
		var iden = arr[1];
		var obj = viewerParams.scene.getObjectByName(p+iden);
		var node = null;
		viewerParams.octree.nodes[p].forEach(function(n){
			if (n.id == iden) node = n;
		})
		if (node && obj){
			//swap geometry for the minimum number of particles to show
			node.NparticlesToRender = Math.floor(node.Nparticles*viewerParams.octree.minFracParticlesToDraw[p]);
			reduceOctreeParticles(node);
			var geo = createOctreeParticleGeometry(p, node.particles, 0, node.NparticlesToRender);
			obj.geometry = geo;
			obj.geometry.needsUpdate = true;
		}
		viewerParams.octree.removeCount += 1;

	});
}

function drawWantedNodes(){
	console.log('drawing', viewerParams.octree.toDraw.length);
	viewerParams.octree.drawCount = 0;
	viewerParams.octree.drawIndex = viewerParams.octree.toDraw.length;
	viewerParams.octree.toDraw.forEach(function(arr){
		var p = arr[0];
		var iden = arr[1];
		var updateGeo = arr[2];
		var node = null;
		viewerParams.octree.nodes[p].forEach(function(n){
			if (n.id == iden) node = n;
		})
		if (node) drawOctreeNode(node, updateGeo);
	})
}


function setNodeDrawParams(node){
//https://discourse.threejs.org/t/how-to-converting-world-coordinates-to-2d-mouse-coordinates-in-threejs/2251

	//estimate the screen size by taking the max of the x,y,z widths
	//x width
	var x1 = new THREE.Vector3(node.x - node.width/2., node.y, node.z);
	x1.project(viewerParams.camera);
	x1.x = (x1.x + 1)*window.innerWidth/2.;
	x1.y = (x1.y - 1)*window.innerHeight/2.;
	x1.z = 0;
	var x2 = new THREE.Vector3(node.x + node.width/2., node.y, node.z);
	x2.project(viewerParams.camera);
	x2.x = (x2.x + 1)*window.innerWidth/2.;
	x2.y = (x2.y - 1)*window.innerHeight/2.;
	x2.z = 0;
	var xwidth = x1.distanceTo(x2);	
	if (!isFinite(xwidth)) xwidth = 0.;

	//y width
	var y1 = new THREE.Vector3(node.x, node.y - node.width/2., node.z);
	y1.project(viewerParams.camera);
	y1.x = (y1.x + 1)*window.innerWidth/2.;
	y1.y = (y1.y - 1)*window.innerHeight/2.;
	y1.z = 0;
	var y2 = new THREE.Vector3(node.x, node.y + node.width/2., node.z);
	y2.project(viewerParams.camera);
	y2.x = (y2.x + 1)*window.innerWidth/2.;
	y2.y = (y2.y - 1)*window.innerHeight/2.;
	y2.z = 0;
	var ywidth = y1.distanceTo(y2);	
	if (!isFinite(ywidth)) ywidth = 0.;

	//x width
	var z1 = new THREE.Vector3(node.x, node.y, node.z - node.width/2.);
	z1.project(viewerParams.camera);
	z1.x = (z1.x + 1)*window.innerWidth/2.;
	z1.y = (z1.y - 1)*window.innerHeight/2.;
	z1.z = 0;
	var z2 = new THREE.Vector3(node.x, node.y, node.z + node.width/2.);
	z2.project(viewerParams.camera);
	z2.x = (z2.x + 1)*window.innerWidth/2.;
	z2.y = (z2.y - 1)*window.innerHeight/2.;
	z2.z = 0;
	var zwidth = z1.distanceTo(z2);	
	if (!isFinite(zwidth)) zwidth = 0.;

	//return a fraction of the screen size
	var width = Math.max(xwidth, Math.max(ywidth, zwidth));

	if (width == 0) console.log('bad width', node.particleType, node.id, xwidth, ywidth, zwidth);

	//this will be a width in pixels
	node.screenSize = width

	//this will be a normalized width between 0 and 1 (by what should I normalize to)
	//node.screenSize = width/((window.innerWidth + window.innerHeight)/2.)

	//distance from camera
	node.cameraDistance = Math.max(0, viewerParams.camera.position.distanceTo( new THREE.Vector3( node.x, node.y, node.z) ));

	//check whether in view of the camera
	node.inView = inFrustum(node);

	var p = node.particleType;

	//number of particles to render will depend on the camera distance and fps
	node.NparticlesToRender = Math.max(Math.floor(node.Nparticles*viewerParams.octree.minFracParticlesToDraw[p]), Math.min(node.Nparticles, Math.floor(node.Nparticles*viewerParams.octree.normCameraDistance[p]/node.cameraDistance*viewerParams.octree.NParticleFPSModifier)));

	if (node.screenSize < viewerParams.octree.minNodeScreenSize || !node.inView) node.NparticlesToRender = Math.floor(node.Nparticles*viewerParams.octree.minFracParticlesToDraw[p]);

	node.NparticlesToRender = Math.min(node.Nparticles, node.NparticlesToRender);

	//scale particles size by the fraction rendered?
	//node.particleSizeScale = viewerParams.octree.boxSize*node.Nparticles/node.NparticlesToRender*viewerParams.octree.particleDefaultSizeScale[p];

	node.color = viewerParams.Pcolors[p].slice();
	if (node.NparticlesToRender > 0) node.color[3] = viewerParams.Pcolors[p][3]*Math.min(1., node.Nparticles/node.NparticlesToRender);

}

function inFrustum(node){

	//use three.js check (only possible if already in scene)
	var obj = viewerParams.scene.getObjectByName(node.particleType + node.id);
	if (obj){
		if (viewerParams.frustum.intersectsObject(obj)) return true;
	}

	//in case the above fails, check manually
	//check if any of the corners is within the frustum
	var p;

	p = new THREE.Vector3( node.x, node.y, node.z);
	if (viewerParams.frustum.containsPoint(p)) return true;

	p = new THREE.Vector3( node.x + node.width/2., node.y + node.width/2., node.z + node.width/2.);
	if (viewerParams.frustum.containsPoint(p)) return true;

	p = new THREE.Vector3( node.x - node.width/2., node.y + node.width/2., node.z + node.width/2.);
	if (viewerParams.frustum.containsPoint(p)) return true;

	p = new THREE.Vector3( node.x + node.width/2., node.y - node.width/2., node.z + node.width/2.);
	if (viewerParams.frustum.containsPoint(p)) return true;

	p = new THREE.Vector3( node.x - node.width/2., node.y - node.width/2., node.z + node.width/2.);
	if (viewerParams.frustum.containsPoint(p)) return true;

	p = new THREE.Vector3( node.x + node.width/2., node.y + node.width/2., node.z - node.width/2.);
	if (viewerParams.frustum.containsPoint(p)) return true;

	p = new THREE.Vector3( node.x - node.width/2., node.y + node.width/2., node.z - node.width/2.);
	if (viewerParams.frustum.containsPoint(p)) return true;

	p = new THREE.Vector3( node.x + node.width/2., node.y - node.width/2., node.z - node.width/2.);
	if (viewerParams.frustum.containsPoint(p)) return true;

	p = new THREE.Vector3( node.x - node.width/2., node.y - node.width/2., node.z - node.width/2.);
	if (viewerParams.frustum.containsPoint(p)) return true;



	return false;

}