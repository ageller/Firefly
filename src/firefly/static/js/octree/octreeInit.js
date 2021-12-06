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