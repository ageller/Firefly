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

}

function reduceOctreeParticles(node, N = null, recreateGeo = false){
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
}

function drawOctreeNode(node, updateGeo=false){

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
}