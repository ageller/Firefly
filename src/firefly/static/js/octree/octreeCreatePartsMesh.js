function addOctreeParticlesToScene(p, parts, name, start, end, minPointSize=viewerParams.octree.defaultMinParticleSize, octreePointScale=1., updateGeo=false){
	//I can use the start and end values to define how many particles to add to the mesh,
	//  but first I want to try limitting this in the shader with maxToRender.  That may be quicker than add/removing meshes.

	viewerParams.octree.drawStartTime = new Date().getTime()/1000;
	if (end - start > 0){

		//geometry
		var geo = createParticleGeometry(p, parts, start, end);

		var maxN = end - start;

		if (updateGeo){
			//update the geometry in the mesh
			var obj = viewerParams.scene.getObjectByName(name);
			if (obj){
				obj.geometry = geo;
				obj.geometry.needsUpdate = true;
			}

		} else {
	
			//material
			var material = createParticleMaterial(p, minPointSize, octreePointScale);

			var mesh = new THREE.Points(geo, material);
			mesh.name = name;
			mesh.position.set(0,0,0);

			viewerParams.scene.add(mesh);
			viewerParams.partsMesh[p].push(mesh);

		}
	}


	viewerParams.octree.drawCount += 1;
	updateOctreeLoadingBar();

	viewerParams.octree.waitingToDraw = false;

}

function reduceOctreeParticles(node, N = null, recreateGeo = false, callback = null){
	if (N == null) N = node.NparticlesToRender;
	Object.keys(node.particles).forEach(function(k){
		if (N < node.particles[k].length) node.particles[k].splice(N);
	})
	if (recreateGeo){
		var p = node.particleType;
		var obj = viewerParams.scene.getObjectByName(p+node.id);
		if (obj){
			var geo = createParticleGeometry(p, node.particles, 0, N);
			obj.geometry.dispose()
			obj.geometry = geo;
			obj.geometry.setDrawRange( 0, N*viewerParams.plotNmax[p]/100.*(1./viewerParams.decimate));
			obj.geometry.needsUpdate = true;
		}
	}

	if (callback) callback();

}

function drawOctreeNode(node, updateGeo=false){
	
	var name = node.particleType + node.id;

	var doDraw = true;
	//one final check to see if the node is already in the scene
	viewerParams.scene.traverse(function(obj){
		if (obj.name == name) doDraw = false;
	})

	if (doDraw || updateGeo){
		node.drawn = false;
		var start = 0;
		var end = node.NparticlesToRender;
		var minSize = viewerParams.octree.defaultMinParticleSize;
		var sizeScale = node.particleSizeScale;
		var name = node.particleType + node.id;

		if (node.hasOwnProperty('particles')){
			if (node.particles.Coordinates.length >= node.NparticlesToRender){
				addOctreeParticlesToScene(node.particleType, node.particles, name, start, end, minSize, sizeScale, updateGeo);
				node.drawn = true;
				node.drawPass = viewerParams.octree.drawPass;
			}
		}

		if (!node.drawn){
			//read in the file, and then draw the particles
			d3.csv(node.filename,function(d) {
				//console.log('checking parts',node.particleType, node.filename)
				//reformat this to the usual Firefly structure with Coordinates as a list of lists
				node.particles = formatOctreeCSVdata(d.slice(0,node.NparticlesToRender), node.particleType);
				addOctreeParticlesToScene(node.particleType, node.particles, name, start, end, minSize, sizeScale, updateGeo);
				node.drawn = true;
				node.drawPass = viewerParams.octree.drawPass;
			})
		}
	}

}

function octreeParticleInFilter(p, parts, j){
	if (!viewerParams.showParts[p]) return false;

	for (k=0; k<viewerParams.fkeys[p].length; k++){
		fk = viewerParams.fkeys[p][k];
		var val = (viewerParams.filterVals[p][fk][0] + viewerParams.filterVals[p][fk][1])/2.;

		// if the field value for this particle exists:
		if (viewerParams.parts[p][fk] != null) {
			if (parts.hasOwnProperty(fk)) val = parts[fk][j];
	
			// we want to hide this particle
			if ( (!viewerParams.invertFilter[p][fk] &&  
				(val < viewerParams.filterVals[p][fk][0] || 
				val > viewerParams.filterVals[p][fk][1])) || 
				( (viewerParams.invertFilter[p][fk] && 
				(val > viewerParams.filterVals[p][fk][0] && 
				val < viewerParams.filterVals[p][fk][1])))   ){

				// set the radius to 0 and the alpha to 0
				return false
			} 
		}
	}
	return true
}



