
function animate(time) {
	if (!params.pauseAnimation){
		requestAnimationFrame( animate );
		update(time);
		render();
	}

}

function update(time){
	if (params.updateTween){
		TWEEN.update(time);
	}
	params.keyboard.update();
	if (params.keyboard.down("H")){
		params.helpMessage=!params.helpMessage;
		if (params.helpMessage){
			showSplash();
		}
		else{
			hideSplash()
		}
	}
	if (params.keyboard.down("space")){
		params.useTrackball = !params.useTrackball;
		params.switchControls = true;
		params.controls.dispose();
		initControls();
	}
	
	if (params.keyboard.down("C")) {
		console.log(params.camera.position, params.camera.rotation);
	}
	if (params.keyboard.down("T")) {
		if (params.inTween){
			params.updateTween = false
			params.inTween = false
		} else {
			console.log("tweening")
			params.updateTween = true	
			setTweenParams();
		}
	}

	if (params.keyboard.down("P")){
		params.columnDensity = !params.columnDensity;
	}

	//this is affecting the rotation of the camera somehow, I would have thought that I should turn this off for the tweens to work as expected, but it appears that this helps (at least in this example)
	// if (!params.inTween){
		params.controls.update();
	// }

	updateUICenterText();
	updateUICameraText();
	updateUIRotText();

	// camera's -z direction
	var cameraDir = params.camera.getWorldDirection();

	
	// find the camera's x and y axes 
	// quaternion is orientation of the camera WRT data space
	var cameraX =  new THREE.Vector3(1,0,0);
	var cameraY =  new THREE.Vector3(0,1,0);
	cameraX.applyQuaternion(params.camera.quaternion);
	cameraY.applyQuaternion(params.camera.quaternion);

	var currentTime = new Date();
	var seconds = currentTime.getTime()/1000;
	
	//console.log((seconds-params.currentTime))
	// if we spent more than 1.5 seconds drawing the last frame, send the app to sleep
	if ( (seconds-params.currentTime) > 1.5){
		console.log("Putting the app to sleep, taking too long!",(seconds-params.currentTime))
		params.pauseAnimation=true;
		showSleep();
	}

	for (var i=0; i<params.partsKeys.length; i++){
		var p = params.partsKeys[i];
		//change filter limits if playback is enabled
		if (params.parts[p]['playbackEnabled']){
			params.parts[p]['playbackTicks']++;
			// TODO would be nice to be able to edit the tick rate
			if (!(params.parts[p]['playbackTicks']%params.parts[p]['playbackTickRate'])){
				params.updateFilter[p]=true;
				// which parts do we want? 
				this_parts = params.parts[p];
				fkey = this_parts['playbackFilter']
				// here are the edges of the bar
				hard_limits = params.filterLims[p][fkey]
				soft_limits = params.filterVals[p][fkey]

				// how wide is the slider? 
				dfilter = (soft_limits[1]-soft_limits[0])
				// TODO this could be editable
				filter_step = dfilter/4
				// conditional statement to decide how to move the filter
				if (((soft_limits[0]+filter_step) >= hard_limits[1]) || 
					((soft_limits[1]-hard_limits[1])*(soft_limits[1]-hard_limits[1]) <=1e-6)){
					// moving the slider to the right would put the lower limit over the edge
					// set the soft left edge to the hard left edge, the soft right edge to that plus dfilter
					params.filterVals[p][fkey][0]=hard_limits[0]
					params.filterVals[p][fkey][1]=hard_limits[0]+dfilter
				}
				else if ((soft_limits[1]+filter_step) >= hard_limits[1]){
					// moving the slider to the right would put the upper limit over the edge, but not the lower
					// move the left edge but clip the right edge at the hard limit
					params.filterVals[p][fkey][0]=hard_limits[1]-dfilter
					params.filterVals[p][fkey][1]=hard_limits[1]
				}
				else{
					// moving the slider will fit within hard limits
					// move the slider over by dfilter
					params.filterVals[p][fkey][0]=soft_limits[0]+filter_step
					params.filterVals[p][fkey][1]=soft_limits[1]+filter_step
				}
				// update the slider position
				params.SliderF[p][fkey].noUiSlider.set(params.filterVals[p][fkey]);
			}
		}
		params.partsMesh[p].forEach( function( m, j ) {
			m.material.uniforms.velType.value = params.velopts[params.velType[p]];
			m.material.uniforms.columnDensity.value = params.columnDensity;
			if (params.showParts[p]) {

				m.geometry.setDrawRange( 0, params.plotNmax[p]*(1./params.decimate) )
				m.material.uniforms.uVertexScale.value = params.PsizeMult[p];

				m.material.uniforms.color.value = new THREE.Vector4( params.Pcolors[p][0], params.Pcolors[p][1], params.Pcolors[p][2], params.Pcolors[p][3]);
				if (params.showVel[p]){
					// pass camera orientation to the shader
					m.material.uniforms.cameraX.value = [cameraX.x,cameraX.y,cameraX.z];
					m.material.uniforms.cameraY.value = [cameraY.x,cameraY.y,cameraY.z];
					m.material.uniforms.oID.value = 1.;
					m.material.uniforms.uVertexScale.value *= params.vSizeMult;

				} else {
					m.material.uniforms.oID.value = 0.;
				}
				//switching back to previous method of filtering, but now setting radii to zero, and also setting to sizes back to 1 for all particles (in case turned off below)
				if (params.updateFilter[p] || params.updateOnOff[p]){
					var radiusScale = m.geometry.attributes.radiusScale.array;
					var alpha = m.geometry.attributes.alpha.array;
					var fk;
					for( var ii = 0; ii < radiusScale.length; ii ++ ) {
						radiusScale[ii] = 1.;
						alpha[ii] = 1.;
						if (params.updateFilter[p]){
							for (k=0; k<params.fkeys[p].length; k++){
								fk = params.fkeys[p][k];
								if (params.parts[p][fk] != null) {
									val = params.parts[p][fk][ii]; 
									//if ( val < params.filterVals[p][fk][0] || val > params.filterVals[p][fk][1] ){
									if ( (!params.invertFilter[p][fk] && (val < params.filterVals[p][fk][0] || val > params.filterVals[p][fk][1])) || ( (params.invertFilter[p][fk] && (val > params.filterVals[p][fk][0] && val < params.filterVals[p][fk][1])))   ){
										radiusScale[ii] = 0.;
										alpha[ii] = 0.;
									} 
								}
							}
						}
					}
					params.updateFilter[p] = false;
					params.updateOnOff[p] = false;
					m.geometry.attributes.radiusScale.needsUpdate = true;
					m.geometry.attributes.alpha.needsUpdate = true;
				}
			} else { 
				//don't need to set alphas here because I am setting the entire color to 0 (RGBA)
				m.material.uniforms.color.value = new THREE.Vector4(0);
				m.material.uniforms.oID.value = -1;
				var radiusScale = m.geometry.attributes.radiusScale.array;
				for( var ii = 0; ii < radiusScale.length; ii ++ ) {
					radiusScale[ii] = 0.;
				}
				m.geometry.attributes.radiusScale.needsUpdate = true;
				params.updateOnOff[p] = false;
			}

		});
	}
	// update the current time
	params.currentTime=seconds;

}


function render() {

	if (params.columnDensity){
		//first, render to the texture
		params.renderer.render( params.scene, params.camera, params.textureCD, true );
		params.renderer.render( params.sceneCD, params.cameraCD );
	} else {
		params.renderer.render( params.scene, params.camera );
	}

}
