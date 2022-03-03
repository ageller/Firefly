function containsPoint(t){
	t = new THREE.Vector3(t).project(viewerParams.camera)
	const e=viewerParams.frustum.planes;
	for(let n=0;n<6;n++) if (e[n].distanceToPoint(t)<0) return false; return true;
}

function updateOctree(){

	var pkey = viewerParams.partsKeys[viewerParams.octree.pIndex];

	//rather than a for loop to go through the particles, I am going to manually iterate so that I can draw from one each draw pass
	//this way the scene gets filled in more regularly, instead of filling in one particle group at a time
	var octree = viewerParams.parts[pkey].octree;

	// short circuit here if this particle type isn't shown
	//  or if it doesn't have an octree in the first place.
	if (!octree || !viewerParams.showParts[pkey]) return updateOctreePindex();

	//  check if we can draw a new node
	if (!viewerParams.octree.waitingToDraw && viewerParams.octree.toDraw[pkey].length > 0 ) drawNextOctreeNode();

	// check if we can remove  a node
	if (!viewerParams.octree.waitingToRemove && viewerParams.octree.toRemove.length > 0) removeNextOctreeNode();

	//check and remove duplicates from scene (I don't know why this happens)
	//also perform a few other updates
	//if (viewerParams.octree.drawPass % 50 == 0) {
		//removeDuplicatesFromScene();
		//updateOctreeLoadingBar(); //in case this doesn't get updated properly during the draw loop (can be 1 or 2 off after last draw in completed)
	//}	

	// update the camera so that we can determine if stuff is off screen or not
	//https://github.com/mrdoob/three.js/issues/15339
	viewerParams.camera.updateMatrix();
	viewerParams.camera.updateMatrixWorld();
	viewerParams.frustum.setFromProjectionMatrix(
		new THREE.Matrix4().multiplyMatrices(
			viewerParams.camera.projectionMatrix,
			viewerParams.camera.matrixWorldInverse));

	// only update the octree if this pkey has an octree
	//  and we're actually showing it on the screen
	openCloseNodes(octree['']);

	//if we are done drawing, check if we should adjust the number of particles further see if I need to reduce the particles even further
	/*
	if (viewerParams.octree.toRemove.length == 0 && 
		viewerParams.octree.toReduce.length == 0){
		if (viewerParams.memoryUsage > viewerParams.octree.memoryLimit) viewerParams.octree.NParticleMemoryModifierFac = THREE.Math.clamp(viewerParams.octree.NParticleMemoryModifierFac/2., 0, 1.);
		// we have to draw fewer particles / node

		if (viewerParams.memoryUsage < viewerParams.octree.memoryLimit && viewerParams.octree.toDraw.length == 0) {
			viewerParams.octree.NParticleMemoryModifierFac = THREE.Math.clamp(viewerParams.octree.NParticleMemoryModifierFac*2., 0, 1.);
			viewerParams.octree.NParticleMemoryModifier = THREE.Math.clamp(viewerParams.octree.NParticleMemoryModifierFac*viewerParams.octree.memoryLimit/viewerParams.memoryUsage, 0., 1.);
			d3.select('#decimationOctreeSpan').text((1./viewerParams.octree.NParticleMemoryModifier).toFixed(1))

		}// we can draw more particles / node
	}
	*/

	//increment the draw pass
	//viewerParams.octree.drawPass += 1;

	//prioritization
	//  use only one array, don't need toDraw and toDrawIDs if everything
	//  uses one or the other
	//prioritizeOctreeDrawList(toDraw, toDrawIDs);
	//prioritizeOctreeReduceList(toReduce, toReduceIDs);
	//prioritizeOctreeRemoveList();

	// move to the next particle type
	return updateOctreePindex();
}

