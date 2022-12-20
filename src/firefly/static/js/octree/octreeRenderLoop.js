function containsPoint(t){
	t = new THREE.Vector3(t).project(viewerParams.camera)
	const e=viewerParams.frustum.planes;
	for(let n=0;n<6;n++) if (e[n].distanceToPoint(t)<0) return false; return true;
}

function updateOctree(treewalk=false){

	var pkey = viewerParams.partsKeys[viewerParams.octree.pIndex];

	//rather than a for loop to go through the particles, I am going to manually iterate so that I can draw from one each draw pass
	//this way the scene gets filled in more regularly, instead of filling in one particle group at a time
	var octree = viewerParams.parts[pkey].octree;

	// short circuit here if this particle type isn't shown
	//  or if it doesn't have an octree in the first place.
	if (!octree || !viewerParams.showParts[pkey]) return updateOctreePindex();

	// check if we're over the memory limit. if so, move the oldest mesh to the remove queue
	if (viewerParams.memoryUsage > viewerParams.octree.memoryLimit){
		var i = 0;
		var prefix_length = (pkey + '-').length

		var node_name,node,node_dist;
		var max_node_dist = -1;
		var max_node = null;

		viewerParams.partsMesh[pkey].forEach(function (mesh){
			node_name = mesh.name;
			if (!(node_name.includes('root') || node_name.includes('Standard'))){
				node = octree[node_name.slice(prefix_length)];
				node_dist = viewerParams.camera.position.distanceTo(node.center);
				if ((node_dist > max_node_dist ) || !checkOnScreen(node)){
					max_node_dist = node_dist;
					max_node = node;
				}
			};
		})
		// make sure we didn't end up at the root b.c. it was at the end or something weird
		if (max_node) free_buffer(max_node,showCoM,skip_queue=true);
	}

	//  check if we can draw a new node
	if (!viewerParams.octree.waitingToDraw && viewerParams.octree.toDraw[pkey].length > 0 ){
		/*
		console.log('before',
			viewerParams.octree.toDraw[pkey][0][0].name,
			viewerParams.camera.position.distanceTo(viewerParams.octree.toDraw[pkey][0][0].center))
			var min_dist = 1e10;
			var min_name;
		*/

		// sort the draw list by distance to the camera
		viewerParams.octree.toDraw[pkey].sort(function (nodetuple1,nodetuple2){
			dist1 = viewerParams.camera.position.distanceTo(nodetuple1[0].center)
			dist2 = viewerParams.camera.position.distanceTo(nodetuple2[0].center)
			/*
			if (dist1 < min_dist){
				min_dist = dist1;
				min_name = nodetuple1[0].name;
			}
			*/
			return dist1-dist2;
		});

		/*
		console.log('after ',
			viewerParams.octree.toDraw[pkey][0][0].name,
			viewerParams.camera.position.distanceTo(viewerParams.octree.toDraw[pkey][0][0].center))
		console.log('min   ',min_name,min_dist)
		*/
		
		drawNextOctreeNode();
	}

	// check if we can remove a node
	while (!viewerParams.octree.waitingToRemove && viewerParams.octree.toRemove.length > 0) removeNextOctreeNode();

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

	// walk children and try to short-circuit the walk when no longer necessary
	if (treewalk) openCloseNodes(octree[''],octree,true);
	// loop through every single node every single render frame. reliable but expensive
	else{
		evaluateFunctionOnOctreeNodes(
			openCloseNodes,
			octree[''],
			octree);
	}

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

function openCloseNodes(node,octree,treewalk=false){
	//adjust the draw range based on GUI sliders
	/*
	var nparts = THREE.Math.clamp(
		node.NparticlesToRender*viewerParams.plotNmax[p]/100.*(1./viewerParams.decimate),
		0,
		node.particles.Coordinates.length);

	obj.geometry.setDrawRange( 0, nparts); //is this giving me an error sometimes?

	*/
	// find the node size in pixels and then compare to the 
	//  size of the window
	var node_angle_deg = getScreenSize(node);
	var onscreen = checkOnScreen(node);
	var inside = checkInside(node);
	var too_big = checkTooBig(node_angle_deg);

	// the only scenario where we actually want to load the data from disk
	var should_draw = inside || (onscreen && too_big)

	var too_small = checkTooSmall(node_angle_deg);

	// this node is too small. we should hide each of its children *and* its CoM
	if (too_small || !onscreen){
		node.state = 'too small';
		node.current_state = 'remove';
		// if we haven't already, let's hide the CoM
		free_buffer(node,hideCoM);
		if (treewalk) node.children.forEach(function (child_name){free_buffer(octree[child_name],hideCoM)});
	}
	// don't need to draw nodes that aren't on screen 
	else if (!onscreen && !inside){
		// if we haven't already, let's show the CoM so it's ready when we pan the camera
		node.state = 'off screen';
		node.current_state = 'remove';
		if (!node.drawn){
			// remove it from the draw queue
			checkInQueue(node,'draw',true);
			// show the CoM -- effectively "remove" it if we 
			//  haven't already opened it but don't free up the memory unless 
			//  we've zoomed far enough away or moved the camera. (i.e. too_small == true)
 			showCoM(node);
		}
		//free_buffer(node,showCoM);
		if (treewalk) node.children.forEach(function (child_name){free_buffer(octree[child_name],hideCoM)});
	}
	// we should add this node's buffer particles to the scene and hide its CoM. 
	//  then think about its children
	// should_draw = inside || (onscreen && too_big)
	else if (should_draw){  
		node.state = 'inside or too big';
		node.current_state = 'draw';
		// if we haven't already, let's hide the CoM
		load_buffer(node,hideCoM);
		if (treewalk) node.children.forEach(function (child_name){openCloseNodes(octree[child_name],octree)});
	}  
	// this node is just right. let's check if we should do anything
	//  to its children
	else if (onscreen && !inside){
		node.state = 'just right';
		// if we don't currently have this node's buffer particles
		// loaded then we'll show the CoM.
		if (!node.drawn) showCoM(node);
		// check if any of the children also need to be opened/closed
		if (treewalk) node.children.forEach(function (child_name){openCloseNodes(octree[child_name],octree)});
	}
	// I don't think it is actually possible to get into here but if we do
	//  I want to know about it
	else {
		console.log(node.name,node_angle_deg,'onscreen:',onscreen,'inside',inside,'too_small',too_small,'too_big',too_big)
		debugger
	}
}

function checkInside(node){
	var inside = true;
	var dist;
	var width2 = node.width*node.width/4;
	['x','y','z'].forEach(function (axis,j){
		dist = viewerParams.camera.position[axis]  - node.center[axis]
		inside = inside && (dist*dist < width2);
	})
	return inside;
}

function checkTooSmall(node_angle_deg,threshold=.1){
	return node_angle_deg < threshold 
}

function checkTooBig(node_angle_deg,threshold=1){
	return node_angle_deg > threshold;
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
	if (node.com_shown || !viewerParams.showCoMParticles) return;
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

			node.queue = 'draw';
			// need to create a new mesh for this node
			viewerParams.octree.toDraw[node.pkey].push([ node, callback]);
	} 
	//else return callback(node);
}

