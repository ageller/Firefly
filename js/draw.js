
function clearPartsMesh() {
	for (var i=0; i<partsKeys.length; i++){
		var p = partsKeys[i];

		partsMesh[p].forEach( function( e, i ) {
			e.geometry.dispose();
			scene.remove( e );

		} );

		partsMesh[p] = [];

	}
}

function drawScene()
{
	for (var i=0; i<partsKeys.length; i++){
		var p = partsKeys[i];
      	var material = new THREE.ShaderMaterial( {
			uniforms: {
				color: {value: new THREE.Vector4( Pcolors[p][0], Pcolors[p][1], Pcolors[p][2], Pcolors[p][3])},
				oID: {value: 0},
				SPHrad: {value: parts[p].doSPHrad},
				uVertexScale: {value: PsizeMult[p]},
				maxDistance: {value: boxSize},
				cameraNegZ: {value: [0.,0.,-1]},
				cameraY: {value: [0.,1.,0.]},
				cameraX: {value: [1.,0.,0.]},
			},

			vertexShader: myVertexShader,
			fragmentShader: myFragmentShader,
			depthWrite:false,
			depthTest: false,
			transparent:true,
			alphaTest: false,
			blending:THREE.AdditiveBlending,
        } );

      	//geometry
		//var geo = new THREE.Geometry();
		var geo = new THREE.BufferGeometry();

		// attributes
		//positions
		var positions = new Float32Array( parts[p].Coordinates.length * 3 ); // 3 vertices per point
		geo.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );

		//alphas for filtering
		var alphas = new Float32Array( parts[p].Coordinates.length ); 
		geo.addAttribute( 'alpha', new THREE.BufferAttribute( alphas, 1 ) );

		//angles for velocities
		var velVals = new Float32Array( parts[p].Coordinates.length * 3 ); // vx, vy, vz
		geo.addAttribute( 'velVals', new THREE.BufferAttribute( velVals, 3 ) );

		geo.setDrawRange( 0, parts[p].nMaxPlot );

    	var mesh = new THREE.Points(geo, material);
		scene.add(mesh)

		var positions = mesh.geometry.attributes.position.array;
		var index = 0;
		var vindex = 0;

		for (var j=0; j<parts[p].Coordinates.length; j++){
			//geo.vertices.push(new THREE.Vector3(parts[p].Coordinates[j][0], parts[p].Coordinates[j][1], parts[p].Coordinates[j][2] ))
			
			positions[index] = parts[p].Coordinates[j][0] - center.x;
			velVals[index] = parts[p].VelVals[j][0]/parts[p].magVelocities[j];
			index++;
			positions[index] = parts[p].Coordinates[j][1] - center.y;
			velVals[index] = parts[p].VelVals[j][1]/parts[p].magVelocities[j];
			index++;
			positions[index] = parts[p].Coordinates[j][2] - center.z;
			velVals[index] = parts[p].VelVals[j][2]/parts[p].magVelocities[j];
			index++;
			alphas[j] = 1.;
			
		}

        mesh.position.set(0,0,0);


        partsMesh[p].push(mesh)

	}
	console.log("done drawing")
}

