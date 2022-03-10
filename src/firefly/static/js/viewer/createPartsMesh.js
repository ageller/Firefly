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

function createParticleGeometry(p, parts, start, end){

	//geometry
	var geo = new THREE.BufferGeometry();
	//if all == true, then we draw all the particles except the first, which will always be there to define the node locations
	//otherwise, we only draw the first particle	
	if (!start) start = 0;
	if (!end) end = parts.Coordinates_flat.length/3;
	end = Math.min(parts.Coordinates_flat.length/3, end);
	var len = end - start;
	var i0 = start;
	var id = name;

	// attributes
	//position
	var position = Float32Array.from(parts.Coordinates_flat); // 3 vertices per point
	// Doesn't seem to work, i guess we just have to copy it over :eyeroll:
	// I just get a black screen when I try to initialize the buffer with the values--
	// the addAttribute must zero out the buffer or something
	//var position = Float32Array.from(parts.Coordinates_flat.slice(3*start,3*end)[0]);
	geo.setAttribute( 'position', new THREE.BufferAttribute( position, 3 ) );

	// //index
	// var pointIndex = new Float32Array( len );
	// geo.setAttribute( 'pointIndex', new THREE.BufferAttribute( pointIndex, 1 ) );

	//radiusScaling (e.g., for filtering and on/off)
	var radiusScale = new Float32Array( len ); 
	geo.setAttribute( 'radiusScale', new THREE.BufferAttribute( radiusScale, 1 ) );

	//alphas (e.g., for filtering and on/off)
	var alpha = new Float32Array( len ); 
	geo.setAttribute( 'alpha', new THREE.BufferAttribute( alpha, 1 ) );

	//angles for velocities
	var velVals = new Float32Array( len * 4); // unit vector (vx, vy, vz, norm), scaled magnitude
	geo.setAttribute( 'velVals', new THREE.BufferAttribute( velVals, 4 ) );

	//if user supplies individual per-particle colors (otherwise this is not used, but still need in shader)
	if (viewerParams.parts[p].hasOwnProperty("colorArray")) console.log("have color Array")
	var colorArray = new Float32Array( len * 4); // RGBA
	geo.setAttribute( 'colorArray', new THREE.BufferAttribute( colorArray, 4 ) );
	
	// create array to hold colormap variable values
	var colormapArray = new Float32Array( len); 
	geo.setAttribute('colormapArray', new THREE.BufferAttribute( colormapArray, 1));

	geo.setDrawRange( 0, len );

	var pindex = 0;
	var cindex = 0;
	var colorIndex = 0;
	var vindex = 0;
	var rindex = 0;
	var aindex = 0;

	for (var j=0; j<len; j++){

		//position[3*j+0] = parts.Coordinates_flat[3*j+0]
		//position[3*j+1] = parts.Coordinates_flat[3*j+1] 
		//position[3*j+2] = parts.Coordinates_flat[3*j+2]
		//pointIndex[j] = parseFloat(j);

		if (parts.hasOwnProperty("VelVals")){
			if (!isNaN(parts.VelVals[j][0])){
				velVals[vindex++] = parts.VelVals[j][0]/parts.magVelocities[j];
				velVals[vindex++] = parts.VelVals[j][1]/parts.magVelocities[j];
				velVals[vindex++] = parts.VelVals[j][2]/parts.magVelocities[j];
				velVals[vindex++] = parts.NormVel[j];
			}
		} else {
			velVals[vindex++] = 0.;
			velVals[vindex++] = 0.;
			velVals[vindex++] = 0.;
			velVals[vindex++] = 1.;
		}

		// fill flattened color array from pre-computed colormap values
		// stored in viewerParams.parts[p]["colorArray"]
		//probably a better way to deal with this
		if (parts.hasOwnProperty("colorArray")){
			colorArray[colorIndex++] = parts.colorArray[j][0]
			colorArray[colorIndex++] = parts.colorArray[j][1]
			colorArray[colorIndex++] = parts.colorArray[j][2]
			colorArray[colorIndex++] = parts.colorArray[j][3];
		 } else {
			colorArray[colorIndex++] = 0.;
			colorArray[colorIndex++] = 0.;
			colorArray[colorIndex++] = 0.;
			colorArray[colorIndex++] = -1.;

		}

		// NEED TO UPDATE THIS
		// fill colormap array with appropriate variable values
		if (viewerParams.colormap[p] > 0.){
			if (parts[viewerParams.ckeys[p][viewerParams.colormapVariable[p]]] != null){
				colormapArray[cindex++] = parts[viewerParams.ckeys[p][viewerParams.colormapVariable[p]]][j];
			}
		}

		var rad = 1.;
		var alph = 1.;
		/*if (!octreeParticleInFilter(p, parts, j)){	
			rad = 0.;
			alph = 0.;
		}*/

		if (parts.hasOwnProperty("SmoothingLength")){
			radiusScale[rindex++] = parts.SmoothingLength[j]*rad;
		}
		else{
			radiusScale[rindex++] = rad;
		}
		
		alpha[aindex++] = alph;

	}

	// store the particle data in the "userData" dictionary so we can
	//  get it back later for filtering, etc... !
	geo.userData = parts;
	return geo;
}

