
function createOctreeParticleGeometry(p, parts, start, end){
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

	//index
	var pointIndex = new Float32Array( len );
	geo.addAttribute( 'pointIndex', new THREE.BufferAttribute( pointIndex, 1 ) );

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
		position[pindex++] = parseFloat(parts.Coordinates[j][0]);
		position[pindex++] = parseFloat(parts.Coordinates[j][1]);
		position[pindex++] = parseFloat(parts.Coordinates[j][2]);

		pointIndex[j] = parseFloat(j);

		if (parts.hasOwnProperty("VelVals")){
			velVals[vindex++] = parts.VelVals[j][0]/parts.magVelocities[j];
			velVals[vindex++] = parts.VelVals[j][1]/parts.magVelocities[j];
			velVals[vindex++] = parts.VelVals[j][2]/parts.magVelocities[j];
			velVals[vindex++] = parts.NormVel[j];
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
		
		//need to do this somewhere else?
		// ndraw += 1;
		// if (ndraw % ndiv < 1 || ndraw == viewerParams.parts.totalSize){
		// 	viewerParams.drawfrac = (1 + ndraw/viewerParams.parts.totalSize)*0.5;
		// }

	}

	return geo;
}

function addOctreeParticlesToScene(p, parts, name, start, end, minPointSize=viewerParams.octree.defaultMinParticleSize, pointScale=1., updateGeo=false){
	//I can use the start and end values to define how many particles to add to the mesh,
	//  but first I want to try limitting this in the shader with maxToRender.  That may be quicker than add/removing meshes.

	viewerParams.octree.drawStartTime = new Date().getTime()/1000;
	if (end - start > 0){

		//geometry
		var geo = createOctreeParticleGeometry(p, parts, start, end);

		var maxN = end - start;

		if (updateGeo){
			//update the geometry in the mesh
			var obj = viewerParams.scene.getObjectByName(name);
			if (obj){
				obj.geometry = geo;
				obj.geometry.needsUpdate = true;
			}

		} else {
			//create the mesh
			var blend = THREE.AdditiveBlending;
			var dWrite = false;
			var dTest = false;
			var transp = true;

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
					maxToRender: {value: parts.Coordinates.length},
					octreePointScale: {value: pointScale},

				},

				vertexShader: myVertexShader,
				fragmentShader: myFragmentShader,
				depthWrite:dWrite,
				depthTest: dTest,
				transparent:transp,
				alphaTest: false,
				blending:blend,
			} );


			var mesh = new THREE.Points(geo, material);
			mesh.name = name;
			viewerParams.scene.add(mesh);
			viewerParams.partsMesh[p].push(mesh);

			mesh.position.set(0,0,0);
		}
	}

	//remove from the toDraw list
	const index = viewerParams.octree.toDrawIDs.indexOf(name);
	viewerParams.octree.drawCount += 1;


}

function reduceOctreeParticles(node, N=null){
	if (N == null) N = node.NparticlesToRender;
	Object.keys(node.particles).forEach(function(k){
		node.particles[k] = node.particles[k].slice(0, N);
	})
}

function drawOctreeNode(node, updateGeo=false){

	var drawn = false;
	var start = 0;
	var end = node.NparticlesToRender;
	var minSize = viewerParams.octree.defaultMinParticleSize;
	var sizeScale = node.particleSizeScale;
	var name = node.particleType + node.id;

	if (node.hasOwnProperty('particles')){
		if (node.particles.Coordinates.length >= node.NparticlesToRender){
			drawn = true;
			addOctreeParticlesToScene(node.particleType, node.particles, name, start, end, minSize, sizeScale, updateGeo);
		}
	}

	if (!drawn){
		//read in the file, and then draw the particles
		d3.csv(node.filename,function(d) {
				// console.log('parts',id, d)
				//reformat this to the usual Firefly structure with Coordinates as a list of lists
				node.particles = formatOctreeCSVdata(d.slice(0,node.NparticlesToRender));
				addOctreeParticlesToScene(node.particleType, node.particles, name, start, end, minSize, sizeScale, updateGeo);
			})
	}

}

function octreeParticleInFilter(p, parts, j){
	for (k=0; k<viewerParams.fkeys[p].length; k++){
		fk = viewerParams.fkeys[p][k];
		var val = (viewerParams.filterVals[p][fk][0] + viewerParams.filterVals[p][fk][1])/2.;

		// if the field value for this particle exists:
		if (viewerParams.parts[p][fk] != null) {
			if (parts.hasOwnProperty(fk)) val = parts[fk][j];
	
			// we want to hide this particle
			if ( (!viewerParams.invertFilter[p][fk] &&  
				(val < viewerParams.filterVals[p][fk][0] || 
				val > viewerParams.filterVals[p][fk][1])) || 
				( (viewerParams.invertFilter[p][fk] && 
				(val > viewerParams.filterVals[p][fk][0] && 
				val < viewerParams.filterVals[p][fk][1])))   ){

				// set the radius to 0 and the alpha to 0
				return false
			} 
		}
	}
	return true
}



