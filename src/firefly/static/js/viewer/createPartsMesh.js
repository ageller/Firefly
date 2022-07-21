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

	geo.setDrawRange( 0, len );

	// initialize and set all attribute buffers
	// position
	var position = Float32Array.from(parts.Coordinates_flat.slice(3*start,3*end)); // 3 vertices per point
	geo.setAttribute( 'position', new THREE.BufferAttribute( position, 3 ) );

	// radiusScaling (e.g., for filtering and on/off and changing size of points)
	var radii = Float32Array.from(Array( len ).fill(1));
	geo.setAttribute( 'radiusScale', new THREE.BufferAttribute( radii, 1 ) );

	// alphas (e.g., for filtering and on/off)
	var alpha = Float32Array.from(Array( len ).fill(1)); 
	geo.setAttribute( 'alpha', new THREE.BufferAttribute( alpha, 1 ) );

	// velocities, should be vx/|v|, vy/|v|, vz/|v| and [ |v| - min(|v|) ]/[ max(|v|) - min(|v|) ] 
	if (parts.hasOwnProperty("VelVals")) var velVals = Float32Array.from(parts.VelVals.slice(4*start,4*end));
	else var velVals = new Float32Array(Array(len * 4).fill(0)); // unit vector (vx, vy, vz, norm), scaled magnitude
	geo.setAttribute( 'velVals', new THREE.BufferAttribute( velVals, 4 ) );
	
	// create array to hold colormap field values
	// 	colormapVariable[p] is the index in the ckeys array, not the variable itself.
	var ckey = viewerParams.ckeys[p][viewerParams.colormapVariable[p]]
	if (parts.hasOwnProperty(ckey)) var colormapField = Float32Array.from(parts[ckey].slice(start,end));
	else var colormapField = Float32Array.from(Array(len).fill(0));
	geo.setAttribute('colormapField', new THREE.BufferAttribute( colormapField, 1));

	//if user supplies individual per-particle colors (otherwise this is not used, but still need in shader)
	if (viewerParams.parts[p].hasOwnProperty("rgbaColors_flat")) var rgbaColors = Float32Array.from(parts.rgbaColors_flat.slice(4*start,4*end));
	else var rgbaColors = Float32Array.from( Array(len * 4).fill(-1)); // RGBA
	geo.setAttribute( 'rgbaColor', new THREE.BufferAttribute( rgbaColors, 4 ) );


	// store the particle data in the "userData" dictionary so we can
	//  get it back later for filtering, etc... !
	geo.userData = parts;
	return geo;
}

function createParticleMaterial(p, color=null,minPointScale=null,maxPointScale=null){
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

	if (minPointScale == null) 	minPointScale = viewerParams.minPointScale;
	if (maxPointScale == null) 	maxPointScale = viewerParams.maxPointScale;

	var material = new THREE.ShaderMaterial( {


		uniforms: { //add uniform variable here
			color: {value: new THREE.Vector4(color[0],color[1],color[2],color[3])},
			vID: {value: 0},
			uVertexScale: {value: viewerParams.PsizeMult[p]},
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
			minPointScale: {value: minPointScale},
			maxPointScale: {value: maxPointScale},
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
	//console.log("drawing", pdraw, viewerParams.plotNmax,viewerParams.decimate)

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
	//console.log("done drawing")

	clearloading(false);

	//}
	return true;
}