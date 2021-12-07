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
	if (!end) end = parts.Coordinates.length;
	end = Math.min(parts.Coordinates.length, end);
	var len = end - start;
	var i0 = start;
	var id = name;

	// attributes
	//position
	var position = new Float32Array( len*3 ); // 3 vertices per point
	geo.addAttribute( 'position', new THREE.BufferAttribute( position, 3 ) );

	// //index
	// var pointIndex = new Float32Array( len );
	// geo.addAttribute( 'pointIndex', new THREE.BufferAttribute( pointIndex, 1 ) );

	//radiusScaling (e.g., for filtering and on/off)
	var radiusScale = new Float32Array( len ); 
	geo.addAttribute( 'radiusScale', new THREE.BufferAttribute( radiusScale, 1 ) );

	//alphas (e.g., for filtering and on/off)
	var alpha = new Float32Array( len ); 
	geo.addAttribute( 'alpha', new THREE.BufferAttribute( alpha, 1 ) );

	//angles for velocities
	var velVals = new Float32Array( len * 4); // unit vector (vx, vy, vz, norm), scaled magnitude
	geo.addAttribute( 'velVals', new THREE.BufferAttribute( velVals, 4 ) );

	//if user supplies individual per-particle colors (otherwise this is not used, but still need in shader)
	if (viewerParams.parts[p].hasOwnProperty("colorArray")) console.log("have color Array")
	var colorArray = new Float32Array( len * 4); // RGBA
	geo.addAttribute( 'colorArray', new THREE.BufferAttribute( colorArray, 4 ) );
	
	// create array to hold colormap variable values
	var colormapArray = new Float32Array( len); 
	geo.addAttribute('colormapArray', new THREE.BufferAttribute( colormapArray, 1));

	geo.setDrawRange( 0, len );

	var pindex = 0;
	var cindex = 0;
	var colorIndex = 0;
	var vindex = 0;
	var rindex = 0;
	var aindex = 0;

	for (var j=0; j<len; j++){
		if (!isNaN(parts.Coordinates[j][0])){
			position[pindex++] = parseFloat(parts.Coordinates[j][0]);
			position[pindex++] = parseFloat(parts.Coordinates[j][1]);
			position[pindex++] = parseFloat(parts.Coordinates[j][2]);
		}

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
		if (!octreeParticleInFilter(p, parts, j)){	
			rad = 0.;
			alph = 0.;
		}

		if (parts.hasOwnProperty("SmoothingLength")){
			radiusScale[rindex++] = parts.SmoothingLength[j]*rad;
		}
		else{
			radiusScale[rindex++] = rad;
		}
		
		alpha[aindex++] = alph;

	}

	return geo;
}

function createParticleMaterial(p, minPointSize=1, octreePointScale=1.){
	//change the blending mode when showing the colormap (so we don't get summing to white colors)
	var blend = THREE.AdditiveBlending;
	var dWrite = false;
	var dTest = false;
	var transp = true;
	if (viewerParams.showColormap[p]){
		blend = THREE.NormalBlending;
		dWrite = true;
		dTest = true;
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
			minPointSize: {value: minPointSize},
			octreePointScale: {value: octreePointScale},
			velTime: {value: viewerParams.animateVelTime},

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

		viewerParams.updateColormap[p] = true;
		viewerParams.updateFilter[p] = true;
		viewerParams.updateOnOff[p] = true;

		viewerParams.scene.remove(viewerParams.partsMesh[p]);

		viewerParams.partsMesh[p] = [];
	
		//geometry
		var geo = createParticleGeometry(p, viewerParams.parts[p], 0, viewerParams.plotNmax[p]);

		//material
		var material = createParticleMaterial(p);

		var mesh = new THREE.Points(geo, material);
		mesh.name = p + 'Standard';
		mesh.position.set(0,0,0);

		viewerParams.scene.add(mesh);
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

function updateColormapVariable(p){
	//replace the colormap variable
	if (viewerParams.parts[p][viewerParams.ckeys[p][viewerParams.colormapVariable[p]]] != null){
		//I think there should only be one mesh per particle set, but to be safe...
		viewerParams.partsMesh[p].forEach( function( m, j ) {
			var colormapArray = m.geometry.attributes.colormapArray.array;
			if (viewerParams.haveOctree[p]){
				//find the correct node
				var iden = m.name.replace(p,'');
				var node = null;
				if (viewerParams.octree.nodes.hasOwnProperty(p)){
					viewerParams.octree.nodes[p].every(function(n){
						if (n.id == iden){
							node = n;
							return false
						} 
						return true
					})
				}
				if (node){
					var ckey = viewerParams.ckeys[p][viewerParams.colormapVariable[p]]
					if (node.particles.hasOwnProperty(ckey)){
						for( var ii = 0; ii < m.geometry.attributes.colormapArray.array.length; ii ++ ) {
							colormapArray[ii] = node.particles[ckey][ii];
						}
					}
				}
			} else {
				for( var ii = 0; ii < m.geometry.attributes.colormapArray.array.length; ii ++ ) {
					colormapArray[ii] = viewerParams.parts[p][viewerParams.ckeys[p][viewerParams.colormapVariable[p]]][ii];
				}
			}
			m.geometry.attributes.colormapArray.needsUpdate = true;

		})
	}

	//update the blending mode for all particles (otherwise non-colormapped particles will blend with colormapped particles)
	var blend = THREE.AdditiveBlending;
	var dWrite = false;
	var dTest = false;

	if (viewerParams.showColormap[p]){
		blend = THREE.NormalBlending;
		dWrite = true;
		dTest = true;
	}
	viewerParams.partsKeys.forEach(function(pp,i){
		viewerParams.partsMesh[pp].forEach( function( m, j ) {
			m.material.depthWrite = dWrite;
			m.material.depthTest = dTest;
			m.material.blending = blend;
			m.material.needsUpdate = true;
		});
	});

}