function openCloseNodes(node){
	//adjust the draw range based on GUI sliders
	/*
	var nparts = THREE.Math.clamp(
		node.NparticlesToRender*viewerParams.plotNmax[p]/100.*(1./viewerParams.decimate),
		0,
		node.particles.Coordinates.length);

	obj.geometry.setDrawRange( 0, nparts); //is this giving me an error sometimes?

	//reset the point size
	obj.material.uniforms.octreePointScale.value = node.particleSizeScale;
	obj.material.needsUpdate = true;
	*/

	// find the node size in pixels and then compare to the 
	//  size of the window
	var node_size_pix = getScreenSize(node);
	var onscreen = checkOnScreen(node);
	var inside = checkInside(node);
	var too_small = checkTooSmall(node_size_pix);
	var too_big = checkTooBig(node_size_pix);

	// every function truncates forEach loop when return is false

	// this node is too small. we should hide each of its children *and* its CoM
	if (too_small){
		node.state = 'too small';
		node.current_state = 'remove';
		// if we haven't already, let's hide the CoM
		free_buffer(node,hideCoM);
		node.children.forEach(function (child_name){free_buffer(node.octree[child_name],hideCoM)});
	}
	// don't need to draw nodes that aren't on screen 
	else if (!onscreen && !inside){
		// if we haven't already, let's hide the CoM
		node.state = 'off screen';
		node.current_state = 'remove';
		free_buffer(node,showCoM);
		node.children.forEach(function (child_name){free_buffer(node.octree[child_name],hideCoM)});
	}
	// this node is too large, we should hide its CoM and (maybe) show its children
	else if (inside || too_big){  
		node.state = 'inside or too big';
		node.current_state = 'draw';
		// if we haven't already, let's hide the CoM
		load_buffer(node,hideCoM);
		node.children.forEach(function (child_name){openCloseNodes(node.octree[child_name])});
	}  
	// this node is just right. let's check if we should do anything
	//  to its children
	else if (onscreen && !inside){
		node.state = 'just right';
		// if we don't currently have this node's buffer particles
		// loaded then we'll show the CoM.
		if (!node.drawn) showCoM(node);
		// check if any of the children also need to be opened/closed
		node.children.forEach(function (child_name){openCloseNodes(node.octree[child_name])});
	}
	// I don't think it is actually possible to get into here but if we do
	//  I want to know about it
	else {
		console.log(onscreen,inside,too_small,too_big)
		debugger
	}
}

function checkOnScreen(node){
	return inFrustum(node);
	var min_project = node.bounding_box.min.clone().project(viewerParams.camera);
	var max_project = node.bounding_box.max.clone().project(viewerParams.camera);
	var cen_project = new THREE.Vector3(node.center[0],node.center[1],node.center[2])
	cen_project = cen_project.project(viewerParams.camera);
	var min_onscreen = true;
	var max_onscreen = true;
	var cen_onscreen = true;

	// thresh = 1 corresponds to point being *just* off-scren. 
	var thresh = 5; // a little more aggressive, culls stuff at the edge of the screen


	['x','y'].forEach(function (axis){
		min_onscreen = (min_project[axis] > -thresh && min_project[axis] < thresh) && min_onscreen;
		max_onscreen = (max_project[axis] > -thresh && max_project[axis] < thresh) && max_onscreen;
		cen_onscreen = (cen_project[axis] > -thresh && cen_project[axis] < thresh) && cen_onscreen;
	})	

	//if (node.refinement==0){console.log(cen_onscreen,cen_project)}

	return min_onscreen || max_onscreen || cen_onscreen;
}

function checkInside(node){
	var inside = true;
	var dist;
	var width2 = node.width*node.width/4;
	['x','y','z'].forEach(function (axis,j){
		dist = viewerParams.camera.position[axis]  - node.center[j]
		inside = inside && (dist*dist < width2);
	})
	return inside;
}

function checkTooSmall(node_size_pix,threshold=10){
	return node_size_pix < threshold 
	return (node_size_pix < viewerParams.renderWidth/32 || // too thin
		node_size_pix < viewerParams.renderHeight/32);// too short
}

