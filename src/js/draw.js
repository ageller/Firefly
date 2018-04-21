
function clearPartsMesh() {
	for (var i=0; i<params.partsKeys.length; i++){
		var p = params.partsKeys[i];

		params.partsMesh[p].forEach( function( e, i ) {
			e.geometry.dispose();
			params.scene.remove( e );

		} );

		params.partsMesh[p] = [];

	}
}

function drawScene()
{
	for (var i=0; i<params.partsKeys.length; i++){
		var p = params.partsKeys[i];
		var material = new THREE.ShaderMaterial( {
			uniforms: {
				color: {value: new THREE.Vector4( params.Pcolors[p][0], params.Pcolors[p][1], params.Pcolors[p][2], params.Pcolors[p][3])},
				oID: {value: 0},
				SPHrad: {value: params.parts[p].doSPHrad},
				uVertexScale: {value: params.PsizeMult[p]},
				maxDistance: {value: params.boxSize},
				cameraNegZ: {value: [0.,0.,-1.]},
				cameraY: {value: [0.,1.,0.]},
				cameraX: {value: [1.,0.,0.]},
				velType: {value: 0.},
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
		var positions = new Float32Array( params.parts[p].Coordinates.length * 3 ); // 3 vertices per point
		geo.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );

		//alphas for filtering
		var alphas = new Float32Array( params.parts[p].Coordinates.length ); 
		geo.addAttribute( 'alpha', new THREE.BufferAttribute( alphas, 1 ) );

		//angles for velocities
		var velVals = new Float32Array( params.parts[p].Coordinates.length * 4); // unit vector (vx, vy, vz), scaled magnitude
		geo.addAttribute( 'velVals', new THREE.BufferAttribute( velVals, 4 ) );

		geo.setDrawRange( 0, params.parts[p].nMaxPlot );

		var mesh = new THREE.Points(geo, material);
		params.scene.add(mesh)

		var positions = mesh.geometry.attributes.position.array;
		var index = 0;
		var vindex = 0;

		for (var j=0; j<params.parts[p].Coordinates.length; j++){
			//geo.vertices.push(new THREE.Vector3(params.parts[p].Coordinates[j][0], params.parts[p].Coordinates[j][1], params.parts[p].Coordinates[j][2] ))
			
			positions[index] = params.parts[p].Coordinates[j][0] - params.center.x;
			velVals[vindex] = params.parts[p].VelVals[j][0]/params.parts[p].magVelocities[j];
			index++;
			vindex++;
			positions[index] = params.parts[p].Coordinates[j][1] - params.center.y;
			velVals[vindex] = params.parts[p].VelVals[j][1]/params.parts[p].magVelocities[j];
			index++;
			vindex++;
			positions[index] = params.parts[p].Coordinates[j][2] - params.center.z;
			velVals[vindex] = params.parts[p].VelVals[j][2]/params.parts[p].magVelocities[j];
			index++;
			vindex++;
			velVals[vindex] = params.parts[p].VelVals[j][3];
			vindex++;

			alphas[j] = 1.;
			
		}

		mesh.position.set(0,0,0);


		params.partsMesh[p].push(mesh)

	}
	console.log("done drawing")
}

