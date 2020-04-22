function clearPartsMesh(pClear = viewerParams.partsKeys) {
	for (var i=0; i<pClear.length; i++){
		var p = pClear[i];

		viewerParams.partsMesh[p].forEach( function( e, i ) {
			e.geometry.dispose();
			viewerParams.scene.remove( e );

		} );

		viewerParams.partsMesh[p] = [];

	}
}

function drawScene(pdraw = viewerParams.partsKeys)
{
	clearPartsMesh(pClear = pdraw);
	console.log("drawing", pdraw, viewerParams.plotNmax,viewerParams.decimate)

	//d3.select("#splashdiv5").text("Drawing...");
	viewerParams.drawfrac = 0.;
	var ndraw = 0.;
	var ndiv = Math.round(viewerParams.parts.totalSize / 10.);

	for (var i=0; i<pdraw.length; i++){
		var p = pdraw[i];

		viewerParams.updateColormap[p] = true;
		viewerParams.updateFilter[p] = true;
		viewerParams.updateOnOff[p] = true;

		viewerParams.scene.remove(viewerParams.partsMesh[p]);

		viewerParams.partsMesh[p] = [];
	
		//change the blending mode when showing the colormap (so we don't get summing to white colors)
		var blend = THREE.AdditiveBlending;
		var dWrite = false;
		var dTest = false;
		var transp = true;
		if (viewerParams.showColormap[p]){
			blend = THREE.NormalBlending;
			dWrite = true;
			dTest = true;
			transp = true; //still need this because I use alpha to set control filtering!
		}

		var material = new THREE.ShaderMaterial( {

			uniforms: { //add uniform variable here
				color: {value: new THREE.Vector4( viewerParams.Pcolors[p][0], viewerParams.Pcolors[p][1], viewerParams.Pcolors[p][2], viewerParams.Pcolors[p][3])},
				oID: {value: 0},
				SPHrad: {value: viewerParams.parts[p].doSPHrad},
				uVertexScale: {value: viewerParams.PsizeMult[p]},
				maxDistance: {value: viewerParams.boxSize},
				cameraY: {value: [0.,1.,0.]},
				cameraX: {value: [1.,0.,0.]},
				velType: {value: 0.},
				colormapTexture: {value: viewerParams.colormapTexture},
				colormap: {value: viewerParams.colormap[p]},
				showColormap: {value: viewerParams.showColormap[p]},
				colormapMin: {value: viewerParams.colormapVals[p][viewerParams.ckeys[p][viewerParams.colormapVariable[p]]][0]},
				colormapMax: {value: viewerParams.colormapVals[p][viewerParams.ckeys[p][viewerParams.colormapVariable[p]]][1]},
				columnDensity: {value: viewerParams.columnDensity},
				scaleCD: {value: viewerParams.scaleCD},
			},

			vertexShader: myVertexShader,
			fragmentShader: myFragmentShader,
			depthWrite:dWrite,
			depthTest: dTest,
			transparent:transp,
			alphaTest: false,
			blending:blend,
		} );

		//geometry
		//var geo = new THREE.Geometry();
		var geo = new THREE.BufferGeometry();

		// attributes
		//positions
		var positions = new Float32Array( viewerParams.plotNmax[p] * 3 ); // 3 vertices per point
		geo.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );

		//radiusScaling (e.g., for filtering and on/off)
		var radiusScale = new Float32Array( viewerParams.plotNmax[p] ); 
		geo.addAttribute( 'radiusScale', new THREE.BufferAttribute( radiusScale, 1 ) );

		//alphas (e.g., for filtering and on/off)
		var alpha = new Float32Array( viewerParams.plotNmax[p] ); 
		geo.addAttribute( 'alpha', new THREE.BufferAttribute( alpha, 1 ) );

		//angles for velocities
		var velVals = new Float32Array( viewerParams.plotNmax[p] * 4); // unit vector (vx, vy, vz), scaled magnitude
		geo.addAttribute( 'velVals', new THREE.BufferAttribute( velVals, 4 ) );

		//individual colors
		if (viewerParams.parts[p].hasOwnProperty("colorArray")) console.log("have color Array")
		var colorArray = new Float32Array( viewerParams.plotNmax[p] * 4); // RGBA
		geo.addAttribute( 'colorArray', new THREE.BufferAttribute( colorArray, 4 ) );

		geo.setDrawRange( 0, viewerParams.plotNmax[p] );

		var mesh = new THREE.Points(geo, material);
		viewerParams.scene.add(mesh);

		// create array to hold colormap variable values
		var colormapArray = new Float32Array( viewerParams.plotNmax[p]); 
		geo.addAttribute('colormapArray', new THREE.BufferAttribute( colormapArray, 1));

		//var positions = mesh.geometry.attributes.position.array;
		var cindex = 0;
		var colorIndex = 0;
		var pindex = 0;
		var vindex = 0;
		var rindex = 0;
		var aindex = 0;

		var includePoint = true;
		//for (var j=0; j<viewerParams.parts[p].Coordinates.length/viewerParams.decimate; j++){
		for (var j=0; j<viewerParams.plotNmax[p]; j++){

			includePoint = true;
			//if we redraw upon filtering, then we would include the filtering here 
			// for (k=0; k<viewerParams.fkeys[p].length; k++){
			// 	if (viewerParams.parts[p][viewerParams.fkeys[p][k]] != null) {
			// 		val = viewerParams.parts[p][viewerParams.fkeys[p][k]][j]; 
			// 		if ( val < viewerParams.filterVals[p][viewerParams.fkeys[p][k]][0] || val > viewerParams.filterVals[p][viewerParams.fkeys[p][k]][1] ){
			// 			includePoint = false;
			// 		} 
			// 	}
			// }

			if (includePoint){

				//geo.vertices.push(new THREE.Vector3(viewerParams.parts[p].Coordinates[j][0], viewerParams.parts[p].Coordinates[j][1], viewerParams.parts[p].Coordinates[j][2] ))
				
				positions[pindex] = viewerParams.parts[p].Coordinates[j][0];
				pindex++;
				positions[pindex] = viewerParams.parts[p].Coordinates[j][1];
				pindex++;
				positions[pindex] = viewerParams.parts[p].Coordinates[j][2];
				pindex++;


				if (viewerParams.parts[p].Velocities != null){
					velVals[vindex] = viewerParams.parts[p].VelVals[j][0]/viewerParams.parts[p].magVelocities[j];
					vindex++;
					velVals[vindex] = viewerParams.parts[p].VelVals[j][1]/viewerParams.parts[p].magVelocities[j];
					vindex++;
					velVals[vindex] = viewerParams.parts[p].VelVals[j][2]/viewerParams.parts[p].magVelocities[j];
					vindex++;
					velVals[vindex] = viewerParams.parts[p].NormVel[j];
					vindex++;
				}

				//probably a better way to deal with this
				if (viewerParams.parts[p].hasOwnProperty("colorArray")){
					colorArray[colorIndex] = viewerParams.parts[p].colorArray[j][0]
					colorIndex++;
					colorArray[colorIndex] = viewerParams.parts[p].colorArray[j][1]
					colorIndex++;
					colorArray[colorIndex] = viewerParams.parts[p].colorArray[j][2]
					colorIndex++;
					colorArray[colorIndex] = viewerParams.parts[p].colorArray[j][3];
					colorIndex++;
				} else {
					colorArray[colorIndex] = 0.;
					colorIndex++;
					colorArray[colorIndex] = 0.;
					colorIndex++;
					colorArray[colorIndex] = 0.;
					colorIndex++;
					colorArray[colorIndex] = -1.;
					colorIndex++;

				}

				// fill colormap array with appropriate variable values
				if (viewerParams.colormap[p] > 0.){
					if (viewerParams.parts[p][viewerParams.ckeys[p][viewerParams.colormapVariable[p]]] != null){
						colormapArray[cindex] = viewerParams.parts[p][viewerParams.ckeys[p][viewerParams.colormapVariable[p]]][j];
						cindex++;
					}
				}

                if ('SmoothingLength' in viewerParams.parts[p]){
                    radiusScale[rindex] = viewerParams.parts[p].SmoothingLength[j];
                }
                else{
                    radiusScale[rindex] = 1.;
                }
				rindex++;
				
				alpha[aindex] = 1.;
				aindex++;
				
				ndraw += 1;
				if (ndraw % ndiv < 1 || ndraw == viewerParams.parts.totalSize){
					viewerParams.drawfrac = (1 + ndraw/viewerParams.parts.totalSize)*0.5;
					//updateDrawingBar();
				}

				//add to the octree -- I will only want to do this in the initial draw! (and do I need to remove objects during filtering?)
				//viewerParams.octree.add({x:viewerParams.parts[p].Coordinates[j][0],
				//						 y:viewerParams.parts[p].Coordinates[j][1],
				//						 z:viewerParams.parts[p].Coordinates[j][2],
				//						 radius:radiusScale[rindex],
				//						 id:p+ndraw}); //probably don't want to initialize this every time

			}
		}

		mesh.position.set(0,0,0);

		viewerParams.partsMesh[p].push(mesh)
	}

	//this will not be printed if you change the N value in the slider, and therefore only redraw one particle type
	//because ndraw will not be large enough, but I don't think this will cause a problem
	//if (ndraw >= Math.floor(viewerParams.parts.totalSize/viewerParams.decimate)){
		console.log("done drawing")

		clearloading();

	//}
	return true;

}
