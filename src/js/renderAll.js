
function animate(time) {
	if (!params.pauseAnimation){
		requestAnimationFrame( animate );
		update(time);
		render();
	}

}

function update(time){
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
	
	params.controls.update();

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



	for (var i=0; i<params.partsKeys.length; i++){
		var p = params.partsKeys[i];
		params.partsMesh[p].forEach( function( m, j ) {
			m.material.uniforms.velType.value = params.velopts[params.velType[p]];
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
					for( var ii = 0; ii < radiusScale.length; ii ++ ) {
						radiusScale[ii] = 1.;
						alpha[ii] = 1.;
						if (params.updateFilter[p]){
							for (k=0; k<params.fkeys[p].length; k++){
								if (params.parts[p][params.fkeys[p][k]] != null) {
									val = params.parts[p][params.fkeys[p][k]][ii]; 
									if ( val < params.filterVals[p][params.fkeys[p][k]][0] || val > params.filterVals[p][params.fkeys[p][k]][1] ){
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
			}

		});
	}

}


function render() {

	params.renderer.render( params.scene, params.camera );

}
