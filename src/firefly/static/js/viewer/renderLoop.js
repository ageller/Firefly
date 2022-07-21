function animate(time) {
	viewerParams.animating = true;

	// check if app should be put to sleep
	if (!viewerParams.pauseAnimation){
		var currentTime = new Date();
		var seconds = currentTime.getTime()/1000;

		// check UI and update viewerParams or partsMesh
		update(time);

		// render partsMesh to target
		render();

		// calculate framerate and optionally display it. 
		// put the app to sleep if FPS < .66 by setting
		// viewerParams.pauseAnimation = true
		update_framerate(seconds,time);

		// get the memory usage
		update_memory_usage();

		if (viewerParams.initialize_time){
			//console.log(seconds-viewerParams.initialize_time + ' seconds to initialize');
			//console.log(viewerParams.memoryUsage/1e9 + ' GB allocated');
			var numtot = 0;
			viewerParams.partsKeys.forEach(function (pkey){
				numtot = numtot + viewerParams.parts.count[pkey];
				});

			viewerParams.mem_profile = [numtot,(seconds-viewerParams.initialize_time),viewerParams.memoryUsage/1e9]

			// initialize the FPS_profile array
			viewerParams.FPS_profile = [];
			viewerParams.initialize_time = null;
		}

		// velocity animation
		//console.log('before', viewerParams.animateVelTime, viewerParams.animateVelDt, viewerParams.animateVelTmax)
		viewerParams.animateVelTime = (viewerParams.animateVelTime + viewerParams.animateVelDt) % viewerParams.animateVelTmax;	
		//console.log('after',viewerParams.animateVelTime, viewerParams.animateVelDt, viewerParams.animateVelTmax)
		if (isNaN(viewerParams.animateVelTime)) viewerParams.animateVelTime = 0;

		viewerParams.drawPass += 1;

		FPS_profile_step = 50;
		if (!(viewerParams.drawPass % FPS_profile_step) && viewerParams.drawPass < 10*FPS_profile_step){
			viewerParams.FPS_profile.push(viewerParams.FPS)
		}
		else if (viewerParams.drawPass == (10*FPS_profile_step+1)){
			var numtot = 0;
			viewerParams.partsKeys.forEach(function (pkey){
				numtot = numtot + viewerParams.parts.count[pkey];
				});
			profiled_FPS = viewerParams.FPS_profile.reduce((a, b) => a + b, 0)/viewerParams.FPS_profile.length;

			console.log(
				'(PROFILE): ',
				viewerParams.mem_profile[0],
				viewerParams.mem_profile[1],
				viewerParams.mem_profile[2],
				viewerParams.PsizeMult[viewerParams.partsKeys[0]],
				profiled_FPS)

			viewerParams.profiled = true;
		}
		//console.log(viewerParams.camera.position)

	}

	// recursively loop this function
	if (viewerParams.allowVRControls){
		viewerParams.renderer.setAnimationLoop( animate );
	} else {
		requestAnimationFrame( animate );
	}
}

function update(time){

	// get new camera position if we're in a tween loop
	if (viewerParams.updateTween){
		TWEEN.update(time);
	}

	// handle keypresses on the keyboard
	update_keypress(time);

	// apply any user interaction to the camera (enabling the controls)
	// also re-points the camera at the center if you're in a tween loop
	viewerParams.controls.update();
	
	// update particle mesh buffers with settings from UI
	update_particle_groups(time);	

	// A couple of klugy fixes to allow for certain initial presets
	// Firefly seems to behave well when initialized in trackball controls and without stereo.   
	//    Otherwise, there are bugs of unknown origin.
	if (viewerParams.drawPass > 1){
		// update initial stereo option
		// trying this here to see if I can fix a bug (of unknown origin) for starting firefly in stereo
		if (viewerParams.initialStereo){
			viewerParams.initialStereo = false;
			viewerParams.useStereo = true;
			checkStereoLock(true);
		}

		// update initial controls option
		// trying this here to see if I can fix a bug (of unknown origin) for starting firefly with different controls than Trackball
		if (viewerParams.initialFlyControls){
			viewerParams.initialFlyControls = false;
			viewerParams.useTrackball = false;
			viewerParams.controls.dispose();
			viewerParams.switchControls = true;
			initControls(false);
		}

	}
}

