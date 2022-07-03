function initOctree(pkey,data){

	viewerParams.haveOctree[pkey] = true;

	viewerParams.octree.toDraw[pkey] = [];
	viewerParams.haveAnyOctree = true;

	// flag to  draw the yellow octree boxes around the nodes
	//viewerParams.debug = true;
	viewerParams.debug = false;
	if (viewerParams.showCoMParticles) viewerParams.boxSize = 25*data.octree[''].width;

	// TODO not sure if these are still necessary post-octree-refactor
	viewerParams.octree.boxSize = viewerParams.boxSize;
	viewerParams.octree.normCameraDistance[pkey] = viewerParams.octree.normCameraDistance.default;

	//for loading bar
	viewerParams.octree.loadingCount[pkey] = [0,0];

	//this will be used as a percentage value in the GUI
	viewerParams.plotNmax[pkey] = 100;

	// enable radius rescaling to scale the center of mass particles differentially
	//viewerParams.parts[pkey].doSPH = true
	viewerParams.parts[pkey].OctreeRadii = Array(viewerParams.parts[pkey].Coordinates_flat.length/3)

	// array that prevents filtering from changing the size of nodes that aren't drawn (i.e. showing them
	//  when the octree has "filtered" them out).
	viewerParams.parts[pkey].IsDrawn = Array(viewerParams.parts[pkey].Coordinates_flat.length/3)


	function initializeNode(node){
		// name of this node's mesh, if it's not the the root we'll use
		//  it's octant indices otherwise we'll use the string 'root'
		node.obj_name = pkey + '-' +(node.name.length != 0 ? node.name : 'root' )
		node.current_state = 'draw'
		node.com_shown = true;
		node.mesh = null;
		node.queue = null;
		//node.buffer_size = 0;

		// convert center to 3vector
		node.center = new THREE.Vector3(node.center[0],node.center[1],node.center[2]);

		// let's store the pkey in the node
		//  for convenient reference in other routines where
		//  we only have the node in scope
		node.pkey = pkey;
		node.radius = node.radius;

		viewerParams.parts[pkey].OctreeRadii[node.node_index] = node.radius;

		// TODO not sure if these are still necessary post-octree-refactor
		node.NparticlesToRender = node.buffer_size;
		node.particleSizeScale = 1.;

		// initialize octree boxes
		createOctBox(node);
	}

	// walk the entire tree and evaluate the initializeNode function
	//  on each node
	evaluateFunctionOnOctreeNodes(
		initializeNode,
		data.octree[''],
		data.octree);
}

function loadFFRAW(node,callback){
	// TODO: doesn't actually work. gave up and converted
	//  ffraw to fftree instead.
	var this_file;
	var offset;
	var binary_reader = new FileReader;
	var Coordinates_flat = new Float32Array(node.buffer_size*3);
	var Velocities_flat = new Float32Array(node.buffer_size*3);

	viewerParams.parts[node.pkey].prefixes.forEach(function (prefix,index){
		offset=0;
		node.files.forEach(function (ftuple){
			this_file = ftuple[0].replace('<prefix>',prefix);
			console.log(this_file)
			fetch('static/data/gaia/'+this_file).then(res => {
				res.blob().then(blob =>{ 
					blob = blob.slice(
						ftuple[1],
						ftuple[1]+ftuple[2]*4)
					binary_reader.readAsArrayBuffer(blob)
					binary_reader.onloadend = function () {
						// convert ArrayBuffer to FireflyFormat
						// call compileFFLYData as a callback
						console.log(binary_reader.result)
						debugger;
					}
				});
			});
		});
	});
}