function free_buffer(node,callback,skip_queue=false){
	if (skip_queue) return removeOctreeNode(node,callback);

	// two checks to see if it has been drawn (or is in the process of being drawn)
	if (node.mesh && node.drawn){ 
		// if it's already in the remove queue, keep it in its position but replace the callback
		//  otherwise, add it to the end of the remove queue
		if (!checkInQueue(node,'remove',false,callback)){
			node.queue = 'remove';
			viewerParams.octree.toRemove.push([node,callback]);
		}
	}
	// check draw queue and remove node if it's in there.
	else checkInQueue(node,'draw',true);
}

function checkInQueue(node,queue='draw',extract=false,replace_callback=null){

	var in_this_queue = queue == node.queue;

	// only loop through the queue if we need to
	if (in_this_queue && (extract || replace_callback)){
		// pick the actual queue object corresponding to the string
		var this_queue = queue == 'draw' ? viewerParams.octree.toDraw[node.pkey] : viewerParams.octree.toRemove

		// 'every' function truncates forEach loop when return is false
		var match_index=null;
		this_queue.every(
			function (ele,index){
				if (ele[0].obj_name==node.obj_name){
					match_index=index; // store the index of the match
					return false;} // tells the loop to stop
				return true; 
			});

		// if we've been asked to extract this element from
		//  the queue we're checking,let's do so.
		if (extract && match_index!=null) {
			this_queue.splice(match_index,1);
			// tell the node it was removed from the queue
			node.queue = null;
		}
		// if we've been asked to replace the callback function let's do so
		else if (replace_callback && match_index!=null) this_queue[match_index][1] = replace_callback;
		return match_index!=null;
	}
	else return in_this_queue;
}

function getScreenSize(node){

	var dist = node.center.distanceTo(viewerParams.camera.position)
	var angle = Math.atan(node.radius/dist)/Math.PI*180
	return angle

	//estimate the screen size by taking the max of the x,y,z widths
	//x width
	dists = [0,0,0]
	axes = ['x','y']//,'z']
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

	var node_size_pix = Math.max(dists[0],Math.max(dists[1],dists[2]));
	// there's no built in array max function??? absurd
	return node_size_pix;
}

function drawNextOctreeNode(){

	//work from the back of the array
	var pkey = viewerParams.partsKeys[viewerParams.octree.pIndex];
	var tuple = viewerParams.octree.toDraw[pkey].shift(); // shift takes the first element, pop does the last

	// not sure why you might end up in here if the list is empty
	//  but it happened while i was testing toggling
	//  different particle types /shrug
	if (!tuple) return;

	// unpack the tuple
	var node = tuple[0];
	var callback = tuple[1];
	// tell the node it was removed from the queue
	node.queue = null; 

	// if the node is already drawn but was somehow added to the list 
	//  we'll just skip it rather than move to the next element
	while (node.mesh && viewerParams.octree.toDraw.length){
		// take the next in line to draw
		tuple = viewerParams.octree.toDraw[pkey].pop(); // shift takes the first element, pop does the last
		// unpack the tuple
		node = tuple[0];
		callback = tuple[1];}
		// tell the node it was removed from the queue
		node.queue = null; 
	
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
	var tuple = viewerParams.octree.toRemove.shift();
	if (!tuple) return;

	var node = tuple[0];
	var callback = tuple[1];
	// tell the node we removed it from the queue
	node.queue = null;

	// if the node was already removed move on to the next one
	while (!node.mesh && viewerParams.octree.toRemove.length){
		tuple = viewerParams.octree.toRemove.shift();
		node = tuple[0];
		callback = tuple[1];
		// tell the node we removed it from the queue
		node.queue = null;
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

function checkOnScreen(node){

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
	return foo;

	
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