function update_keypress(time){

	// check for keypresses
	viewerParams.keyboard.update();

	// show help screen
	if (viewerParams.keyboard.down("H")){
		viewerParams.helpMessage=!viewerParams.helpMessage;
		showSplash(viewerParams.helpMessage);
	}

	// toggle camera controls
	if (viewerParams.keyboard.down("space")){
		viewerParams.useTrackball = !viewerParams.useTrackball;
		viewerParams.switchControls = true;
		viewerParams.controls.dispose();
		initControls();
	}

	// increase and decrease speed for fly controls
	if (viewerParams.keyboard.pressed("+")){
		viewerParams.flyffac += 1;
		sendToGUI([{'updateFlyMovementSpeed':viewerParams.flyffac}]);
		if (viewerParams.controlsName == 'FlyControls') viewerParams.controls.movementSpeed = (1. - viewerParams.friction)*viewerParams.flyffac;
		console.log('fly speed', viewerParams.flyffac)
	}
	if (viewerParams.keyboard.pressed("-")){
		viewerParams.flyffac = Math.max(1., viewerParams.flyffac - 1);
		sendToGUI([{'updateFlyMovementSpeed':viewerParams.flyffac}]);
		if (viewerParams.controlsName == 'FlyControls') viewerParams.controls.movementSpeed = (1. - viewerParams.friction)*viewerParams.flyffac;
		console.log('fly speed', viewerParams.flyffac)
	}

}

function update_particle_groups(time){

	viewerParams.partsKeys.forEach(function(p,i){
		// move filter handle sliders if playback is enabled
		// TODO playback should be moved to full UI tweening in the future
		update_particle_playback(p,time);
		
		//check on all the UI inputs for each particle type
		viewerParams.partsMesh[p].forEach( 
			function( m, j ) {
				update_particle_mesh(p, m,
				viewerParams.updateFilter[p],
				viewerParams.updateColormapVariable[p],
				viewerParams.updateRadiusVariable[p],
				viewerParams.updateOnOff[p]
			)});

		// update flags for looping through particles for this particle type.
		// the update_particle_mesh call above will have done the work
		// iff parts are shown
		if (viewerParams.showParts[p]) {
			viewerParams.updateFilter[p] = false;
			// we'd have only updated the colormap variable if we're actually showing it
			if (viewerParams.showColormap[p]) viewerParams.updateColormapVariable[p] = false;
			viewerParams.updateRadiusVariable[p] = false;
		}

		// whether we are showing parts or not, we would've
		//  updated the onoff state
		viewerParams.updateOnOff[p] = false;

		// hide all octree com nodes at the start
		if ( viewerParams.parts[p].hasOwnProperty('octree') &&
			(!viewerParams.parts[p].hasOwnProperty('octree_init') || !viewerParams.parts[p].octree_init)){
			evaluateFunctionOnOctreeNodes(
				hideCoM,
				viewerParams.parts[p].octree[''],
				viewerParams.parts[p].octree);
			viewerParams.parts[p].octree_init = true;
		}

	});// viewerParams.partsKeys.forEach(function(p,i)

	// determine what nodes need to be opened/closed
	updateOctree(); // loops through particle keys internally

}// function update(time)

