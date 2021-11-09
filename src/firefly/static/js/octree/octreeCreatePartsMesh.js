
function createOctreeParticleGeometry(parts, start, end){
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

	geo.setDrawRange( 0, len );

	var pindex = 0;
	for (var j=0; j<len; j++){
			
			position[pindex++] = parseFloat(parts.Coordinates[j][0]);
			position[pindex++] = parseFloat(parts.Coordinates[j][1]);
			position[pindex++] = parseFloat(parts.Coordinates[j][2]);

			pointIndex[j] = parseFloat(j);

	}

	return geo;
}

function addOctreeParticlesToScene(parts, color, name, start, end, minPointSize=viewerParams.octree.defaultMinParticleSize, pointScale=1., updateGeo=false){
	//I can use the start and end values to define how many particles to add to the mesh,
	//  but first I want to try limitting this in the shader with maxToRender.  That may be quicker than add/removing meshes.

	viewerParams.octree.drawStartTime = new Date().getTime()/1000;
	if (end - start > 0){

		//geometry
		var geo = createOctreeParticleGeometry(parts, start, end);

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
					color: {value: new THREE.Vector4( color[0]/255., color[1]/255., color[2]/255., color[3])},
					minPointSize: {value: minPointSize},
					pointScale: {value: pointScale},
					maxToRender: {value: maxN} //this will be modified in the render loop
				},

				//eventually I will probably want to use the same shader as the normal renderer
				vertexShader: myOctreeVertexShader,
				fragmentShader: myOctreeFragmentShader,
				depthWrite:dWrite,
				depthTest: dTest,
				transparent:transp,
				alphaTest: false,
				blending:blend,
			} );



			var mesh = new THREE.Points(geo, material);
			mesh.name = name;
			viewerParams.scene.add(mesh);

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
	var color = node.color;
	var name = node.particleType + node.id;

	if (node.hasOwnProperty('particles')){
		if (node.particles.Coordinates.length >= node.NparticlesToRender){
			drawn = true;
			addOctreeParticlesToScene(node.particles, color, name, start, end, minSize, sizeScale, updateGeo);
		}
	}

	if (!drawn){
		//read in the file, and then draw the particles
		d3.csv(node.filename,function(d) {
				// console.log('parts',id, d)
				//reformat this to the usual Firefly structure with Coordinates as a list of lists
				node.particles = formatOctreeCSVdata(d.slice(0,node.NparticlesToRender));
				addOctreeParticlesToScene(node.particles, color, name, start, end, minSize, sizeScale, updateGeo);
			})
	}

}

