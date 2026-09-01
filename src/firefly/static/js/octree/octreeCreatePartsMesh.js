// add this node's buffers to the memory accounting. the byte count is stashed on
//  the node so releaseNodeMemory subtracts exactly what was added, rather than
//  recomputing from a geometry that may already be disposed.
function accountNodeMemory(node,geo){
	if (!viewerParams.octree.bytesInMemory[node.pkey]) viewerParams.octree.bytesInMemory[node.pkey] = 0;

	node.bytes_in_memory = computeGeometryBytes(geo);
	viewerParams.octree.bytesInMemory[node.pkey] += node.bytes_in_memory;
	viewerParams.octree.totalBytesInMemory += node.bytes_in_memory;
}

// take this node's buffers back out of the memory accounting. clamped at zero
//  because clearPartsMesh can reset a group's total out from under us.
function releaseNodeMemory(node){
	if (!node.bytes_in_memory) return;
	viewerParams.octree.bytesInMemory[node.pkey] = Math.max(0,
		viewerParams.octree.bytesInMemory[node.pkey] - node.bytes_in_memory);
	viewerParams.octree.totalBytesInMemory = Math.max(0,
		viewerParams.octree.totalBytesInMemory - node.bytes_in_memory);
	node.bytes_in_memory = 0;
}

// true once this node's particle group is gone from viewerParams: the dataset
//  was switched out (resetViewerToInitialState) while the node's buffer fetch
//  was still in flight. compileFFTREEData and the hideCoM/showCoM callbacks all
//  index by pkey, so a late fetch has to bail rather than throw.
function octreeNodeIsStale(node){
	return !viewerParams.parts ||
		!viewerParams.parts[node.pkey] ||
		!viewerParams.partsMesh[node.pkey];
}