function update_particle_playback(p,time){
	//change filter limits if playback is enabled
	if (viewerParams.parts[p]['playbackEnabled']){
		viewerParams.parts[p]['playbackTicks']++;
		// TODO would be nice to be able to edit the tick rate
		if (!(viewerParams.parts[p]['playbackTicks']%viewerParams.parts[p]['playbackTickRate'])){
			viewerParams.updateFilter[p]=true;
			// which parts do we want? 
			this_parts = viewerParams.parts[p];
			fkey = this_parts['playbackFilter']

			// here are the edges of the bar
			hard_limits = viewerParams.filterLims[p][fkey]
			soft_limits = viewerParams.filterVals[p][fkey]

			// how wide is the slider? 
			dfilter = this_parts['dfilter']

			// TODO this could be editable
			filter_step = dfilter/4
			// conditional statement to decide how to move the filter
			if (((soft_limits[0]+filter_step) >= hard_limits[1]) || 
				((soft_limits[1] - hard_limits[1])*(soft_limits[1] - hard_limits[1]) <=1e-6)){
				// moving the slider to the right would put the lower limit over the edge
				// set the soft left edge to the hard left edge, the soft right edge to that plus dfilter
				viewerParams.filterVals[p][fkey][0] = hard_limits[0];
				viewerParams.filterVals[p][fkey][1] = hard_limits[0] + dfilter;
			}
			else if ((soft_limits[1] + filter_step) >= hard_limits[1]){
				// moving the slider to the right would put the upper limit over the edge, but not the lower
				// move the left edge but clip the right edge at the hard limit
				viewerParams.filterVals[p][fkey][0] = hard_limits[1] - dfilter;
				viewerParams.filterVals[p][fkey][1] = hard_limits[1];
			}
			else{
				// moving the slider will fit within hard limits
				// move the slider over by dfilter
				viewerParams.filterVals[p][fkey][0] = soft_limits[0] + filter_step;
				viewerParams.filterVals[p][fkey][1] = soft_limits[1] + filter_step;
			}
			//console.log('playback', dfilter, viewerParams.filterVals[p][fkey]);

			// update the left slider position
			var forGUI = [];
			forGUI.push({'updateSliderHandles':[
				0,//i
				viewerParams.filterVals[p][fkey][0], // value
				p + '_FK_' + fkey + '_END_FilterSlider',// key
				0, // resetEnd
				"double"// type
				]});
			forGUI.push({'updateSliderHandles':[
				1,//i
				viewerParams.filterVals[p][fkey][1], // value
				p + '_FK_' + fkey + '_END_FilterSlider',// key
				0, // resetEnd
				"double"// type
				]});
			sendToGUI(forGUI);
		}
	}// if (viewerParams.parts[p]['playbackEnabled'])

}

 function update_particle_mesh(
	p,m,
	update_filter=false,
	update_colormap_variable=false,
	update_radius_variable=false,
	update_onoff=false){
	// send velocity vector type (line/arrow/cone) to material buffer
	m.material.uniforms.velType.value = viewerParams.velopts[viewerParams.velType[p]];

	// send column density flag to the material buffer
	m.material.uniforms.columnDensity.value = viewerParams.columnDensity;

	if (viewerParams.showParts[p]) {
		// apply static color, colormap settings, 
		// and particle group radius velocity vector scale factors
		update_particle_mesh_UI_values(p,m);

		// handle velocity vectors
		update_particle_mesh_velocity_vectors(p,m);
		
		// apply particle radii and alpha values 
		// according to current filter handle settings
		if (update_filter || update_onoff || update_radius_variable) update_particle_mesh_filter(p,m);

		// only update the colormap variable if we're actually
		//  colormapping. we'll get to it eventually
		if (update_colormap_variable && viewerParams.showColormap[p]){
			update_particle_mesh_colormap_variable(p,m);
		} 


		update_velocity_animation(p,m);

	} 
	// set radii and alpha values to 0 to hide this particle group
	else if (update_onoff) disable_particle_group_mesh(p,m);	
 }


function update_particle_mesh_UI_values(p,m){
	// apply global decimation
	var Nfac = 1/viewerParams.decimate;

	// the 100 factor is to account for plotNmax being a percent
	//  need to convert
	if (viewerParams.haveOctree[p]){
		Nfac *= m.geometry.attributes.radiusScale.array.length/100.;
		// if this is a mesh for the octree coms we want it to always be the full array
		if (m.geometry.userData.octree) Nfac *= 100/viewerParams.plotNmax[p]; 
	}

	m.geometry.setDrawRange( 0, viewerParams.plotNmax[p]*Nfac);

	// apply particle size scale factor to meshes that aren't octree CoM meshes
	if (!m.geometry.userData.octree) m.material.uniforms.uVertexScale.value = viewerParams.PsizeMult[p];
	else m.material.uniforms.uVertexScale.value = 1;

	// apply colormap limits and flag for colormapping at all
	m.material.uniforms.colormapMin.value = viewerParams.colormapVals[p][viewerParams.ckeys[p][viewerParams.colormapVariable[p]]][0];
	m.material.uniforms.colormapMax.value = viewerParams.colormapVals[p][viewerParams.ckeys[p][viewerParams.colormapVariable[p]]][1];
	m.material.uniforms.colormap.value = viewerParams.colormap[p];
	m.material.uniforms.showColormap.value = viewerParams.showColormap[p];


	// update the material only if it doesn't match
	if (m.material.blending != viewerParams.blendingOpts[viewerParams.blendingMode[p]] ||
		m.material.depthWrite !=  viewerParams.depthWrite[p] || 
		m.material.depthTest !=  viewerParams.depthTest[p]){

		m.material.blending = viewerParams.blendingOpts[viewerParams.blendingMode[p]];
		m.material.depthWrite =  viewerParams.depthWrite[p];
		m.material.depthTest =  viewerParams.depthTest[p];
		m.material.uniforms.useDepth.value = +viewerParams.depthTest[p];
		m.material.needsUpdate = true;
	}

	// apply static color
	//if (m.name.includes('Standard')){
	m.material.uniforms.color.value = new THREE.Vector4(
		viewerParams.Pcolors[p][0],
		viewerParams.Pcolors[p][1],
		viewerParams.Pcolors[p][2],
		viewerParams.Pcolors[p][3]);
	//}
}

