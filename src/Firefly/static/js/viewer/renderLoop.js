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
	}

	// recursively loop this function
	requestAnimationFrame( animate );
}

function update(time){

	// get new camera position if we're in a tween loop
	if (viewerParams.updateTween){
		TWEEN.update(time);
	}

	// handle keypresses on the keyboard
	update_keypress(time);

	// ABG: what does this do? TODO
	viewerParams.controls.update();
	
	// update particle mesh buffers with settings from UI
	update_particle_groups(time);	
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

	// toggle tween loop
	if (viewerParams.keyboard.down("T")) {
		if (viewerParams.inTween){
			viewerParams.updateTween = false
			viewerParams.inTween = false
		} else {
			console.log("tweening")
			viewerParams.updateTween = true	
			setTweenviewerParams();
		}
	}

	// toggle column density projection
	if (viewerParams.keyboard.down("P")){
		viewerParams.columnDensity = !viewerParams.columnDensity;
	}

}

function update_particle_groups(time){

	// find the camera's x and y axes for velocity vectors
	// quaternion is orientation of the camera WRT data space
	var cameraX =  new THREE.Vector3(1,0,0);
	var cameraY =  new THREE.Vector3(0,1,0);
	cameraX.applyQuaternion(viewerParams.camera.quaternion);
	cameraY.applyQuaternion(viewerParams.camera.quaternion);


	// TODO playback should be moved to full UI tweening in the future
	// handle filter playblack 
	viewerParams.partsKeys.forEach(function(p,i){

		// move filter handle sliders if playback is enabled
		update_particle_playback(p,time);
		
		//check on all the UI inputs for each particle type
		viewerParams.partsMesh[p].forEach( function( m, j ) {
			
			// send velocity vector type (line/arrow/cone) to material buffer
			m.material.uniforms.velType.value = viewerParams.velopts[viewerParams.velType[p]];

			// send column density flag to the material buffer
			m.material.uniforms.columnDensity.value = viewerParams.columnDensity;

			if (viewerParams.showParts[p]) {
				// apply static color, colormap settings, 
				// and particle group radius velocity vector scale factors
				update_particle_mesh_UI_values(p,m,time);
	
				// handle velocity vectors
				update_particle_mesh_velocity_vectors(p,m,cameraX,cameraY,time);
				
				// apply particle radii and alpha values 
				// according to current filter handle settings
				update_particle_mesh_filter(p,m,time);
			} 
			else { 
				// set radii and alpha values to 0 to hide this particle group
				disable_particle_group_mesh(p,m,time);	
			}
		});// viewerParams.partsMesh[p].forEach( function( m, j )
	});// viewerParams.partsKeys.forEach(function(p,i)
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
			console.log('playback', dfilter, viewerParams.filterVals[p][fkey]);

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

function update_particle_mesh_UI_values(p,m,time){
	// apply global decimation
	m.geometry.setDrawRange( 0, viewerParams.plotNmax[p]*(1./viewerParams.decimate) )

	// apply particle size scale factor 
	m.material.uniforms.uVertexScale.value = viewerParams.PsizeMult[p];

	// apply colormap limits and flag for colormapping at all
	m.material.uniforms.colormapMin.value = viewerParams.colormapVals[p][viewerParams.ckeys[p][viewerParams.colormapVariable[p]]][0];
	m.material.uniforms.colormapMax.value = viewerParams.colormapVals[p][viewerParams.ckeys[p][viewerParams.colormapVariable[p]]][1];
	m.material.uniforms.colormap.value = viewerParams.colormap[p];
	m.material.uniforms.showColormap.value = viewerParams.showColormap[p];

	// apply static color
	m.material.uniforms.color.value = new THREE.Vector4(
		viewerParams.Pcolors[p][0],
		viewerParams.Pcolors[p][1],
		viewerParams.Pcolors[p][2],
		viewerParams.Pcolors[p][3]);
}

function update_particle_mesh_velocity_vectors(p,m,cameraX,cameraY,time){

	if (viewerParams.showVel[p]){
		// enable velocity vectors
		m.material.uniforms.oID.value = 1.;
		// pass camera orientation to the shader so we can project each particle's
		// velocity vector in the vertex shader
		m.material.uniforms.cameraX.value = [cameraX.x,cameraX.y,cameraX.z];
		m.material.uniforms.cameraY.value = [cameraY.x,cameraY.y,cameraY.z];
		// scale maximum velocity vector length
		m.material.uniforms.uVertexScale.value *= viewerParams.vSizeMult;
	} 
	else{
		// disable velocity vectors
		m.material.uniforms.oID.value = 0.;
	}
}

function update_particle_mesh_filter(p,m,time){

	//switching back to previous method of filtering,
	//but now setting radii to zero, and also setting to sizes back to 1
	//for all particles (in case turned off below)

	// if the filter has been updated for this particle type,
	// or if the particle type has been switched off,
	// or if the colormap has been changed. Flags are set in the UI
	// ABG: TODO why do we enter this conditional for updateOnOff or updateColormap?
	if (viewerParams.updateFilter[p] || viewerParams.updateOnOff[p] || viewerParams.updateColormap[p]){
		var radiusScale = m.geometry.attributes.radiusScale.array;
		var alpha = m.geometry.attributes.alpha.array;
		var fk;
		// loop through this particle group's particles
		for( var ii = 0; ii < radiusScale.length; ii ++ ) {
			// fill radiusScale array (alias for geometry buffer's radius scale)
			// with default values
			if ('SmoothingLength' in viewerParams.parts[p]){
				radiusScale[ii] = viewerParams.parts[p].SmoothingLength[ii];
			}
			else{radiusScale[ii] = 1.;}

			// set default alpha to 1
			alpha[ii] = 1.;

			// if the UI has told us the filter needs to be updated
			if (viewerParams.updateFilter[p]){
				// apply each filter additively, loop over each filter key
				for (k=0; k<viewerParams.fkeys[p].length; k++){
					fk = viewerParams.fkeys[p][k];

					// if the field value for this particle exists:
					if (viewerParams.parts[p][fk] != null) {
						val = viewerParams.parts[p][fk][ii];
						// we want to hide this particle
						if ( (!viewerParams.invertFilter[p][fk] &&  
							(val < viewerParams.filterVals[p][fk][0] || 
							val > viewerParams.filterVals[p][fk][1])) || 
							( (viewerParams.invertFilter[p][fk] && 
							(val > viewerParams.filterVals[p][fk][0] && 
							val < viewerParams.filterVals[p][fk][1])))   ){

							// set the radius to 0 and the alpha to 0
							radiusScale[ii] = 0.;
							alpha[ii] = 0.;
						} 
					}// if (viewerParams.parts[p][fk] != null) 
				}// for (k=0; k<viewerParams.fkeys[p].length; k++)
			}// if (viewerParams.updateFilter[p])
		}// for( var ii = 0; ii < radiusScale.length; ii ++ ) 

		m.geometry.attributes.radiusScale.needsUpdate = true;
		m.geometry.attributes.alpha.needsUpdate = true;					
		viewerParams.updateFilter[p] = false;
		viewerParams.updateOnOff[p] = false;
		viewerParams.updateColormap[p] = false;
	}// if (viewerParams.updateFilter[p] || viewerParams.updateOnOff[p] || viewerParams.updateColormap[p])
}

function disable_particle_group_mesh(p,m,time){
	// disable the entire particle group, set color to 0,0,0,0 and radius to 0
	m.material.uniforms.color.value = new THREE.Vector4(0);
	m.material.uniforms.oID.value = -1;
	var radiusScale = m.geometry.attributes.radiusScale.array;
	for( var ii = 0; ii < radiusScale.length; ii ++ ) {
		radiusScale[ii] = 0.;
	}
	m.geometry.attributes.radiusScale.needsUpdate = true;
	viewerParams.updateOnOff[p] = false;
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
	var p = viewerParams.partsKeys[0];
	viewerParams.quadCD.material.uniforms.colormap.value = viewerParams.colormap[p];

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

function update_framerate(seconds,time){
	// if we spent more than 1.5 seconds drawing the last frame, send the app to sleep
	if ( (seconds-viewerParams.currentTime) > 1.5){
		console.log("Putting the app to sleep, taking too long!",(seconds-viewerParams.currentTime));
		viewerParams.pauseAnimation=true;
		showSleep();
	}

	// fill FPS container div with calculated FPS
	if (viewerParams.showfps){
		// use previous frame rendering time to calculate FPS. 
		// use average of previous 100 frames so FPS is a bit more stable.
		viewerParams.fps_list.push(1/(seconds-viewerParams.currentTime));
		viewerParams.fps_list = viewerParams.fps_list.slice(-100);

		elm = document.getElementById("fps_container");
		elm.innerHTML=Math.round(
			viewerParams.fps_list.reduce((a, b) => a + b, 0)/viewerParams.fps_list.length);
		elm.style.display='block';
	}

	// update the stored current time from the last time we were here
	viewerParams.currentTime=seconds;
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