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

			// loop through possible colormap variables using left/right arrow keys
			if (params.keyboard.down("right")){
				if (params.colormapVariable[p] == params.ckeys[p].length - 1){
					params.colormapVariable[p] = 0;
				}
				else{
					params.colormapVariable[p] += 1;
				}
			}
			if (params.keyboard.down("left")){
				if (params.colormapVariable[p] == 0){
					params.colormapVariable[p] = params.ckeys[p].length - 1;
				}
				else{
					params.colormapVariable[p] -= 1;
				}
			}

			// loop through all 32 possible colormaps using up/down arrow keys
			// negative colormap value means no colormap will be applied
			if (params.keyboard.down("up")){
				if (params.colormap[p] == 252/256){
					params.colormap[p] = -4/256;
				}
				else{
					params.colormap[p] += 8/256;
				}
			}
			else if (params.keyboard.down("down")){
				if (params.colormap[p] == -4/256){
					params.colormap[p] = 252/256;
				}
				else{
					params.colormap[p] -= 8/256;
				}
			}
			
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
				
			} else { 
				m.material.uniforms.color.value = new THREE.Vector4(0);
				m.material.uniforms.oID.value = -1;
			}

		});
	}

	// redraw scene whenever colormap variables are changed
	if (params.keyboard.down("right") || params.keyboard.down("left") || 
	    params.keyboard.down("up") || params.keyboard.down("down")){
		console.log("current variable:", params.colormapVariable[p])
		console.log("current colormap:", params.colormap[p] * (256/8) + 0.5)
		drawScene();
	}

}


function render() {

	params.renderer.render( params.scene, params.camera );

}