function update_particle_mesh_velocity_vectors(p,m){

	// find the camera's x and y axes for velocity vectors
	// quaternion is orientation of the camera WRT data space
	var cameraX =  new THREE.Vector3(1,0,0);
	var cameraY =  new THREE.Vector3(0,1,0);
	cameraX.applyQuaternion(viewerParams.camera.quaternion);
	cameraY.applyQuaternion(viewerParams.camera.quaternion);

	if (viewerParams.showVel[p]){
		// enable velocity vectors
		m.material.uniforms.vID.value = 1.;
		// pass camera orientation to the shader so we can project each particle's
		// velocity vector in the vertex shader
		m.material.uniforms.cameraX.value = [cameraX.x,cameraX.y,cameraX.z];
		m.material.uniforms.cameraY.value = [cameraY.x,cameraY.y,cameraY.z];

		//update the vector width
		m.material.uniforms.velVectorWidth.value = viewerParams.velVectorWidth[p];
		//update the gradient 
		m.material.uniforms.velGradient.value = viewerParams.velGradient[p];
	} 
	else{
		// disable velocity vectors
		m.material.uniforms.vID.value = 0.;
	}
}

function update_particle_mesh_filter(p,m){

	// read particle data directly from the mesh
	//   rather than from viewerParams
	var this_parts = m.geometry.userData;

	// if the filter handles in  the UI have been updated for this particle type
	//  then we need to reapply the filter
	var radiusScale = m.geometry.attributes.radiusScale.array;
	var alpha = m.geometry.attributes.alpha.array;

	// reset the buffer values
	if (viewerParams.radiusVariable[p] > 0) update_particle_mesh_radius_variable(p,m);
	else radiusScale.fill(1);

	alpha.fill(1);

	// loop through this particle group's particles
	for( var ii = 0; ii < radiusScale.length; ii ++ ) {
		// do not show octree CoM particles after they've been hidden from view
		//  don't need to check filters
		if ('IsDrawn' in this_parts && !this_parts['IsDrawn'][ii]){
			radiusScale[ii] = 0.;
			alpha[ii] = 0.;
			continue;
		}

		// apply each filter additively, loop over each filter key
		viewerParams.fkeys[p].every(function (fkey){
			// if the field value for this particle exists:
			if (this_parts[fkey]) {
				var val = this_parts[fkey][ii];
				var inside_filter = ( 
					val > viewerParams.filterVals[p][fkey][0] && 
					val < viewerParams.filterVals[p][fkey][1]);
				// we want to hide this particle
				if (viewerParams.invertFilter[p][fkey] ? inside_filter : !inside_filter){
					// set the radius to 0 and the alpha to 0
					radiusScale[ii] = 0.;
					alpha[ii] = 0.;
					return false; // break out of the every loop, we already set to 0
				} 
			}// if (this_parts[fkey]) 
			return true; // keep looping
		}) // fkeys[p].every
	}// for( var ii = 0; ii < radiusScale.length; ii ++ ) 

	m.geometry.attributes.radiusScale.needsUpdate = true;
	m.geometry.attributes.alpha.needsUpdate = true;					
}

function update_particle_mesh_colormap_variable(p,m){
	// unpack the particle group associated with this mesh
	var this_parts = m.geometry.userData;

	// .colormapVariable[p] holds the *index* of the colormap variable
	var ckey = viewerParams.ckeys[p][viewerParams.colormapVariable[p]];
	// replace the colormap field 
	if (this_parts[ckey] != null){
		var colormapField = m.geometry.attributes.colormapField.array;
		// fill the colormapField array with the values from the ckey array
		for( var ii = 0; ii < colormapField.length; ii ++ ) colormapField[ii] = this_parts[ckey][ii];
		// flag that this array was updated
		m.geometry.attributes.colormapField.needsUpdate = true;
	}	
}

