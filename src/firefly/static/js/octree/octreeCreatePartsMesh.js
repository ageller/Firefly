function addOctreeParticlesToScene(
	node, 
	start, end, 
	minPointSize=viewerParams.octree.defaultMinParticleSize, 
	octreePointScale=1.){

	//I can use the start and end values to define how many particles to add to the mesh,
	//  but first I want to try limitting this in the shader with maxToRender.  That may be quicker than add/removing meshes.

	viewerParams.octree.drawStartTime = new Date().getTime()/1000;
	if (end - start > 0){

		// create a geometry very eager like. might attach to a mesh
		//  that exists, might make a whole new mesh, who can say.
		var geo = createParticleGeometry(node.pkey, node.particles, start, end);

		// replace the geometry in the existing mesh, we'd want to do this if we've loaded additional
		//  particles since last drawing this node (in the case where we are only drawing a subset of the 
		//  particles. We'll assume that the new particles are appended to the back of the list and we'll 
		//  replace the geometry in the mesh with this new expanded geometry.)
		if (node.mesh) {
			node.mesh.geometry = geo; 
			node.mesh.geometry.needsUpdate = true;}
		// have to create a whole mesh for this geometry
		else {
	
			// var she blows, a brand new mesh
			var material = createParticleMaterial(node.pkey, minPointSize, octreePointScale,[1,0,0,1]);
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
	}

	// finish up, make a record of the draw, free up the queue to draw again
	//  and increment the loading bar
	viewerParams.octree.drawCount += 1;
	viewerParams.octree.waitingToDraw = false;
	updateOctreeLoadingBar();

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

	// prevent the node from being added to the toDraw list again
	node.drawn = true;
	var start = 0;
	var end = node.buffer_size;
	var minSize = 100;//viewerParams.octree.defaultMinParticleSize;
	var sizeScale = 1000;//node.particleSizeScale;

	// check if we should actually load the data
	if (!(!node.mesh && node.current_state=='draw')){
		viewerParams.octree.waitingToDraw = false;
		return callback(node);}

	//read in the file, and then draw the particles
	return loadFFTREEKaitai( node,
	function (kaitai_format,node){
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
			start, end,
			minSize, sizeScale);

		node.drawPass = viewerParams.octree.drawPass;
		/*
		node.mesh.material.uniforms.color[0]=1
		node.mesh.material.uniforms.color[1]=0
		node.mesh.material.uniforms.color[2]=0
		node.mesh.material.needsUpdate = true;
		*/

		// spawn in new mesh with any filters, UI values, etc...
		update_particle_mesh(node.pkey,node.mesh,true,true,true);

		viewerParams.octree.loadingCount[node.pkey]+=1
		viewerParams.octree.waitingToDraw = false;

		// finish by executing the callback
		return callback(node);
	});
}

function removeOctreeNode(node,callback){
	if (node.mesh){
		node.mesh.geometry.dispose();
		node.mesh.material.dispose();
		viewerParams.scene.remove(node.mesh);
		//viewerParams.partsMesh[node.pkey] // remove this partsmesh
		node.mesh=null;
		node.drawn=false;
		
		viewerParams.octree.loadingCount[node.pkey]-=1
		viewerParams.octree.waitingToRemove = false;
		updateOctreeLoadingBar();
	}
	return callback(node);
}

function disposeOctreeNodes(p){
	console.log('disposing of all nodes ', p);

	var this_octree = viewerParams.parts[p].octree;
	evaluateFunctionOnOctreeNodes(
		function (node){removeOctreeNode(node, function (node){true})},
		this_octree[''],
		this_octree);

	//I think I should reset this just in case
	viewerParams.octree.waitingToDraw = false;
	viewerParams.octree.waitingToReduce = false;
	viewerParams.octree.waitingToRemove = false;
}