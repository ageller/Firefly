function animate(time) {
	viewerParams.animating = true;
	if (!viewerParams.pauseAnimation){
		update(time);
		render();
	}
	requestAnimationFrame( animate );
}

function update(time){
	if (viewerParams.updateTween){
		TWEEN.update(time);
	}
	viewerParams.keyboard.update();
	if (viewerParams.keyboard.down("H")){
		viewerParams.helpMessage=!viewerParams.helpMessage;
		showSplash(viewerParams.helpMessage);
	}
	if (viewerParams.keyboard.down("space")){
		viewerParams.useTrackball = !viewerParams.useTrackball;
		viewerParams.switchControls = true;
		viewerParams.controls.dispose();
		initControls();
	}
	
	if (viewerParams.keyboard.down("C")) {
		console.log(viewerParams.camera.position, viewerParams.camera.rotation);
	}
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

	if (viewerParams.keyboard.down("P")){
		viewerParams.columnDensity = !viewerParams.columnDensity;
	}

	if (viewerParams.keyboard.down("I")){
		viewerParams.telescopeImage = !viewerParams.telescopeImage;
		initializeTelescopeImager();
		if (!viewerParams.telescopeImage) resetBlendMode();
	}
	//this is affecting the rotation of the camera somehow, I would have thought that I should turn this off for the tweens to work as expected, but it appears that this helps (at least in this example)
	// if (!viewerParams.inTween){
		viewerParams.controls.update();
	// }


	// camera's direction
	//I'm not sure if this is actually needed 
	//if (!viewerParams.usingSocket) viewerParams.camera.getWorldDirection(viewerParams.cameraDirection);

	
	// find the camera's x and y axes 
	// quaternion is orientation of the camera WRT data space
	var cameraX =  new THREE.Vector3(1,0,0);
	var cameraY =  new THREE.Vector3(0,1,0);
	cameraX.applyQuaternion(viewerParams.camera.quaternion);
	cameraY.applyQuaternion(viewerParams.camera.quaternion);

	var currentTime = new Date();
	var seconds = currentTime.getTime()/1000;

	viewerParams.fps_list.push(1/(seconds-viewerParams.currentTime));
	viewerParams.fps_list = viewerParams.fps_list.slice(-100);

	if (viewerParams.showfps){
		elm = document.getElementById("fps_container");
		elm.innerHTML=Math.round(
			viewerParams.fps_list.reduce((a, b) => a + b, 0)/viewerParams.fps_list.length);
		elm.style.display='block';
	}
	
	//console.log((seconds-viewerParams.currentTime))
	// if we spent more than 1.5 seconds drawing the last frame, send the app to sleep
	if ( (seconds-viewerParams.currentTime) > 1.5){
		console.log("Putting the app to sleep, taking too long!",(seconds-viewerParams.currentTime));
		viewerParams.pauseAnimation=true;
		showSleep();
	}

	viewerParams.partsKeys.forEach(function(p,i){
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
				//viewerParams.SliderF[p][fkey].noUiSlider.set(viewerParams.filterVals[p][fkey]);
			}
		}
		//check on all the UI inputs for each particle type
		viewerParams.partsMesh[p].forEach( function( m, j ) {
			
			m.material.uniforms.velType.value = viewerParams.velopts[viewerParams.velType[p]];
			m.material.uniforms.columnDensity.value = viewerParams.columnDensity;
			if (viewerParams.showParts[p]) {

				m.geometry.setDrawRange( 0, viewerParams.plotNmax[p]*(1./viewerParams.decimate) )
				m.material.uniforms.uVertexScale.value = viewerParams.PsizeMult[p];

				//for colormap
				m.material.uniforms.colormapMin.value = viewerParams.colormapVals[p][viewerParams.ckeys[p][viewerParams.colormapVariable[p]]][0];
				m.material.uniforms.colormapMax.value = viewerParams.colormapVals[p][viewerParams.ckeys[p][viewerParams.colormapVariable[p]]][1];
				m.material.uniforms.colormap.value = viewerParams.colormap[p];
				m.material.uniforms.showColormap.value = viewerParams.showColormap[p];

				m.material.uniforms.color.value = new THREE.Vector4( viewerParams.Pcolors[p][0], viewerParams.Pcolors[p][1], viewerParams.Pcolors[p][2], viewerParams.Pcolors[p][3]);
				
				if (viewerParams.showVel[p]){
					// pass camera orientation to the shader
					m.material.uniforms.cameraX.value = [cameraX.x,cameraX.y,cameraX.z];
					m.material.uniforms.cameraY.value = [cameraY.x,cameraY.y,cameraY.z];
					m.material.uniforms.oID.value = 1.;
					m.material.uniforms.uVertexScale.value *= viewerParams.vSizeMult;

				} else {
					m.material.uniforms.oID.value = 0.;
				}

				//switching back to previous method of filtering, but now setting radii to zero, and also setting to sizes back to 1 for all particles (in case turned off below)
				if (viewerParams.updateFilter[p] || viewerParams.updateOnOff[p] || viewerParams.updateColormap[p]){
					var radiusScale = m.geometry.attributes.radiusScale.array;
					var alpha = m.geometry.attributes.alpha.array;
					var fk;
					for( var ii = 0; ii < radiusScale.length; ii ++ ) {
						if ('SmoothingLength' in viewerParams.parts[p]){
							radiusScale[ii] = viewerParams.parts[p].SmoothingLength[ii];
						}
						else{
							radiusScale[ii] = 1.;
						}
						alpha[ii] = 1.;
						if (viewerParams.updateFilter[p]){
							for (k=0; k<viewerParams.fkeys[p].length; k++){
								fk = viewerParams.fkeys[p][k];
								if (viewerParams.parts[p][fk] != null) {
									val = viewerParams.parts[p][fk][ii];
									//if ( val < viewerParams.filterVals[p][fk][0] || val > viewerParams.filterVals[p][fk][1] ){
									if ( (!viewerParams.invertFilter[p][fk] &&  // we want to hide this particle
										(val < viewerParams.filterVals[p][fk][0] || 
										val > viewerParams.filterVals[p][fk][1])) || 
										( (viewerParams.invertFilter[p][fk] && 
										(val > viewerParams.filterVals[p][fk][0] && 
										val < viewerParams.filterVals[p][fk][1])))   ){
										radiusScale[ii] = 0.;
										alpha[ii] = 0.;
									} 
								}
							}
						}
					}
					m.geometry.attributes.radiusScale.needsUpdate = true;
					m.geometry.attributes.alpha.needsUpdate = true;					
					viewerParams.updateFilter[p] = false;
					viewerParams.updateOnOff[p] = false;
					viewerParams.updateColormap[p] = false;
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
				viewerParams.updateOnOff[p] = false;
			}

		});
	});
	// update the current time
	viewerParams.currentTime=seconds;

}