function update_particle_mesh_radius_variable(p,m){
	// unpack the particle group associated with this mesh
	var this_parts = m.geometry.userData;

	var radiusScale = m.geometry.attributes.radiusScale.array;
	var minmax = {'min':0,'max':1}
	// .radiusVariable[p] holds the *index* of the radius variable
	if (viewerParams.radiusVariable[p] > 0){
		var rkey = viewerParams.rkeys[p][viewerParams.radiusVariable[p]]
		if (this_parts.hasOwnProperty(rkey)){
			// copy the values from this_parts[rkey] into radii
			radii = this_parts[rkey];
			minmax = calcMinMax(p,rkey);
		}
		else radii = Array(radiusScale.length).fill(1);
	} 
	else radii = Array(radiusScale.length).fill(1);
	// renormalize the radius variable to scale between 0 and 1, when you're right you're right aaron.
	for( var ii = 0; ii < radiusScale.length; ii ++ ) radiusScale[ii] = (radii[ii]-minmax.min)/(minmax.max-minmax.min);
	m.geometry.attributes.radiusScale.needsUpdate = true;
}

function disable_particle_group_mesh(p,m){
	// disable the entire particle group, set color to 0,0,0,0 and radius to 0
	m.material.uniforms.color.value = new THREE.Vector4(0);
	m.material.uniforms.vID.value = -1;
	var radiusScale = m.geometry.attributes.radiusScale.array;
	for( var ii = 0; ii < radiusScale.length; ii ++ ) {
		radiusScale[ii] = 0.;
	}
	m.geometry.attributes.radiusScale.needsUpdate = true;
}

function render() {
	// 2d projection to texture and then remap according to colormap
	if (viewerParams.columnDensity){render_column_density();} 
	// render straight to the canvas
	else { viewerParams.renderer.render( viewerParams.scene, viewerParams.camera ); }

	// copy the canvas to the stream if active	
	if (viewerParams.streamerActive){ render_stream(); }
}

function render_column_density(){
	//first, render to the texture
	viewerParams.renderer.setRenderTarget(viewerParams.textureCD);
	viewerParams.renderer.render( viewerParams.scene, viewerParams.camera);

	//then back to the canvas
	//for now, just use the colormap from the first particle group
	viewerParams.quadCD.material.uniforms.colormap.value = viewerParams.colormap[viewerParams.CDkey];
	viewerParams.quadCD.material.uniforms.CDmin.value = viewerParams.colormapVals[viewerParams.CDkey][viewerParams.ckeys[viewerParams.CDkey][0]][0];
	viewerParams.quadCD.material.uniforms.CDmax.value = viewerParams.colormapVals[viewerParams.CDkey][viewerParams.ckeys[viewerParams.CDkey][0]][1];

	viewerParams.renderer.setRenderTarget(null)
	viewerParams.renderer.render( viewerParams.sceneCD, viewerParams.cameraCD );
}

function render_stream(){
	viewerParams.usingSocket = true;
	//send the image through flask to the stream webpage
	if (viewerParams.streamReady){
		//https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob
		viewerParams.renderer.domElement.toBlob(function(blob) {
			var url = URL.createObjectURL(blob);

			var xhr = new XMLHttpRequest();
			xhr.open('POST', '/stream_input', true);

			var formdata = new FormData();
			formdata.append("image", blob);
			xhr.send(formdata);

			//this is giving errors when not on the same localhost
			//socketParams.socket.emit('streamer_input', blob);
		},'image/jpeg', viewerParams.streamQuality);
		viewerParams.streamReady = false;
	}
}

function update_memory_usage(){
	//get the actual memory usage
	if (window.performance.memory) { //works for Chrome
		viewerParams.memoryUsage = window.performance.memory.totalJSHeapSize;
	} else {
		//check the total number of particles rendered
		if (viewerParams.drawPass % 100 == 0 && viewerParams.drawPass > viewerParams.partsKeys.length){
			viewerParams.totalParticlesInMemory = 0.;
			viewerParams.partsKeys.forEach(function(p){
				if (viewerParams.haveOctree[p]){
					viewerParams.partsMesh[p].forEach( function (m){
						viewerParams.totalParticlesInMemory += m.geometry.userData['Coordinates_flat'].length/3
					});
				}
				else viewerParams.totalParticlesInMemory += viewerParams.parts.count[p];
			});
		}
		//calculated from a previous test using the octree mode
		viewerParams.memoryUsage = 2.03964119e+02*viewerParams.totalParticlesInMemory + 1.64869925e+08; 
	}
}