function checkTooBig(node_size_pix,threshold=20){
	return node_size_pix > threshold;
	return (node_size_pix > viewerParams.renderWidth/16 ||// too wide
		node_size_pix > viewerParams.renderHeight/16); // too tall
}

function hideCoM(node){
	if (!node.com_shown) return;
	node.com_shown = false;
	mesh = viewerParams.partsMesh[node.pkey][0];
	if (node.octbox) node.octbox.visible = false;
	mesh.geometry.attributes.radiusScale.array[node.node_index] = 0;
	mesh.geometry.attributes.alpha.array[node.node_index] = 0;

	mesh.geometry.attributes.radiusScale.needsUpdate = true;
	mesh.geometry.attributes.alpha.needsUpdate = true;
	viewerParams.parts[node.pkey].IsDrawn[node.node_index] = 0;
}

function showCoM(node){
	if (node.com_shown) return;
	node.com_shown = true;
	mesh = viewerParams.partsMesh[node.pkey][0];
	if (node.octbox) node.octbox.visible = true;
	mesh.geometry.attributes.radiusScale.array[node.node_index] = node.radius;//1e4;

	mesh.geometry.attributes.alpha.array[node.node_index] = 1;
	mesh.geometry.attributes.radiusScale.needsUpdate = true;
	mesh.geometry.attributes.alpha.needsUpdate = true;
	viewerParams.parts[node.pkey].IsDrawn[node.node_index] = 1;
}

function load_buffer(node,callback,skip_queue=false){
	if (skip_queue) return drawOctreeNode(node, callback);	

	// add to the draw list, only when there are available slots in toDraw and when memory usage is low enough
	if (
		node.buffer_size > 0 &&// node has particles to be drawn
		//viewerParams.memoryUsage < viewerParams.octree.memoryLimit && // we have enough memory
		//toDrawIDs.length < viewerParams.octree.maxFilesToRead && 
		!node.mesh && // not already in the scene
		!node.drawn && // not in the process of being drawn
		!checkInQueue(node) // not already in the draw queue
		) { 
			
			// check if node is also in the remove queue, 
			//  if so, let's remove it from there and
			//  add it to this queue instead. (true->extract)
			checkInQueue(node,'remove',true)

			// need to create a new mesh for this node
			viewerParams.octree.toDraw[node.pkey].push([ node, callback]);
	} 
	//else return callback(node);
}

function free_buffer(node,callback,skip_queue=false){
	if (skip_queue) return removeOctreeNode(node,callback);

	if (
		node.mesh &&
		node.drawn // two checks to see if it has been drawn
		//viewerParams.octree.toRemove.length < viewerParams.octree.maxToRemove && 
		//node.particles.Coordinates.length > Math.floor(node.Nparticles*viewerParams.octree.minFracParticlesToDraw[p]) && 
		) {
			// check if this node is already in the queue to be drawn
			
			// check draw queue and remove node if it's in there.
			checkInQueue(node,'draw',true);

			// let's remove it from the remove queue because the callback might not match
			//  whatever we're asking it to do now. NOTE that this could constantly
			//  juggle a node to the end of the queue over and over again which could be wasteful?
			checkInQueue(node,'remove',true);

			viewerParams.octree.toRemove.push([node,callback]); 
		}
	//else return callback(node);
}

function checkInQueue(node,queue='draw',extract=false){
	// check if this node is already in the queue to be drawn
	var contained = false;
	var this_queue = queue == 'draw' ? viewerParams.octree.toDraw[node.pkey] : viewerParams.octree.toRemove
	index = this_queue.forEach(
		function (ele,index){
			if (ele[0].obj_name==node.obj_name){ 
				contained=true;
				return index;}
		});

	// TODO replcae the callback function if sent
	// if we've been asked to extract this element from
	//  the queue we're checking,let's do so.
	if (extract && contained) this_queue.splice(index,1);

	return contained;
}

