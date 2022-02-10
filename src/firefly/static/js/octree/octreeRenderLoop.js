function containsPoint(t){
	t = new THREE.Vector3(t).project(viewerParams.camera)
	const e=viewerParams.frustum.planes;
	for(let n=0;n<6;n++) if (e[n].distanceToPoint(t)<0) return false; return true;
}

function abg_updateOctree(pkey){
	//console.log(containsPoint((0,0,0)),containsPoint((-1,-1,-1)));
	octree = viewerParams.parts[pkey].octree;
	openCloseNodes(octree['']);
	evaluateFunctionOnOctreeNodes(
		function (node){
			if (node.children.length) set_transparent(node);
			else set_visible(node);},
		octree[''],
		octree)
}

function openCloseNodes(node){

	// find the node size in pixels and then compare to the 
	//  size of the window
	var node_size_pix = getScreenSize(node);
	var onscreen = checkOnScreen(node);
	var inside = checkInside(node);
	var too_small = checkTooSmall(node_size_pix);
	var too_big = checkTooBig(node_size_pix);

	/* ---- first, handle this node ---- */
	if (!onscreen && !inside || too_small){
		if (!node.is_closed) closeNode(node);
	}
	// node is too large, and at least partially on screen? want to replace with the buffer particles and the children
	else if (inside || too_big){  
		// if we haven't already opened this node let's open it 
		if (!node.is_open) openNode(node);
	}  



	/* ---- alright, now we have to decide what to do with the children ---- */

	node.children.forEach(
		function (child_name){openCloseNodes(node.octree[child_name])});

	/* ---- finish up with this node's direct children ---- */
	// show the children's CoM particles
	/*node.children.forEach(function (dc_child_name){
		dc_child_node = octree[dc_child_name]
		alphas[dc_child_node.node_index] = dc_alpha;
		// TODO should read this from radius scale array
		radiusScale[dc_child_node.node_index] = dc_radius; 
	});
	*/
}

function checkOnScreen(node){
	var min_project = node.bounding_box.min.clone().project(viewerParams.camera);
	var max_project = node.bounding_box.max.clone().project(viewerParams.camera);
	var cen_project = new THREE.Vector3(node.center[0],node.center[1],node.center[2])
	cen_project = cen_project.project(viewerParams.camera);
	var min_onscreen = true;
	var max_onscreen = true;
	var cen_onscreen = true;

	// thresh = 1 corresponds to point being *just* off-scren. 
	var thresh = 1.2; // a little more aggressive, culls stuff at the edge of the screen


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
	['x','y','z'].forEach(function (axis){
		inside = inside && (
			node.bounding_box.min[axis] <
			viewerParams.camera.position[axis]) && 
			(viewerParams.camera.position[axis] <
			node.bounding_box.max[axis]);
	})
	return inside;
}

function checkTooSmall(node_size_pix){
	return (node_size_pix < viewerParams.renderWidth/16 || // too thin
		node_size_pix < viewerParams.renderHeight/16);// too short

}

function checkTooBig(node_size_pix){
	return (node_size_pix > viewerParams.renderWidth/16 ||// too wide
		node_size_pix > viewerParams.renderHeight/16); // too tall
}

function openNode(node){
	// to avoid nodes opening/closing
	//  rapidly as the user moves the camera
	//  we'll require that the conditions for
	//  opening/closing be true for at least 30 frames
	node.delay_open++;
	if (node.delay_open < -1){
		return;}
	node.delay_open = 0;
	node.delay_close = 0;
	node.is_closed = false;
	node.is_open = true;
	replace_com_with_buffer(node)

}

function replace_com_with_buffer(node){

	set_transparent(node)

	// open the particle buffer from disk
	if (node.buffer_size){
		loadFFTREEKaitai(
			node,
			function (kaitai_format,node){
				compileFFTREEData(kaitai_format,node);
				/* TODO  have it create a particle mesh */
				//createPartsMesh()
		});
	}
}