function addOctreeParticlesToScene(
	node,
	start, end){

	//I can use the start and end values to define how many particles to add to the mesh,
	//  but first I want to try limitting this in the shader with maxToRender.  That may be quicker than add/removing meshes.

	viewerParams.octree.drawStartTime = new Date().getTime()/1000;
	try {
		if (end - start > 0){

			// create a geometry very eager like. might attach to a mesh
			//  that exists, might make a whole new mesh, who can say.
			var geo = createParticleGeometry(node.pkey, node.particles, start, end);

			// replace the geometry in the existing mesh, we'd want to do this if we've loaded additional
			//  particles since last drawing this node (in the case where we are only drawing a subset of the
			//  particles. We'll assume that the new particles are appended to the back of the list and we'll
			//  replace the geometry in the mesh with this new expanded geometry.)
			if (node.mesh) {
				// free the buffers we're replacing before swapping the new ones in
				releaseNodeMemory(node);
				node.mesh.geometry.dispose();
				node.mesh.geometry = geo;
				node.mesh.geometry.needsUpdate = true;}
			// have to create a whole mesh for this geometry
			else {

				// var she blows, a brand new mesh
				var material = createParticleMaterial(node.pkey);
				var mesh = new THREE.Points(geo, material);
				// name this bad larry so we can find it later using scene.getObjectByName
				mesh.name = node.obj_name;
				mesh.position.set(0,0,0); //  <--- what is this?

				// add to the scene and keep track in the partsMesh array
				//  and in the node
				viewerParams.scene.add(mesh);
				viewerParams.partsMesh[node.pkey].push(mesh);
				node.mesh = mesh;
			}

			accountNodeMemory(node,geo);
		}
	} finally {
		// always free up the queue to draw again: if anything above throws and
		//  this is skipped, the octree draw queue stalls for good
		viewerParams.octree.drawCount += 1;
		viewerParams.octree.waitingToDraw = false;
	}

	// and increment the loading bar (coalesced; see requestOctreeLoadingBarUpdate)
	requestOctreeLoadingBarUpdate();

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

function drawOctreeNode(node, callback){

	// final check that this node should *still* be drawn. 
	// if not, skip before doing anything we might regret
	var node_angle_deg = getScreenSize(node);
	var inside = checkInside(node);
	var too_big = checkTooBig(node_angle_deg);
	var onscreen = checkOnScreen(node);
	var should_draw = inside || (onscreen && too_big)
	if (!should_draw){
		// something changes about this node by the time we got to it to draw so 
		//  we're going to move on to the next one.
		viewerParams.octree.waitingToDraw = false;
		return drawNextOctreeNode();}

	// prevent the node from being added to the toDraw list again
	node.drawn = true;
	var start = 0;
	var end = node.buffer_size;

	// check if we should actually load the data
	if (!(!node.mesh && node.current_state=='draw')){
		viewerParams.octree.waitingToDraw = false;
		return}

	//read in the file, and then draw the particles
	return loadFFTREEKaitai( node,
	function (kaitai_format,node){
		// dataset was replaced while this fetch was in flight -- release the
		//  draw gate and stop. don't run the callback: it indexes by pkey too.
		if (octreeNodeIsStale(node)){
			viewerParams.octree.waitingToDraw = false;
			return;
		}

		// fill node with formatted data
		compileFFTREEData(kaitai_format,node);

		if (node.state != 'inside or too big' && node.state != 'just right'){
			console.log(node.obj_name,node.state,node.current_state,node.particles)}

		// last check if we should actually SHOW the data we just loaded
		if (!(!node.mesh && node.current_state=='draw')) {
			viewerParams.octree.waitingToDraw = false;
			return callback(node); }

		// create the mesh and add it to the scene
		addOctreeParticlesToScene(
			node,
			start, end)

		node.drawPass = viewerParams.octree.drawPass;
		/*
		node.mesh.material.uniforms.color[0]=1
		node.mesh.material.uniforms.color[1]=0
		node.mesh.material.uniforms.color[2]=0
		node.mesh.material.needsUpdate = true;
		*/

		// spawn in new mesh with any filters, UI values, etc...
		update_particle_mesh(node.pkey,node.mesh,true,true,true,true);

		viewerParams.octree.loadingCount[node.pkey][1]+=node.buffer_size;//1
		viewerParams.octree.loadingCount[node.pkey][0]+=1
		viewerParams.octree.waitingToDraw = false;

		// finish by executing the callback
		return callback(node);
	});
}

function removeOctreeNode(node,callback){
	if (node.mesh){
		releaseNodeMemory(node);

		node.mesh.geometry.dispose();
		node.mesh.material.dispose();
		viewerParams.scene.remove(node.mesh);

		// search partsMesh list for a matching mesh to remove it from the list
		var match_index=null;
		viewerParams.partsMesh[node.pkey].every(
			function (m,index){
				if (m.name == node.obj_name){
					match_index = index;
					return false;
				}
				else return true;
			}
		)

		// remove from partsMesh (index 0 is a valid match, so compare to null)
		if (match_index != null) viewerParams.partsMesh[node.pkey].splice(match_index,1);
		node.mesh=null;
		node.drawn=false;

		// unreference buffer data by deleting the .particles attribute
		delete node.particles;

		viewerParams.octree.loadingCount[node.pkey][0]-=1
		viewerParams.octree.loadingCount[node.pkey][1]-=node.buffer_size;//1
		requestOctreeLoadingBarUpdate();
	}
	// released unconditionally so a node without a mesh can't stall the remove queue
	viewerParams.octree.waitingToRemove = false;
	return callback(node);
}

// drop everything queued for a particle group. node.queue has to be cleared too
//  or checkInQueue keeps believing these nodes are still enqueued.
function clearOctreeDrawQueue(p){
	viewerParams.octree.toDraw[p].forEach(function (tuple){tuple[0].queue = null});
	viewerParams.octree.toDraw[p] = [];
}

function clearOctreeRemoveQueue(p){
	viewerParams.octree.toRemove = viewerParams.octree.toRemove.filter(function (tuple){
		if (tuple[0].pkey != p) return true;
		tuple[0].queue = null;
		return false;
	});
}

// free every loaded node for this particle group.
//
// pauseLoading also stops streaming, so the group stays cleared: otherwise the
//  next tree walk sees the same camera and pulls everything straight back off
//  disk. Callers tearing the dataset down entirely pass false.
function disposeOctreeNodes(p, pauseLoading=true){
	console.log('disposing of all nodes ', p);

	// empty the queues first, or anything already waiting gets drawn right back
	clearOctreeDrawQueue(p);
	clearOctreeRemoveQueue(p);

	var this_octree = viewerParams.parts[p].octree;
	evaluateFunctionOnOctreeNodes(
		function (node){
			removeOctreeNode(node, function (node){true});
			node.queue = null;
			// 'remove' also catches nodes whose fetch is still in flight:
			//  drawOctreeNode rechecks current_state in its callback and drops the
			//  data instead of adding a mesh after we've cleared
			node.current_state = 'remove';
			// that in-flight node skipped removeOctreeNode's `if (node.mesh)`
			//  branch, so clear drawn here or load_buffer won't requeue it on resume
			node.drawn = false;
		},
		this_octree[''],
		this_octree);

	viewerParams.octree.loadingCount[p] = [0,0];

	//I think I should reset this just in case
	viewerParams.octree.waitingToDraw = false;
	viewerParams.octree.waitingToReduce = false;
	viewerParams.octree.waitingToRemove = false;

	if (pauseLoading) viewerParams.octree.loadingPaused[p] = true;

	updateOctreeLoadingBar();
	sendOctreeMemoryToGUI();
}

// pause/resume streaming for one particle group, leaving whatever is already
//  loaded on screen
function setOctreeLoadingPaused(args){
	var p = args[0];
	var paused = args[1];

	viewerParams.octree.loadingPaused[p] = paused;

	// on resume, drop the stale queue so nodes are re-evaluated against where the
	//  camera is now
	if (!paused) clearOctreeDrawQueue(p);

	sendOctreeMemoryToGUI();
}

function clearOctreeMemory(args){
	var p = args[0];
	disposeOctreeNodes(p, true);
}