function getScreenSize(node){
	//estimate the screen size by taking the max of the x,y,z widths
	//x width
	dists = [0,0,0]
	axes = ['x','y','z']
	axes.forEach(function (axis,i){
		var xp = new THREE.Vector3(node.center[0],node.center[1],node.center[2]);
		var xm = new THREE.Vector3(node.center[0],node.center[1],node.center[2]);
		xp[axis] += node.width/2;
		xm[axis] -= node.width/2;

		[xp,xm].forEach(function (xt){
			xt.project(viewerParams.camera);
			xt.x = (xt.x + 1)*window.innerWidth/2.;
			xt.y = (xt.y - 1)*window.innerHeight/2.;
		})
		dists[i] = xp.distanceTo(xm);
	});

	// there's no built in array max function??? absurd
	return Math.max(dists[0],Math.max(dists[1],dists[2]));
}

function drawNextOctreeNode(){

	//work from the back of the array
	var pkey = viewerParams.partsKeys[viewerParams.octree.pIndex];
	var tuple = viewerParams.octree.toDraw[pkey].pop(); // shift takes the first element, pop does the last

	// not sure why you might end up in here if the list is empty
	//  but it happened while i was testing toggling
	//  different particle types /shrug
	if (!tuple) return;

	// unpack the tuple
	var node = tuple[0];
	var callback = tuple[1];

	// if the node is already drawn but was somehow added to the list 
	//  we'll just skip it rather than move to the next element
	while (node.mesh && viewerParams.octree.toDraw.length){
		// take the next in line to draw
		tuple = viewerParams.octree.toDraw[pkey].pop(); // shift takes the first element, pop does the last
		// unpack the tuple
		node = tuple[0];
		callback = tuple[1];}
	
	// if the node is already drawn let's skip it
	//  (should only happen if the list is now empty)
	//  OR if it's also in the remove array (identified by "current_state")
	if (node.mesh || node.current_state != 'draw') return callback(node);

	viewerParams.octree.waitingToDraw = true;
	return drawOctreeNode(node, callback);	
}

function removeNextOctreeNode(){
	//work from the back of the array
	//viewerParams.octree.waitingToRemove = true;
	var tuple = viewerParams.octree.toRemove.pop();
	var node = tuple[0];
	var callback = tuple[1];

	// if the node was already removed move on to the next one
	while (!node.mesh && viewerParams.octree.toRemove.length){
		tuple = viewerParams.octree.toRemove.pop();
		node = tuple[0];
		callback = tuple[1];
	}

	// if the node is already removed let's skip it
	//  (should only happen if the list is now empty)
	//  OR if it's also in the draw array (identified by "current_state")
	if (!node.mesh || node.current_state != 'remove') return callback(node);

	viewerParams.octree.waitingtoRemove = true;
	return removeOctreeNode(node,callback);
}

function reduceNextOctreeNode(){
	//work from the back of the array (since prioritized by the most important to view)
	viewerParams.octree.waitingToReduce = true;
	var i = viewerParams.octree.toReduce.length - 1;
	var arr = viewerParams.octree.toReduce[i];
	var p = arr[0];
	var iden = arr[1];
	var obj = viewerParams.scene.getObjectByName(p+iden);
	var node = null;
	viewerParams.octree.nodes[p].forEach(function(n){
		if (n.id == iden) node = n;
	})
	//console.log('reducing', p, iden)

	if (node && obj){
		reduceOctreeParticles(node, node.NparticlesToRender, true, resetWaitingToReduce);
	}

	viewerParams.octree.toReduce.pop();
	viewerParams.octree.toReduceIDs.pop();
}