function update_framerate(seconds,time){
	// if we spent more than 1.5 seconds drawing the last frame, send the app to sleep
	if ( viewerParams.sleepTimeout != null && (seconds-viewerParams.currentTime) > viewerParams.sleepTimeout){
		console.log("Putting the app to sleep, taking too long!",(seconds-viewerParams.currentTime));
		viewerParams.pauseAnimation=true;
		showSleep();
	}

	// use previous frame rendering time to calculate FPS. 
	// use average of previous 100 frames so FPS is a bit more stable.
	viewerParams.fps_list.push(1/(seconds-viewerParams.currentTime));
	viewerParams.fps_list = viewerParams.fps_list.slice(-30);

	//viewerParams.FPS = viewerParams.fps_list.reduce((a, b) => a + b, 0)/viewerParams.fps_list.length;
	// use median FPS rather than mean; when it's going real slow it will skip frames
	//  and put in a weirdly high value (like >100 fps) that biases the mean high
	viewerParams.FPS = viewerParams.fps_list.slice().sort(function(a, b){return a-b})[15]

	if ((viewerParams.drawPass % Math.min(Math.round(viewerParams.FPS),60)) == 0){
		// fill FPS container div with calculated FPS and memory usage
		var forGUI = [];
		forGUI.push({'setGUIParamByKey':[viewerParams.FPS, "FPS"]});
		forGUI.push({'setGUIParamByKey':[viewerParams.memoryUsage, "memoryUsage"]});
		forGUI.push({'updateFPSContainer':[]});
		sendToGUI(forGUI);
	}


	// update the stored current time from the last time we were here
	viewerParams.currentTime=seconds;
}

function update_velocity_animation(p, m){		
	
	if (viewerParams.animateVel[p]){
		m.material.uniforms.velTime.value = viewerParams.animateVelTime;
	} else {
		m.material.uniforms.velTime.value = 0.
	}
	m.material.needsUpdate = true;

}
// ABG: this could be moved to be in the UI I think
function updatePlaybackFilter(p){
	// read the current filter from the UI
	// and set the playbackFilter key
	var fkey = viewerParams.parts[p]['currentlyShownFilter'];
	viewerParams.parts[p]['playbackFilter'] = fkey;

	// determine the width between the filter handles
	// and set it "dfilter"
	var range = viewerParams.filterVals[p][fkey];
	viewerParams.parts[p]['dfilter'] = range[1] - range[0];
}

// ABG: removed from above render_column_density() call
//see if I can change the opacity to negative values?
		//requires uncommenting a line in the fragment_pass2.glsl.js code
		// viewerParams.partsKeys.forEach(function(p,i){
		// 	viewerParams.partsMesh[p].forEach( function( m, j ) {
		// 		var colorArray = m.geometry.attributes.colorArray.array;	
		// 		var alpha = m.geometry.attributes.alpha.array;	
		// 		colorIndex = 0.
		// 		alpha.forEach(function(a,k){
		// 			if (p == "Gas"){
		// 				colorArray[colorIndex] = 0.5;
		// 				colorIndex++;
		// 				colorArray[colorIndex] = 0.;
		// 				colorIndex++;
		// 				colorArray[colorIndex] = 0.;
		// 				colorIndex++;
		// 				colorArray[colorIndex] = 1.;
		// 				colorIndex++;
		// 			}else{
		// 				colorArray[colorIndex] = 0.;
		// 				colorIndex++;
		// 				colorArray[colorIndex] = 0.;
		// 				colorIndex++;
		// 				colorArray[colorIndex] = 1.;
		// 				colorIndex++;
		// 				colorArray[colorIndex] = 1.;
		// 				colorIndex++;
		// 			}
		// 		});
		// 		m.geometry.attributes.alpha.needsUpdate = true;					
		// 		m.geometry.attributes.colorArray.needsUpdate = true;					
		// 	});
		// });

