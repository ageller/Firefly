function abg_initOctree(pkey,data){

	viewerParams.debug = false;
	viewerParams.parts[pkey].doSPH = true
	viewerParams.boxSize = 50*data.octree[''].width
	viewerParams.parts[pkey].SmoothingLength = Array(viewerParams.parts[pkey].Coordinates_flat.length/3)

	function initializeNode(node){
		// name of this node's mesh, if it's not the the root we'll use
		//  it's octant indices otherwise we'll use the string 'root'
		node.obj_name = pkey + '-' +(node.name.length != 0 ? node.name : 'root' )
		node.current_state = 'draw'
		node.com_shown=true;
		node.mesh = null;

		// let's store the pkey and octree in the node
		//  for convenient reference in other routines where
		//  we only have the node in scope
		node.pkey = pkey;
		node.octree = viewerParams.parts[pkey].octree

		// TODO: should rethink how we set radii using radius flag
		// set the radius of the particle
		viewerParams.parts[pkey].SmoothingLength[node.node_index] = node.radius;

		// initialize octree boxes
		createOctBox(node);
	}

	// walk the tree and evaluate init function
	evaluateFunctionOnOctreeNodes(
		initializeNode,
		data.octree[''],
		data.octree);

}

function loadFFTREEKaitai(node,callback){

	// initialize a FileReader object
	var binary_reader = new FileReader;
	// get local file
	fetch('static/'+node.buffer_filename).then(res => {
		res.blob().then(blob =>{ 
			blob = blob.slice(
				node.byte_offset,
				node.byte_offset+node.byte_size)
			binary_reader.readAsArrayBuffer(blob)
			// wait until loading finishes, then call function
			binary_reader.onloadend = function () {
				// convert ArrayBuffer to FireflyFormat
				kaitai_stream = new KaitaiStream(binary_reader.result)
				kaitai_format = new FireflyOctnodeSubstring(
					kaitai_stream);
				// call compileFFLYData as a callback
				callback(kaitai_format,node);
			}
		});
	})
};

function compileFFTREEData(kaitai_format,node,callback){

	node.particles = {}
	hasVelocities = kaitai_format.octnodeHeader.hasVelocities
	
	node.particles.Coordinates_flat = kaitai_format.node.coordinatesFlat.flatVectorData.data.values;
	// only load velocities if we actually have them
	if (hasVelocities) node.particles.Velocities_flat = kaitai_format.node.velocitiesFlat.flatVectorData.data.values;

	field_names = viewerParams.parts[node.pkey].field_names;
	// and now load the scalar field data
	for (i=0; i < kaitai_format.octnodeHeader.nfields; i++){
		node.particles[field_names[i]] = kaitai_format.node.scalarFields[i].fieldData.data.values;
	}
}


function createOctBox(node){
	if (viewerParams.debug) {
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
		line.position.x = node.center[0];
		line.position.y = node.center[1];
		line.position.z = node.center[2];
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

function initNode(node, p){
	//set default values
	node.NparticlesToRender = Math.floor(node.Nparticles*viewerParams.octree.minFracParticlesToDraw[p]);;
	node.particleSizeScale = 1.;
	node.particleType = p;
	node.inView = true;
	node.particles = {'Coordinates':[]};
	node.drawn = false;
	node.drawPass = 0;
}
function pruneOctree(tree, p, fname){
	var out = [];
	var p1 =  fname.lastIndexOf('/');
	var fileRoot = fname.substring(0,p1);
	tree.forEach(function(d){
		d.filename = fileRoot + '/' + d.id + '.csv';
		initNode(d, p);
		if (d.Nparticles > 0) out.push(d);
	})

	//also set the normCameraDistance based on the boxSize?
	viewerParams.octree.normCameraDistance[p] = viewerParams.octree.boxSize/100.;

	return out
}

function formatOctreeCSVdata(data, p){
	//these will be reset in the loop so that I can calculate a normalization
	// var maxV = -1.;
	// var minV = 1.e20;
	var vdif = 1.;

	var out = {'Coordinates':[]};
	if (data.length > 0){
		var keys = Object.keys(data[0]);
		if (keys.includes('vx') && keys.includes('vy') && keys.includes('vz')) {
			out.VelVals = [];
			out.magVelocities = [];
			out.NormVel = [];
		}
		var extraKeys = [];
		keys.forEach(function(k){
			if (k != 'x' && k != 'y' && k != 'z' && k != 'vx' && k != 'vy' && k != 'vz') {
				out[k] = [];
				extraKeys.push(k);
			}
		})
		data.forEach(function(d){
			out.Coordinates.push([parseFloat(d.x), parseFloat(d.y), parseFloat(d.z)]);
			if (out.hasOwnProperty('VelVals')) {
				var vx = parseFloat(d.vx);
				var vy = parseFloat(d.vy);
				var vz = parseFloat(d.vz);
				var magV = Math.sqrt(vx*vx + vy*vy + vz*vz);
				// if (magV > maxV){
				// 	maxV = magV;
				// }
				// if (magV < minV){
				// 	minV = magV;
				// }
				out.VelVals.push([vx, vy, vz]);
				out.magVelocities.push(magV);
			}
			extraKeys.forEach(function(k){
				out[k].push(parseFloat(d[k]));
			})
		})
	}


	if (out.hasOwnProperty('VelVals')) {
	//unlike for the normal particles, I will set the maxV and minV values based on the input filterLims
	//otherwise, I would end up normalizing each node differently.
		if (viewerParams.parts.options.filterLims[p].hasOwnProperty('Velocities')){
			var minV = viewerParams.parts.options.filterLims[p].Velocities[0];
			var maxV = viewerParams.parts.options.filterLims[p].Velocities[1];

			vdif = Math.min(maxV - minV, viewerParams.maxVrange);
			data.forEach(function(d, i){
				out.NormVel.push( THREE.Math.clamp((out.magVelocities[i] - minV)/vdif, 0., 1.));
			});
		} else {
			out.NormVel.push(1.);
			console.log('!!! WARNING, trying to set velocities without filterLims', p, viewerParams.parts.options.filterLims[p], out, data)
		}
	}

	return out;
}

function calcOctreeVelVals(p){
	viewerParams.parts[p].VelVals = [];
	viewerParams.parts[p].magVelocities = [];
	viewerParams.parts[p].NormVel = [];
	var mag, angx, angy, v;
	var max = -1.;
	var min = 1.e20;
	var vdif = 1.;
	for (var i=0; i<viewerParams.parts[p].Velocities.length; i++){
		v = viewerParams.parts[p].Velocities[i];
		mag = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
		angx = Math.atan2(v[1],v[0]);
		angy = Math.acos(v[2]/mag);
		if (mag > max){
			max = mag;
		}
		if (mag < min){
			min = mag;
		}
		viewerParams.parts[p].VelVals.push([v[0],v[1],v[2]]);
		viewerParams.parts[p].magVelocities.push(mag);
	}
	vdif = Math.min(max - min, viewerParams.maxVrange);
	for (var i=0; i<viewerParams.parts[p].Velocities.length; i++){
		viewerParams.parts[p].NormVel.push( THREE.Math.clamp((viewerParams.parts[p].magVelocities[i] - min) / vdif, 0., 1.));
	}
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