function createParticleMaterial(p, minPointSize=1, octreePointScale=1.,color=null){
	//change the blending mode when showing the colormap (so we don't get summing to white colors)
	var blend = viewerParams.blendingOpts[viewerParams.blendingMode[p]];
	var dWrite = viewerParams.depthWrite[p];
	var dTest = viewerParams.depthTest[p];
	var transp = true;
	if (!color) color = [
		viewerParams.Pcolors[p][0],
		viewerParams.Pcolors[p][1],
		viewerParams.Pcolors[p][2],
		viewerParams.Pcolors[p][3]];

	var material = new THREE.ShaderMaterial( {


		uniforms: { //add uniform variable here
			color: {value: new THREE.Vector4(color[0],color[1],color[2],color[3])},
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
			minPointSize: {value: minPointSize},
			octreePointScale: {value: octreePointScale},
			velTime: {value: viewerParams.animateVelTime},
			velVectorWidth: {value: viewerParams.velVectorWidth[p]},
			velGradient: {value: viewerParams.velGradient[p]},
			useDepth: {value: +viewerParams.depthTest[p]},

		},

		vertexShader: myVertexShader,
		fragmentShader: myFragmentShader,
		depthWrite:dWrite,
		depthTest: dTest,
		transparent:transp,
		alphaTest: false,
		blending:blend,
	} );


	return material;
}

function createPartsMesh(pdraw = viewerParams.partsKeys, node=null){
	
	clearPartsMesh(pClear = pdraw);
	console.log("drawing", pdraw, viewerParams.plotNmax,viewerParams.decimate)

	//d3.select("#splashdiv5").text("Drawing...");
	viewerParams.drawfrac = 0.;
	var ndraw = 0.;
	var ndiv = Math.round(viewerParams.parts.totalSize / 10.);

	for (var i=0; i<pdraw.length; i++){
		var p = pdraw[i];

		viewerParams.updateColormapVariable[p] = true;
		viewerParams.updateFilter[p] = true;
		viewerParams.updateOnOff[p] = true;

		viewerParams.scene.remove(viewerParams.partsMesh[p]);

		viewerParams.partsMesh[p] = [];
	
		//geometry
		var geo = createParticleGeometry(p, viewerParams.parts[p]);

		//material
		var material = createParticleMaterial(p);

		var mesh = new THREE.Points(geo, material);
		mesh.name = p + 'Standard';
		mesh.position.set(0,0,0);

		viewerParams.scene.add(mesh);
		viewerParams.partsMesh[p].push(mesh)

		if (viewerParams.parts[p].hasOwnProperty('octree') && viewerParams.debug){

			octree = viewerParams.parts[p].octree;
			evaluateFunctionOnOctreeNodes(
				function (node){ 
				if (node.octbox){
					viewerParams.scene.add(node.octbox)}},
				octree[''],
				octree);
		}
	}

	//this will not be printed if you change the N value in the slider, and therefore only redraw one particle type
	//because ndraw will not be large enough, but I don't think this will cause a problem
	//if (ndraw >= Math.floor(viewerParams.parts.totalSize/viewerParams.decimate)){
	console.log("done drawing")

	clearloading();

	//}
	return true;
}