function loadFFTREEKaitai(node,callback){

	// initialize a FileReader object
	var binary_reader = new FileReader;
	// get local file
	fetch('static/data/'+node.buffer_filename).then(res => {
		res.blob().then(blob =>{ 
			blob = blob.slice(
				node.byte_offset,
				node.byte_offset+node.byte_size)
			binary_reader.readAsArrayBuffer(blob)
			// wait until loading finishes, then call function
			binary_reader.onloadend = function () {
				// convert ArrayBuffer to FireflyFormat
				// call compileFFLYData as a callback
				callback(
					new FireflyOctnodeSubstring(new KaitaiStream(binary_reader.result)),
					node);
			}
		});
	})
};

function compileFFTREEData(kaitai_format,node,callback){

	node.particles = {}
	node.particles.pkey = node.pkey

	hasVelocities = kaitai_format.octnodeHeader.hasVelocities
	hasRgbaColors = kaitai_format.octnodeHeader.hasRgbaColors
	
	node.particles.Coordinates_flat = kaitai_format.node.coordinatesFlat.flatVectorData.data.values;
	// only load velocities if we actually have them
	if (hasVelocities){
		node.particles.Velocities_flat = kaitai_format.node.velocitiesFlat.flatVectorData.data.values;
		calcVelVals(node.particles);
	}
	// only load Rgba color tuples if we actually have them
	if (hasRgbaColors){
		node.particles.rgbaColors_flat = kaitai_format.node.rgbaColorsFlat.flatVector4Data.data.values;
	}

	field_names = viewerParams.parts[node.pkey].field_names;
	// and now load the scalar field data
	for (i=0; i < kaitai_format.octnodeHeader.nfields; i++){
		node.particles[field_names[i]] = kaitai_format.node.scalarFields[i].fieldData.data.values;
	}
}


function createOctBox(node){
	if (viewerParams.debug && node.pkey == 'DR3-RV') {
		const geometry = new THREE.BufferGeometry();
		// create a simple square shape. We duplicate the top left and bottom right
		// vertices because each vertex needs to appear once per triangle.
		const vertices = new Float32Array( [
			-1.0, -1.0,  1.0,
			1.0, -1.0,  1.0,
			1.0,  1.0,  1.0,

			1.0,  1.0,  1.0,
			-1.0,  1.0,  1.0,
			-1.0, -1.0,  1.0,

			1.0,  1.0,  -1.0,
			-1.0,  1.0,  -1.0,
			-1.0, -1.0,  -1.0
		] );

		// itemSize = 3 because there are 3 values (components) per vertex
		geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
		const material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
		const mesh = new THREE.Mesh( geometry, material );
		const wireframe = new THREE.WireframeGeometry( mesh.geometry );
		let line = new THREE.LineSegments( wireframe );
		line.material.depthTest = false;
		line.material.opacity = 0.25;
		line.material.transparent = true;
		line.position.x = node.center.x;
		line.position.y = node.center.y;
		line.position.z = node.center.z;
		line.scale.x = line.scale.y = line.scale.z = node.width/2;
		var obj =  new THREE.BoxHelper( line );
		obj.visible=true;
		node.octbox = obj;
	}

	upper = new THREE.Vector3(
		node.center[0] + node.width/2.,
		node.center[1] + node.width/2.,
		node.center[2] + node.width/2.);

	lower = new THREE.Vector3(
		node.center[0] - node.width/2.,
		node.center[1] - node.width/2.,
		node.center[2] - node.width/2.);

	const bounding_box = new THREE.Box3(lower,upper)
	node.bounding_box = bounding_box

	return obj;
}

function updateOctreeDecimationSpan(){
	var num = (1./viewerParams.octree.NParticleMemoryModifier).toFixed(2);
	if (num > 10000) num = '> 10,000'
	d3.select('#decimationOctreeSpan').text(num)
}

function evaluateFunctionOnOctreeNodes(node_function,node,octree,max_refinement=null){
	values = [node_function(node)];
	node.children.forEach(
		function (child_name){
			child = octree[child_name]
			if (!max_refinement || max_refinement >= child.refinement){
			 values = values.concat(evaluateFunctionOnOctreeNodes(node_function,child,octree,max_refinement));
			}
		}
	);
	return values;
}