function render() {

	var renderDone = false;

	if (viewerParams.columnDensity){
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

		//first, render to the texture
		viewerParams.renderer.setRenderTarget(viewerParams.textureCD);
		viewerParams.renderer.render( viewerParams.scene, viewerParams.camera);

		//then back to the canvas
		//for now, just use the colormap from the first particle group
		var p = viewerParams.partsKeys[0];
		viewerParams.quadCD.material.uniforms.colormap.value = viewerParams.colormap[p];
		//console.log(viewerParams.quadCD)
		viewerParams.renderer.setRenderTarget(null)
		viewerParams.renderer.render( viewerParams.sceneCD, viewerParams.cameraCD );
		renderDone = true;
	} 

	if (viewerParams.telescopeImage){



		//first pass to get the luminous particles distances in a texture using the material created for this purpose
		viewerParams.renderer.setRenderTarget(viewerParams.textureTDist);
		viewerParams.renderer.render( viewerParams.sceneDist, viewerParams.camera);
		viewerParams.textureTDist.needsUpdate = true; //is this needed?

		//now render the luminous particles with additive blendingto get the desired colors
		viewerParams.partsKeys.forEach(function(p,i){
			viewerParams.partsMesh[p].forEach( function( m, j ) {
				m.material.uniforms.opacityImage.value = false;
				m.material.uniforms.reflectImage.value = false;
				if (p == viewerParams.luminousPart){ 
					//update the blending mode
					m.material.depthWrite = false;
					m.material.depthTest = false;
					m.material.transparent = true;
					m.material.blending = THREE.AdditiveBlending;
					m.material.needsUpdate = true;
				} else {
					//turn off any other particle group

					m.material.uniforms.color.value = new THREE.Vector4(0);
					m.material.uniforms.oID.value = -1;
					var radiusScale = m.geometry.attributes.radiusScale.array;
					for( var ii = 0; ii < radiusScale.length; ii ++ ) {
						radiusScale[ii] = 0.;
					}
					m.geometry.attributes.radiusScale.needsUpdate = true;
					viewerParams.updateOnOff[p] = true;

				}
			});
		});
		//render this to a different texture
		viewerParams.renderer.setRenderTarget(viewerParams.textureTLum);
		viewerParams.renderer.render( viewerParams.scene, viewerParams.camera);

		//now turn off the stars and turn on the gas to render for the ?subtraction?
		viewerParams.partsKeys.forEach(function(p,i){
			viewerParams.partsMesh[p].forEach( function( m, j ) {
				if (p == viewerParams.opacityPart){ 
					//reset the size and color
					m.material.uniforms.color.value = new THREE.Vector4( 0.1, 0.2, 0.3, viewerParams.Pcolors[p][3]); //this will be some proxy for the opacity that will add up
					m.material.uniforms.oID.value = 0;
					var radiusScale = m.geometry.attributes.radiusScale.array;
					for( var ii = 0; ii < radiusScale.length; ii ++ ) {
						radiusScale[ii] = 1.;
					}
					m.geometry.attributes.radiusScale.needsUpdate = true;
					viewerParams.updateOnOff[p] = true;

					//update the blending mode
					m.material.depthWrite = false;
					m.material.depthTest = false;
					m.material.transparent = true;
					m.material.blending = THREE.AdditiveBlending;

					m.material.uniforms.opacityImage.value = true;
					m.material.uniforms.reflectImage.value = false;

					m.material.needsUpdate = true;


				} else {
					//turn off any other particle group

					m.material.uniforms.color.value = new THREE.Vector4(0);
					m.material.uniforms.oID.value = -1;
					var radiusScale = m.geometry.attributes.radiusScale.array;
					for( var ii = 0; ii < radiusScale.length; ii ++ ) {
						radiusScale[ii] = 0.;
					}
					m.geometry.attributes.radiusScale.needsUpdate = true;
					viewerParams.updateOnOff[p] = true;

				}
			});
		});
		//render this to a different texture, but supply the distance texture
		viewerParams.renderer.setRenderTarget(viewerParams.textureTOpac);
		viewerParams.renderer.render( viewerParams.scene, viewerParams.camera);

		//do this again for reflected light
		//make the color a little redder than the star color
		var p = viewerParams.luminousPart;
		var co = new THREE.Vector4(viewerParams.Pcolors[p][0] + 0.1, viewerParams.Pcolors[p][1], viewerParams.Pcolors[p][2], 0.05*viewerParams.Pcolors[p][3]);
		var mat = viewerParams.partsMesh[viewerParams.opacityPart][0].material;
		mat.uniforms.color.value = co;
		mat.uniforms.opacityImage.value = false;
		mat.uniforms.reflectImage.value = true;
		mat.needsUpdate = true;
		viewerParams.renderer.setRenderTarget(viewerParams.textureTRefl);
		viewerParams.renderer.render( viewerParams.scene, viewerParams.camera);

		//send the textures to the telescope imaging shader
		viewerParams.quadTI.material.uniforms.luminTex.value = viewerParams.textureTLum.texture;
		viewerParams.quadTI.material.uniforms.opacityTex.value = viewerParams.textureTOpac.texture;
		viewerParams.quadTI.material.uniforms.reflectTex.value = viewerParams.textureTRefl.texture;

		//to test the textures
		//viewerParams.quadTI.material.uniforms.luminTex.value = viewerParams.textureTDist.texture;
		//viewerParams.quadTI.material.uniforms.luminTex.value = viewerParams.textureTOpac.texture;
		//viewerParams.quadTI.material.uniforms.luminTex.value = viewerParams.textureTLum.texture;


		viewerParams.quadTI.material.needsUpdate = true;
		viewerParams.renderer.setRenderTarget(null)
		viewerParams.renderer.render( viewerParams.sceneTI, viewerParams.cameraTI );

		renderDone = true;
	}

	if (!renderDone) {
		viewerParams.renderer.render( viewerParams.scene, viewerParams.camera );

	}
	

	if (viewerParams.streamerActive){
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


}

function initializeTelescopeImager(){
	if (viewerParams.telescopeImage){

		//add the luminous particle to the distance render mesh for the render texture
		var geo = viewerParams.partsMesh[viewerParams.luminousPart][0].geometry;
		viewerParams.materialDist.uniforms.uVertexScale.value = viewerParams.PsizeMult[viewerParams.luminousPart];
		viewerParams.materialDist.needsUpdate = true;
		viewerParams.meshDist = new THREE.Points(geo, viewerParams.materialDist);
		viewerParams.sceneDist.add(viewerParams.meshDist);

	} else {
		//now remove to save memory -- is there anything else that I have to do?
		viewerParams.sceneDist.remove( viewerParams.meshDist );
	}
}
function resetBlendMode(){
	viewerParams.partsKeys.forEach(function(pp,i){
		viewerParams.partsMesh[pp].forEach( function( m, j ) {
			m.material.depthWrite = false;
			m.material.depthTest = false;
			m.material.blending = THREE.AdditiveBlending;

			m.material.uniforms.columnDensity.value = viewerParams.columnDensity;
			m.material.uniforms.opacityImage.value = false;
			m.material.uniforms.reflectImage.value = false;

			m.material.fragmentShader = myFragmentShader;

			m.material.needsUpdate = true;

		});
	});
}



/* --- not the best place for this, probably... */ 
function updatePlaybackFilter(p){
	var fkey = viewerParams.parts[p]['currentlyShownFilter'];
	viewerParams.parts[p]['playbackFilter'] = fkey;
	var range = viewerParams.filterVals[p][fkey];
	viewerParams.parts[p]['dfilter'] = range[1] - range[0];
}