function closeNode(node,force=false){
	// to avoid nodes opening/closing
	//  rapidly as the user moves the camera
	//  we'll require that the conditions for
	//  opening/closing be true for at least 30 frames
	node.delay_close++;
	if (node.delay_close < -1 && !force){
		return;}
	node.delay_open = 0;
	node.delay_close = 0;
	node.is_closed = true;
	node.is_open = false;
	free_buffer_and_show_com(node)

}


function free_buffer_and_show_com(node){

	set_visible(node)

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

	
function updateOctree(){

	//FPS and memoryUsage updated in main render loop of update_framerate
	//if (viewerParams.FPS < viewerParams.octree.targetFPS) console.log('!!! WARNING, low fps', viewerParams.FPS)
	d3.selectAll('.octreeLoadingText').classed('octreeLoadingPaused', false);
	d3.selectAll('.octreeLoadingFill').classed('octreeLoadingPaused', false);
	//allow a few draw passes because it seems that the browser doesn't always reset right away
	if (viewerParams.octree.drawPass < 20) viewerParams.memoryUsage = 0;
	if (viewerParams.memoryUsage > viewerParams.octree.memoryLimit) {
		//console.log('!!! WARNING, exceeded memory limit (Gb)', viewerParams.memoryUsage/1e9);
		viewerParams.octree.NParticleMemoryModifier = THREE.Math.clamp(viewerParams.octree.NParticleMemoryModifierFac*viewerParams.octree.memoryLimit/viewerParams.memoryUsage, 0., 1.);
		d3.selectAll('.octreeLoadingText').classed('octreeLoadingPaused', true);
		d3.selectAll('.octreeLoadingFill').classed('octreeLoadingPaused', true);
		updateOctreeDecimationSpan();
	}
	//I need some way to bring the particle number back up without entering into a loop!
	// if (viewerParams.memoryUsage < 1.8*viewerParams.octree.memoryLimit) {
	// 	viewerParams.octree.NParticleMemoryModifier = THREE.Math.clamp(viewerParams.octree.NParticleMemoryModifier*1.1, 0., 1.);
	// }

	//tweak the number of particles based on the fps
	//not sure what limits I should set here
	//viewerParams.octree.NParticleFPSModifier = Math.round(Math.max(0.01, Math.min(1., viewerParams.FPS/viewerParams.octree.targetFPS))*10.)/10.;

	//check if we can draw a new node
	if (!viewerParams.octree.waitingToDraw && viewerParams.octree.toDraw.length > 0 && viewerParams.octree.toDrawIDs[0] != viewerParams.octree.lastDrawnID) {
		drawNextOctreeNode();
	}

	//check if we can reduce the particles of a node
	if (!viewerParams.octree.waitingToReduce && viewerParams.octree.toReduce.length > 0){
		reduceNextOctreeNode();
	}

	//check if we can remove  a node
	if (!viewerParams.octree.waitingToRemove && viewerParams.octree.toRemove.length > 0){
		removeNextOctreeNode();
	}


	//check and remove duplicates from scene (I don't know why this happens)
	//also perform a few other updates
	if (viewerParams.octree.drawPass % 50 == 0) {
		removeDuplicatesFromScene();
		updateOctreeLoadingBar(); //in case this doesn't get updated properly during the draw loop (can be 1 or 2 off after last draw in completed)
	}


	//check if the object is in view (if not, we won't draw and can remove; though note that this will not pick up new nodes that shouldn't be drawn)
	//https://github.com/mrdoob/three.js/issues/15339
	viewerParams.camera.updateMatrix();
	viewerParams.camera.updateMatrixWorld();
	viewerParams.frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(viewerParams.camera.projectionMatrix, viewerParams.camera.matrixWorldInverse));  


	//rather than a for loop to go through the particles, I am going to manually iterate so that I can draw from one each draw pass
	//this way the scene gets filled in more regularly, instead of filling in one particle group at a time
	var p = viewerParams.partsKeys[viewerParams.octree.pIndex];

	//save the draw list for this render pass so that I can place it at the correct priority in the main list
	var toDraw = [];
	var toDrawIDs = [];
	viewerParams.octree.NUpdate = 0;

	var toReduce = [];
	var toReduceIDs = [];

	if (!viewerParams.octree.waitingToAddToRemove){
		viewerParams.octree.toRemoveTmp = [];
		viewerParams.octree.toRemoveTmpIDs = [];
	}

	//first get all the sizes and distances and sort
	var toSort = []
	var indices = []
	if (viewerParams.octree.nodes.hasOwnProperty(p)){
		viewerParams.octree.loadingCount[p] = [0,0]; //reset here and will will be updated in setNodeDrawParams
		viewerParams.octree.nodes[p].forEach(function(node,i){
			setNodeDrawParams(node);

			var NRenderDiff = viewerParams.octree.drawPass - node.drawPass;
			var NPartsDiff = Math.max(node.NparticlesToRender - node.particles.Coordinates.length, 1.);
			toSort.push(node.cameraDistance/(NRenderDiff*NRenderDiff)/NPartsDiff);
			indices.push(i);
		});
		//sort from big to small
		//indices.sort(function (a, b) { return toSort[a] > toSort[b] ? -1 : toSort[a] < toSort[b] ? 1 : 0; });
		//sort from small to big
		indices.sort(function (a, b) { return toSort[a] < toSort[b] ? -1 : toSort[a] > toSort[b] ? 1 : 0; });

		indices.forEach(function(index, ii){
			var drawFrac = THREE.Math.clamp(viewerParams.octree.loadingCount[p][1]/viewerParams.octree.loadingCount[p][0], 0, 1);	
			var node = viewerParams.octree.nodes[p][index];
			var obj = viewerParams.scene.getObjectByName(p+node.id);

			if (viewerParams.octree.drawPass > viewerParams.partsKeys.length){

				//remove any nodes that are out of the screen from the toDraw and toReduce lists
				if (node.screenSize < viewerParams.octree.minNodeScreenSize || !node.inView){
					var index = viewerParams.octree.toDrawIDs.indexOf(p+node.id);
					if (index >= 0){
						viewerParams.octree.toDrawIDs.splice(index,1);
						viewerParams.octree.toDraw.splice(index,1);
					}

					var index = viewerParams.octree.toReduceIDs.indexOf(p+node.id);
					if (index >= 0){
						viewerParams.octree.toReduceIDs.splice(index,1);
						viewerParams.octree.toReduce.splice(index,1);
					}
				}				

				//adjust particles that are already drawn (I want this to work every time and on all nodes)
				if (obj){

					//identify existing nodes for removal
					if (node.screenSize < viewerParams.octree.minNodeScreenSize || !node.inView){
						if (viewerParams.octree.toRemoveTmp.length < viewerParams.octree.maxToRemove && node.particles.Coordinates.length > Math.floor(node.Nparticles*viewerParams.octree.minFracParticlesToDraw[p]) && !viewerParams.octree.toRemoveIDs.includes(p+node.id) && !viewerParams.octree.waitingToAddToRemove){
							//console.log('removing node', p, node.id, node.Nparticles, node.NparticlesToRender, node.particles.Coordinates.length, node.screenSize, node.inView)
							viewerParams.octree.toRemoveTmp.push([p, node.id]); //will be removed later
							viewerParams.octree.toRemoveTmpIDs.push(p+node.id);
						}
					}


					//identify existing nodes to modify 
					if (node.screenSize >= viewerParams.octree.minNodeScreenSize && node.inView){

						//remove from the toRemove list(s)
						if (viewerParams.octree.toRemoveIDs.includes(p+node.id)){
							var index = viewerParams.octree.toRemoveIDs.indexOf(p+node.id);
							viewerParams.octree.toRemoveIDs.splice(index,1);
							viewerParams.octree.toRemove.splice(index,1);
						}
						if (viewerParams.octree.toRemoveTmpIDs.includes(p+node.id)){
							var index = viewerParams.octree.toRemoveTmpIDs.indexOf(p+node.id);
							viewerParams.octree.toRemoveTmpIDs.splice(index,1);
							viewerParams.octree.toRemoveTmp.splice(index,1);
						}

						//possibly remove from the toReduce list
						if (viewerParams.octree.toReduceIDs.includes(p+node.id) && node.particles.NparticlesToRender >= (node.particles.Coordinates.length - viewerParams.octree.minDiffForUpdate)){
							var index = viewerParams.octree.toReduceIDs.indexOf(p+node.id);
							viewerParams.octree.toReduceIDs.splice(index,1);
							viewerParams.octree.toReduce.splice(index,1);							
						}

						//reduce in number
						//should I remove the particles from memory? (or maybe I should leave them to allow for smoother interaction with GUI?)
						if (!viewerParams.octree.toReduceIDs.includes(p+node.id) && !viewerParams.octree.toRemoveIDs.includes(p+node.id) && !viewerParams.octree.toRemoveTmpIDs.includes(p+node.id) && toReduceIDs.length < viewerParams.octree.maxToReduce && (node.particles.Coordinates.length - node.NparticlesToRender) > viewerParams.octree.minDiffForUpdate) {
							//console.log('reducing node', p, node.id, node.Nparticles, node.NparticlesToRender, node.particles.Coordinates.length, node.particles.Coordinates.length - node.NparticlesToRender)
							toReduce.push([p, node.id]); //will be reduced later
							toReduceIDs.push(p+node.id);
						} 

						//adjust the draw range based on GUI sliders
						var nparts = THREE.Math.clamp(node.NparticlesToRender*viewerParams.plotNmax[p]/100.*(1./viewerParams.decimate), 0, node.particles.Coordinates.length);
						obj.geometry.setDrawRange( 0, nparts); //is this giving me an error sometimes?

						//reset the point size
						obj.material.uniforms.octreePointScale.value = node.particleSizeScale;
						obj.material.needsUpdate = true;


					} 
				}
			}

			//add to the draw list, only when there are available slots in toDraw and when memory usage is low enough
			if (toDrawIDs.length < viewerParams.octree.maxFilesToRead && !viewerParams.octree.toRemoveIDs.includes(p+node.id) && !viewerParams.octree.toRemoveTmpIDs.includes(p+node.id) && !viewerParams.octree.toReduceIDs.includes(p+node.id) && !toReduceIDs.includes(p+node.id) && viewerParams.showParts[p] && viewerParams.memoryUsage < viewerParams.octree.memoryLimit && node.inView && node.NparticlesToRender > 0) {

				//new nodes
				if (!obj && node.screenSize >= viewerParams.octree.minNodeScreenSize){
					//console.log('drawing node', p, node.id, node.NparticlesToRender, node.Nparticles, node.particles.Coordinates.length, node.screenSize, node.inView)
					toDraw.push([p, node.id, false]);
					toDrawIDs.push(p+node.id);

				}
				
				//existing node that needs more particles
				if (obj && toDrawIDs.length < viewerParams.octree.maxFilesToRead && (node.NparticlesToRender - node.particles.Coordinates.length) > viewerParams.octree.minDiffForUpdate && viewerParams.octree.NUpdate < viewerParams.octree.maxUpdatesPerDraw&& !toDrawIDs.includes(p+node.id)){
					//console.log('updating node', p, node.id, node.Nparticles, node.NparticlesToRender, node.particles.Coordinates.length, node.screenSize, node.inView, node.drawPass, viewerParams.octree.drawPass)
					toDraw.push([p, node.id, true]); //will be updated later
					toDrawIDs.push(p+node.id);
					viewerParams.octree.NUpdate += 1

				} 

			}


		})

	}


	//if we are done drawing, check if we should adjust the number of particles further see if I need to reduce the particles even further
	if (viewerParams.octree.toRemove.length == 0 && viewerParams.octree.toReduce.length == 0){
		if (viewerParams.memoryUsage > viewerParams.octree.memoryLimit) viewerParams.octree.NParticleMemoryModifierFac = THREE.Math.clamp(viewerParams.octree.NParticleMemoryModifierFac/2., 0, 1.);
		if (viewerParams.memoryUsage < viewerParams.octree.memoryLimit && viewerParams.octree.toDraw.length == 0) {
			viewerParams.octree.NParticleMemoryModifierFac = THREE.Math.clamp(viewerParams.octree.NParticleMemoryModifierFac*2., 0, 1.);
			viewerParams.octree.NParticleMemoryModifier = THREE.Math.clamp(viewerParams.octree.NParticleMemoryModifierFac*viewerParams.octree.memoryLimit/viewerParams.memoryUsage, 0., 1.);
			d3.select('#decimationOctreeSpan').text((1./viewerParams.octree.NParticleMemoryModifier).toFixed(1))

		}
	}

	//increment the draw pass
	viewerParams.octree.drawPass += 1;

	//prioritization
	prioritizeOctreeDrawList(toDraw, toDrawIDs);
	prioritizeOctreeReduceList(toReduce, toReduceIDs);
	prioritizeOctreeRemoveList();

	//move to the next particle type
	updateOctreePindex();
	
}

