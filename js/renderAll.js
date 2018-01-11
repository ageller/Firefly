
function animate(time) {
	requestAnimationFrame( animate );
	update(time);
	render();
}

function update(time){
	keyboard.update();
	
	if (keyboard.down("H")){
        helpMessage=!helpMessage;
        if (helpMessage){
            showSplash();
        }
        else{
            hideSplash()
        }
    }
	
	controls.update();

	updateUICenterText();
	updateUICameraText();
	updateUIRotText();

	var mm = new THREE.Matrix4();
	//this will rotation in the plane of the viewer
	//var a = new THREE.Euler( 0., 0., incfoo, 'XYZ' );
	//var a = new THREE.Euler( 0., 0., incfoo, 'XYZ' );
	//mm.makeRotationFromEuler(a)
	//incfoo += 0.01;

	//console.log([camera.rotation.x % Math.PI, camera.rotation.y % Math.PI, camera.rotation.z % Math.PI])
	//var dir = new THREE.Vector3();
	//dir.subVectors(new THREE.Vector3(), camera.position ).normalize();
    //var Cangx = Math.atan2(dir.y, dir.x);
    //var Cangy = Math.acos(dir.z);
    //console.log(Cangx, Cangy, Math.cos(Cangy))
    //console.log(dir.x, dir.y, dir.z, 1. - (dir.z + 1.)/2.)

    // camera's -z direction
    var cameraDir = camera.getWorldDirection();

    

    // find the camera's x and y axes 
    // quaternion is orientation of the camera WRT data space
    var cameraX =  new THREE.Vector3(1,0,0);
    var cameraY =  new THREE.Vector3(0,1,0);
    cameraX.applyQuaternion(camera.quaternion);
    cameraY.applyQuaternion(camera.quaternion);

    if (keyboard.down("C")){
    	console.log("xy")	  
		console.log(cameraX);
		console.log(cameraY);
	}



	for (var i=0; i<partsKeys.length; i++){
		var p = partsKeys[i];
		partsMesh[p].forEach( function( m, j ) {
			//m.material.uniforms.vrotMatrix.value = mm;
			//m.material.uniforms.cameraRot.value = [Cangx, Cangy];
			if (plotParts[p]) {
				m.geometry.setDrawRange( 0, plotNmax[p]*(1./Decimate) )
				m.material.uniforms.uVertexScale.value = PsizeMult[p];
				m.material.uniforms.color.value = new THREE.Vector4( Pcolors[p][0], Pcolors[p][1], Pcolors[p][2], Pcolors[p][3]);
				if (showVel[p]){
					// pass camera orientation to the shader
				    m.material.uniforms.cameraNegZ.value = [cameraDir.x,cameraDir.y,cameraDir.z];
				    m.material.uniforms.cameraX.value = [cameraX.x,cameraX.y,cameraX.z];
				    m.material.uniforms.cameraY.value = [cameraY.x,cameraY.y,cameraY.z];
					m.material.uniforms.oID.value = 1;
				} else {
					m.material.uniforms.oID.value = 0;
				}
				if (updateFilter[p]){
					var alphas = m.geometry.attributes.alpha.array;
					for( var ii = 0; ii < alphas.length; ii ++ ) {
						alphas[ii] = 1.;
						for (k=0; k<fkeys[p].length; k++){
							if (parts[p][fkeys[p][k]] != null) {
								val = parts[p][fkeys[p][k]][ii]; 
								if ( val < filterLims[p][fkeys[p][k]][0] || val > filterLims[p][fkeys[p][k]][1] ){
									alphas[ii] = 0.;
								} 
							}
						}
					}
					m.geometry.attributes.alpha.needsUpdate = true;
					updateFilter[p] = false;
				}
			} else { 
				m.material.uniforms.color.value = new THREE.Vector4(0);
				m.material.uniforms.oID.value = -1;
			}
			//for filtering

		});
	}

}


function render() {

	renderer.render( scene, camera );

}