function disposeOctreeNodes(p){
	console.log('disposing of all nodes ', p);
	var sceneRemove = [];
	viewerParams.scene.traverse(function(obj){
		if (obj.name.includes(p)){
			//remove from scene memory
			obj.geometry.dispose();
			obj.material.dispose();
			sceneRemove.push(obj);

			//remove from node memory
			var iden = obj.name.replace(p,'');
			var node = null;
			viewerParams.octree.nodes[p].forEach(function(n){
				if (n.id == iden) node = n;
			})
			if (node) initNode(node, p)

		}
	})

	//remove any remnant from scene (can't do this in the traverse loop)
	sceneRemove.forEach(function(obj){
		viewerParams.scene.remove(obj);
	})

	//remove from any of the draw/remove/reduce arrays
	var indices = [];
	viewerParams.octree.toRemoveIDs.forEach(function(iden,i){
		if (iden.includes(p)) indices.push(i);
	})
	indices.forEach(function(i){
		viewerParams.octree.toRemoveIDs.splice(i,1);
		viewerParams.octree.toRemove.splice(i,1);
	})

	var indices = [];
	viewerParams.octree.toRemoveTmpIDs.forEach(function(iden,i){
		if (iden.includes(p)) indices.push(i);
	})
	indices.forEach(function(i){
		viewerParams.octree.toRemoveTmpIDs.splice(i,1);
		viewerParams.octree.toRemoveTmp.splice(i,1);
	})


	indices = [];
	viewerParams.octree.toReduceIDs.forEach(function(iden,i){
		if (iden.includes(p)) indices.push(i);
	})
	indices.forEach(function(i){
		viewerParams.octree.toReduceIDs.splice(i,1);
		viewerParams.octree.toReduce.splice(i,1);
	})


	indices = [];
	viewerParams.octree.toDrawIDs.forEach(function(iden,i){
		if (iden.includes(p)) indices.push(i);
	})
	indices.forEach(function(i){
		viewerParams.octree.toDrawIDs.splice(i,1);
		viewerParams.octree.toDraw.splice(i,1);
	})

	//for loading bar
	viewerParams.octree.loadingCount[p][1]  = 0;
	updateOctreeLoadingBar();

	//I think I should reset this just in case
	viewerParams.octree.waitingToDraw = false;
	viewerParams.octree.waitingToReduce = false;
	viewerParams.octree.waitingToRemove = false;
}

function createOctBox(node){
	const geometry = new THREE.BufferGeometry();
	// create a simple square shape. We duplicate the top left and bottom right
	// vertices because each vertex needs to appear once per triangle.
	const vertices = new Float32Array( [
		-1.0, -1.0,  1.0,
		1.0, -1.0,  1.0,
		1.0,  1.0,  1.0,

		1.0,  1.0,  1.0,
		-1.0,  1.0,  1.0,
		-1.0, -1.0,  1.0,

		1.0,  1.0,  -1.0,
		-1.0,  1.0,  -1.0,
		-1.0, -1.0,  -1.0
	] );

	// itemSize = 3 because there are 3 values (components) per vertex
	geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
	const material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
	const mesh = new THREE.Mesh( geometry, material );
	const wireframe = new THREE.WireframeGeometry( mesh.geometry );
	let line = new THREE.LineSegments( wireframe );
	line.material.depthTest = false;
	line.material.opacity = 0.25;
	line.material.transparent = true;
	line.position.x = node.center[0];
	line.position.y = node.center[1];
	line.position.z = node.center[2];
	line.scale.x = line.scale.y = line.scale.z = node.width/2;
	//debugger
	var obj =  new THREE.BoxHelper( line );
	obj.visible=false;
	viewerParams.scene.add(obj);

	node.octbox = obj;

	return obj;
}