function updateOctreePindex(){
	viewerParams.octree.pIndex = (viewerParams.octree.pIndex + 1) % viewerParams.partsKeys.length;

	// see if any particles are currently toggled on
	var any_shown = viewerParams.partsKeys.some(function (pkey){return viewerParams.showParts[pkey]})

	// if this particle type isn't being shown then we'll just continue to the next one until we find one
	//  that way we don't waste draw passes short circuiting unecessarily
	while (any_shown && !viewerParams.showParts[viewerParams.partsKeys[viewerParams.octree.pIndex]]){
		viewerParams.octree.pIndex = (viewerParams.octree.pIndex + 1) % viewerParams.partsKeys.length;
	}
}

function resetWaitingToRemove(){
	viewerParams.octree.waitingToRemove = false;
}

function resetWaitingToReduce(){
	viewerParams.octree.waitingToReduce = false;
}

function inFrustum(node){

	//use three.js check (only possible if already in scene)
	//I think this is causing a redraw loop where Three.js thinks it is in the scene, but then it gets removed on the next pass
	// var obj = viewerParams.scene.getObjectByName(node.particleType + node.id);
	// if (obj){
	// 	if (viewerParams.frustum.intersectsObject(obj)) return true;
	// }

	//in case the above fails, check manually
	//check if any of the corners is within the frustum

	var u;
	var p = new THREE.Vector3(node.center_of_mass[0],node.center_of_mass[1],node.center_of_mass[2]);
	var offsets = [0,1,-1];
	var foo = false;
	offsets.forEach(function (xoffset){
		offsets.forEach(function (yoffset){
			offsets.forEach(function (zoffset){
				u = new THREE.Vector3(
					p.x+xoffset*node.width/2,
					p.y+yoffset*node.width/2,
					p.z+zoffset*node.width/2);
				if (viewerParams.frustum.containsPoint(u)) foo=true;;
			})
		})
	})

	
	p = new THREE.Vector3(
		node.center_of_mass[0] + node.width/2.,
		node.center_of_mass[1] + node.width/2.,
		node.center_of_mass[2] + node.width/2.);
	if (viewerParams.frustum.containsPoint(p)) return true;

	p = new THREE.Vector3(
		node.center_of_mass[0] - node.width/2.,
		node.center_of_mass[1] + node.width/2.,
		node.center_of_mass[2] + node.width/2.);
	if (viewerParams.frustum.containsPoint(p)) return true;

	p = new THREE.Vector3(
		node.center_of_mass[0] + node.width/2.,
		node.center_of_mass[1] - node.width/2.,
		node.center_of_mass[2] + node.width/2.);
	if (viewerParams.frustum.containsPoint(p)) return true;

	p = new THREE.Vector3(
		node.center_of_mass[0] - node.width/2.,
		node.center_of_mass[1] - node.width/2.,
		node.center_of_mass[2] + node.width/2.);
	if (viewerParams.frustum.containsPoint(p)) return true;

	p = new THREE.Vector3(
		node.center_of_mass[0] + node.width/2.,
		node.center_of_mass[1] + node.width/2.,
		node.center_of_mass[2] - node.width/2.);
	if (viewerParams.frustum.containsPoint(p)) return true;

	p = new THREE.Vector3(
		node.center_of_mass[0] - node.width/2.,
		node.center_of_mass[1] + node.width/2.,
		node.center_of_mass[2] - node.width/2.);
	if (viewerParams.frustum.containsPoint(p)) return true;

	p = new THREE.Vector3(
		node.center_of_mass[0] + node.width/2.,
		node.center_of_mass[1] - node.width/2.,
		node.center_of_mass[2] - node.width/2.);
	if (viewerParams.frustum.containsPoint(p)) return true;

	p = new THREE.Vector3(
		node.center_of_mass[0] - node.width/2.,
		node.center_of_mass[1] - node.width/2.,
		node.center_of_mass[2] - node.width/2.);
	if (viewerParams.frustum.containsPoint(p)) return true;

	return false;
}