function drawNextOctreeNode(){
	//take the next in line to draw
	viewerParams.octree.lastDrawnID = viewerParams.octree.toDrawIDs[0]; //trying to stop multiple draws!

	viewerParams.octree.waitingToDraw = true;
	var arr = viewerParams.octree.toDraw[0];
	var p = arr[0];
	var iden = arr[1];
	var updateGeo = arr[2];
	var node = null;
	if (p){
		viewerParams.octree.nodes[p].forEach(function(n){
			if (n.id == iden) node = n;
		})
	}
	//console.log('drawing ',p, iden)

	viewerParams.octree.toDraw.shift();
	viewerParams.octree.toDrawIDs.shift();

	if (node) drawOctreeNode(node, updateGeo);	
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

function removeNextOctreeNode(){
	//work from the back of the array (since prioritized by the most important to view)
	viewerParams.octree.waitingToRemove = true;
	var i = viewerParams.octree.toRemove.length - 1;
	var arr = viewerParams.octree.toRemove[i];
	var p = arr[0];
	var iden = arr[1];
	var obj = viewerParams.scene.getObjectByName(p+iden);
	var node = null;
	viewerParams.octree.nodes[p].forEach(function(n){
		if (n.id == iden) node = n;
	})
	//console.log('removing', p, iden);

	if (node && obj){
		//swap geometry for the minimum number of particles to show
		node.NparticlesToRender = Math.floor(node.Nparticles*viewerParams.octree.minFracParticlesToDraw[p]);
		reduceOctreeParticles(node, node.NparticlesToRender, true, resetWaitingToRemove);
	}

	viewerParams.octree.toRemove.pop();
	viewerParams.octree.toRemoveIDs.pop();
	viewerParams.octree.waitingToAddToRemove = false;
}

function prioritizeOctreeDrawList(toDraw, toDrawIDs){
	//add to the main toDraw list, I will add at the start
	//first remove any that were in the main toDraw list so that I can then prioritize them higher
	toDrawIDs.forEach(function(iden){
		var index = viewerParams.octree.toDrawIDs.indexOf(iden);
		if (index >= 0){
			viewerParams.octree.toDrawIDs.splice(index,1);
			viewerParams.octree.toDraw.splice(index,1);
		}
	})
	viewerParams.octree.toDraw = toDraw.concat(viewerParams.octree.toDraw);
	viewerParams.octree.toDrawIDs = toDrawIDs.concat(viewerParams.octree.toDrawIDs);

	//if any particle types are not shown, remove from the main toDraw list
	var indices = [];
	viewerParams.partsKeys.forEach(function(p){
		if (!viewerParams.showParts[p]){
			viewerParams.octree.toDrawIDs.forEach(function(iden,i){
				if (iden.includes(p)) indices.push(i)
			})
		}
	})
	indices.forEach(function(i){
		viewerParams.octree.toDrawIDs.splice(i,1);
		viewerParams.octree.toDraw.splice(i,1);
	})
}
function prioritizeOctreeReduceList(toReduce, toReduceIDs){
	//add to the main toReduce list, I will add at the start
	//first remove any that were in the main toReduce list so that I can then prioritize them higher
	toReduceIDs.forEach(function(iden){
		var index = viewerParams.octree.toReduceIDs.indexOf(iden);
		if (index >= 0){
			viewerParams.octree.toReduceIDs.splice(index,1);
			viewerParams.octree.toReduce.splice(index,1);
		}
	})
	viewerParams.octree.toReduce = toReduce.concat(viewerParams.octree.toReduce);
	viewerParams.octree.toReduceIDs = toReduceIDs.concat(viewerParams.octree.toReduceIDs);
}

function prioritizeOctreeRemoveList(){
	//add to the main toRemove list, I will add at the start
	//but wait a few seconds in case nodes come back into view
	viewerParams.octree.waitingToAddToRemove = true;
	window.setTimeout(function(){
		viewerParams.octree.toRemoveTmpIDs.forEach(function(iden){
			var index = viewerParams.octree.toRemoveIDs.indexOf(iden);
			if (index >= 0){
				viewerParams.octree.toRemoveIDs.splice(index,1);
				viewerParams.octree.toRemove.splice(index,1);
			}
		})
		viewerParams.octree.toRemove = viewerParams.octree.toRemoveTmp.concat(viewerParams.octree.toRemove);
		viewerParams.octree.toRemoveIDs = viewerParams.octree.toRemoveTmpIDs.concat(viewerParams.octree.toRemoveIDs);

		viewerParams.octree.waitingToAddToRemove = false;
		
	}, viewerParams.octree.removeTimeout*1000.);
}


function updateOctreePindex(){
	viewerParams.octree.pIndex = (viewerParams.octree.pIndex + 1) % viewerParams.partsKeys.length;
}

function resetWaitingToRemove(){
	viewerParams.octree.waitingToRemove = false;
}

function resetWaitingToReduce(){
	viewerParams.octree.waitingToReduce = false;
}


function removeDuplicatesFromScene(){
	//For some reason duplicate nodes get drawn to the scene.  This will remove them

	//Somehow there is a mismatch between objects that are in the scene and those that are in viewerParams.partsMesh.  
	//I have no idea why that should be(!), but it is making this removal very difficult to get right. 

	//first I am going to gather all duplicates from either scene or partsMesh
	var keepPartsNames = [];
	var keepSceneNames = [];
	var removeNames = [];
	var removeIDs = [];
	viewerParams.partsKeys.forEach(function(p){
		viewerParams.partsMesh[p].forEach(function(obj, i){
			if (keepPartsNames.includes(obj.name)) {
				removeNames.push(obj.name);
				removeIDs.push(obj.id);
			} else {
				keepPartsNames.push(obj.name);
			}
		});
	})
	viewerParams.scene.traverse(function(obj){
		if (obj.isMesh || obj.isLine || obj.isPoints) {
			if (keepSceneNames.includes(obj.name) && !removeNames.includes(obj.name)) {
				removeNames.push(obj.name);
				removeIDs.push(obj.id);
			} else {
				keepSceneNames.push(obj.name);
			}
		}
	})

	//now I will remove them, but be sure that I am matching between the scene and partsMesh
	if (removeNames.length > 0){
		console.log('have duplicates in scene', removeNames.length, removeNames, removeIDs);
		removeNames.forEach(function(name, i){
			var countScene = 0;
			var countParts = 0;
			var removedFromScene = [];
			var keptInScene = null;
			viewerParams.scene.traverse(function(obj){
				if (obj.name == name){
					if (countScene >= 1) removedFromScene.push(obj.id);
					if (countScene == 0) keptInScene = obj.id
					countScene += 1;
				}
			})
			removedFromScene.forEach(function(iden){
				obj = viewerParams.scene.getObjectById(iden);
				if (obj) {
					//console.log('removing object from scene', obj.name, obj)
					obj.geometry.dispose();
					obj.material.dispose();
					viewerParams.scene.remove(obj);
				} else {
					console.log('=======WARNING : DID NOT FIND NODE', iden)
				}
			})
			viewerParams.partsKeys.forEach(function(p){
				var removeIndices = [];
				viewerParams.partsMesh[p].forEach(function(obj, j){
					if (obj.name == name){
						if ((keptInScene != null && obj.id != keptInScene) || (keptInScene == null && countParts >= 1)) removeIndices.push(j)
						countParts += 1;
					}
				})
				removeIndices.forEach(function(j){
					obj = viewerParams.partsMesh[p][j];
					//console.log('removing object from parts', obj.name, obj)
					if (obj){
						obj.geometry.dispose();
						obj.material.dispose();
						viewerParams.scene.remove(obj);	
						viewerParams.partsMesh[p].splice(j,1);
					}
				})
			})
		})
	}
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
	
	//if (width == 0) console.log('bad width', node.particleType, node.id, xwidth, ywidth, zwidth);

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
	var minNDraw = Math.floor(node.Nparticles*viewerParams.octree.minFracParticlesToDraw[p])
	NparticlesToRender = Math.min(node.Nparticles, Math.floor(node.Nparticles*viewerParams.octree.normCameraDistance[p]/node.cameraDistance*viewerParams.octree.NParticleFPSModifier));

	//modify number of distant particles based on FPS
	//any modifications based on FPS causes looping where it reduces the particle number, FPS grows, then it redraws, then FPS goes down, and repeat
	//if (node.cameraDistance > viewerParams.octree.normCameraDistance[p] && viewerParams.FPS < viewerParams.octree.targetFPS) NparticlesToRender *= viewerParams.FPS/viewerParams.octree.targetFPS;

	//modify number of particles based on memory usase
	NparticlesToRender *= viewerParams.octree.NParticleMemoryModifier

	//always keep the minimum number of particles, and also don't exceed the total number of particles in the node
	NparticlesToRender = THREE.Math.clamp(NparticlesToRender, minNDraw, node.Nparticles);

	//test to see if this helps
	//if (node.cameraDistance > viewerParams.octree.normCameraDistance[p]) NparticlesToRender = minNDraw;
	//if (node.cameraDistance > viewerParams.octree.normCameraDistance[p]) node.inView = false;


	node.NparticlesToRender = NparticlesToRender;

	//these will need to be updated so remove the drawn flag
	//if I do this, then the progress bar will also be affected... (I don't think I want that)
	//if (node.inView && (node.NparticlesToRender - node.particles.Coordinates.length) > viewerParams.octree.minDiffForUpdate) node.drawn = false;

	//if (node.particles.Coordinates.length >= node.NparticlesToRender && node.inView) node.drawn = true;


	//scale particles size by the fraction rendered? (not sure what to use for max value)
	//var maxS = node.width;
	if (viewerParams.showVel[p]){
		node.particleSizeScale = 10.; //this should allow the sizes to be about equal between velocity and point
	} else {
		// var maxS = viewerParams.octree.boxSize/100.;
		// node.particleSizeScale = THREE.Math.clamp(node.width*(1. - node.NparticlesToRender/node.Nparticles), 1., maxS);
		node.particleSizeScale = 1.;
	}

	// //update the opacity based on camera distance? 
	// node.color = viewerParams.Pcolors[p].slice();
	// //if (node.NparticlesToRender > 0) node.color[3] = viewerParams.Pcolors[p][3]*Math.min(1., node.Nparticles/node.NparticlesToRender);
	// if (node.NparticlesToRender > 0) node.color[3] = viewerParams.Pcolors[p][3]*THREE.Math.clamp(viewerParams.octree.normCameraDistance[p]/node.cameraDistance, 0.1, 1);

	//for the loading bar
	if (node.inView && node.screenSize > viewerParams.octree.minNodeScreenSize && node.NparticlesToRender > 0) {
		viewerParams.octree.loadingCount[p][0] += 1;
		if (node.drawn) viewerParams.octree.loadingCount[p][1] += 1;
	}


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