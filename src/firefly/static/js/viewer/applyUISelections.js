//////////////////////////////////////////////////
///// Functions to execute the GUI commands //////
//////////////////////////////////////////////////

function resetViewer(){

	viewerParams.reset = true;
	viewerParams.ready = false;
	console.log('Reset options', viewerParams.parts.options)
	//reset all the parts specific values to the initial ones
	initPVals();
	initScene();
	createPartsMesh();

	//recreate the GUI
	clearInterval(viewerParams.waitForInit);
	viewerParams.waitForInit = setInterval(function(){ 
		if (viewerParams.ready){
			clearInterval(viewerParams.waitForInit);
			sendInitGUI([],[{'makeUI':viewerParams.local}]);
			viewerParams.reset = false;
		}
	}, 100);



}

//reset to the initial Options file
function resetToOptions(){
	console.log("Resetting to initial", viewerParams.parts.options_initial);
	viewerParams.parts.options = JSON.parse(JSON.stringify(viewerParams.parts.options_initial));
	resetViewer();
}

//to load in a new data set
function loadNewData(){
	//sendInitGUI([],[{'makeUI':!viewerParams.usingSocket}]);
	
	//reset a few variables and remake the UI
	//sendToGUI({'setGUIParamByKey':[null, "partsKeys"]})
	var forGUI = [];
	forGUI.push({'clearGUIinterval':null});
	forGUI.push({'defineGUIParams':null});
	sendToGUI(forGUI);

	viewerParams.partsKeys.forEach(
		function (pkey){
		if (viewerParams.parts[pkey].hasOwnProperty('octree')) disposeOctreeNodes(pkey);
	});


	viewerParams.parts = null;
	viewerParams.camera = null;
	viewerParams.boxSize = 0;
	viewerParams.controls.dispose();

	// reset to default options
	defineViewerParams()
	// rebuild the viewer with new options
	makeViewer();
	//if (viewerParams.local) makeUI(local=true);
	forGUI = [{'makeUI':viewerParams.local}];
	if (!viewerParams.local) {
		forGUI.push({'setGUIParamByKey':[false,"GUIready"]});
		forGUI.push({'showSplash':true});
	}

	//AMG: should this be moved to the GUI (generally we won't have these in the viewer window...)
	d3.select('#stateContainer').html("");
	d3.select('.UIcontainer').html("");
	d3.select("#splashdivLoader").selectAll('svg').remove();
	d3.select("#splashdiv5").text("Loading particle data...");
	if (Object.keys(viewerParams.dir).length > 1){
		forGUI.push({'showLoadingButton':'#selectStartupButton'});
	} else {
		forGUI.push({'showLoadingButton':'#loadDataButton'});
	}
	sendToGUI(forGUI);

	d3.select("#loader").style("display","visible");
	viewerParams.loadfrac = 0.;
	viewerParams.haveUI = false;
	showSplash(true);

	viewerParams.loaded = false;
	viewerParams.pauseAnimation = true;

	//document.getElementById("inputFilenames").click();
}



//reset to a preset file
function resetToPreset(preset){
	console.log("Resetting to Preset");
	console.log('new',preset,'prev:',viewerParams.parts.options)
	viewerParams.parts.options = preset;
	resetViewer();
}

//check whether the center is locked or not
function checkCenterLock(checked){

	viewerParams.controls.dispose();
	viewerParams.switchControls = true;
	if (checked) {
		viewerParams.useTrackball = true;
	} else {
		viewerParams.useTrackball = false;
	}

	initControls();

}

//reset the camera position to whatever is saved in the options parameters
function resetCamera() {

	// if user hasn't clicked the 'Save' camera button then 'Reset' should not
	//  do anything IMO
	//if (!viewerParams.parts.options.hasOwnProperty('savedCameraSetup')) return;

	var screenWidth = window.innerWidth;
	var screenHeight = window.innerHeight;
	var aspect = screenWidth / screenHeight;

	viewerParams.camera = new THREE.PerspectiveCamera( viewerParams.fov, aspect, viewerParams.zmin, viewerParams.zmax);
	viewerParams.camera.up.set(0, -1, 0);
	viewerParams.scene.add(viewerParams.camera); 

	setCenter(viewerParams.parts[viewerParams.partsKeys[0]].Coordinates_flat);
	viewerParams.camera.position.set(viewerParams.center.x, viewerParams.center.y, viewerParams.center.z - viewerParams.boxSize/2.);
	viewerParams.camera.lookAt(viewerParams.scene.position);  

	//change the center?
	if (viewerParams.parts.options.hasOwnProperty('center')){
		if (viewerParams.parts.options.center != null){
			viewerParams.center = new THREE.Vector3(viewerParams.parts.options.center[0], viewerParams.parts.options.center[1], viewerParams.parts.options.center[2]);
			setBoxSize(viewerParams.parts[viewerParams.partsKeys[0]].Coordinates_flat);
		}
	} 

	//change location of camera?
	if (viewerParams.parts.options.hasOwnProperty('camera')){
		if (viewerParams.parts.options.camera != null){
			viewerParams.camera.position.set(viewerParams.parts.options.camera[0], viewerParams.parts.options.camera[1], viewerParams.parts.options.camera[2]);
		}
	} 

	//change the rotation of the camera (which requires Fly controls)
	if (viewerParams.parts.options.hasOwnProperty('cameraRotation')){
		if (viewerParams.parts.options.cameraRotation != null){
			viewerParams.camera.rotation.set(viewerParams.parts.options.cameraRotation[0], viewerParams.parts.options.cameraRotation[1], viewerParams.parts.options.cameraRotation[2]);
		}
	}

	//change the rotation of the camera (which requires Fly controls)
	if (viewerParams.parts.options.hasOwnProperty('cameraUp')){
		if (viewerParams.parts.options.cameraUp != null){
			viewerParams.camera.up.set(viewerParams.parts.options.cameraUp[0], viewerParams.parts.options.cameraUp[1], viewerParams.parts.options.cameraUp[2]);
		}
	}

	if (viewerParams.parts.options.hasOwnProperty('useTrackball')){
		if (viewerParams.parts.options.useTrackball != null){
			viewerParams.useTrackball = viewerParams.parts.options.useTrackball
		}
	}

	viewerParams.controls.dispose();
	initControls();
	sendCameraInfoToGUI(null, true);

}

//reset the camera center.  Can be useful when switching back and forth between trackball and fly controls
function recenterCamera() {
	var old_up = [
		viewerParams.camera.up.x,
		viewerParams.camera.up.y,
		viewerParams.camera.up.z,
	];
	if (viewerParams.useTrackball) initControls();
	// handle fly controls-- just want to look at the center
	else viewerParams.camera.lookAt(viewerParams.center);
	// maintain orientation as best we can
	viewerParams.camera.up.set(old_up[0],old_up[1],old_up[2]);
	sendCameraInfoToGUI(null, true);
}


//replace camera settings in options (if any) with the current camera position and rotation (to return here upon clicking reset)
function saveCamera() {

	// tell resetCamera() that we've been through saveCamera once
	//  at least. in principle could restrict resetCamera()
	//  to only work if savedCameraSetup = true
	viewerParams.parts.options.savedCameraSetup = true;

	// store the current camera's position
	viewerParams.parts.options.camera = [0,0,0]
	viewerParams.parts.options.camera[0] = viewerParams.camera.position.x;
	viewerParams.parts.options.camera[1] = viewerParams.camera.position.y;
	viewerParams.parts.options.camera[2] = viewerParams.camera.position.z;

	// store the current camera focus
	if (viewerParams.useTrackball){
		viewerParams.parts.options.center = [0,0,0]
		viewerParams.parts.options.center[0] = viewerParams.controls.target.x;
		viewerParams.parts.options.center[1] = viewerParams.controls.target.y;
		viewerParams.parts.options.center[2] = viewerParams.controls.target.z;
	} 	

	// store the current camera rotation
	viewerParams.parts.options.cameraRotation = [0,0,0]
	viewerParams.parts.options.cameraRotation[0] = viewerParams.camera.rotation.x;
	viewerParams.parts.options.cameraRotation[1] = viewerParams.camera.rotation.y;
	viewerParams.parts.options.cameraRotation[2] = viewerParams.camera.rotation.z;

	// store the current camera up vector
	viewerParams.parts.options.cameraUp = [0,0,0]
	viewerParams.parts.options.cameraUp[0] = viewerParams.camera.up.x;
	viewerParams.parts.options.cameraUp[1] = viewerParams.camera.up.y;
	viewerParams.parts.options.cameraUp[2] = viewerParams.camera.up.z;

	viewerParams.parts.options.useTrackball = viewerParams.useTrackball;

}

//turn on/off velocity vectors
function checkVelBox(args){
	var p = args[0];
	var checked = args[1];
	viewerParams.showVel[p] = false;
	if (checked){
		viewerParams.showVel[p] = true;
	}
}

//turn on/off velocity animation
function toggleVelocityAnimation(args){
	var p = args[0];
	var checked = args[1];
	viewerParams.animateVel[p] = false;
	if (checked){
		viewerParams.animateVel[p] = true;
	}
}

//turn on/off velocity gradient
function toggleVelocityGradient(args){
	var p = args[0];
	var checked = args[1];
	viewerParams.velGradient[p] = 0;
	if (checked){
		viewerParams.velGradient[p] = 1;
	}
}


function changeBlendingForColormap(args){
	var pkey_to_colormap = args[0];
	var checked = args[1];

	// update the blending mode for all particles
	//  (otherwise non-colormapped particles will blend with colormapped particles)
	viewerParams.partsKeys.forEach(function (p,i){

		if ( viewerParams.showColormap[p]){
			viewerParams.blendingMode[p] = 'normal';
			viewerParams.depthWrite[p] = true;
			viewerParams.depthTest[p] = true;
		}
		else {
			// update the blending mode for the whole particle group (kind of wasteful)
			viewerParams.blendingMode[p] = 'additive';
			viewerParams.depthWrite[p] = false;
			viewerParams.depthTest[p] = false;
		}
	})
}

//turn on/off the invert filter option
function checkInvertFilterBox(args){
	var p = args[0];
	var fk = args[1];
	var checked = args[2];

	viewerParams.invertFilter[p][fk] = false;
	if (checked){
		viewerParams.invertFilter[p][fk] = true;
	}
	viewerParams.updateFilter[p] = true;
}

//change the color of particles
function checkColor(args){
	var p = args[0];
	var rgb = args[1];
	viewerParams.Pcolors[p] = [rgb.r/255., rgb.g/255., rgb.b/255., rgb.a];
	//update the octree loading bar if it exists
	if (viewerParams.haveOctree[p]){
		d3.select('#' + p + 'octreeLoadingFill').attr('fill','rgb(' + (255*viewerParams.Pcolors[p][0]) + ',' + (255*viewerParams.Pcolors[p][1]) + ',' + (255*viewerParams.Pcolors[p][2]) + ')')
		d3.select('#' + p + 'octreeLoadingText').attr('fill','rgb(' + (255*viewerParams.Pcolors[p][0]) + ',' + (255*viewerParams.Pcolors[p][1]) + ',' + (255*viewerParams.Pcolors[p][2]) + ')')
	}
}

//function to check which types to plot
function checkshowParts(args){
	var p = args[0];
	var checked = args[1];
	
	viewerParams.showParts[p] = checked;
	viewerParams.updateOnOff[p] = true;
}

//check for stereo separation
function checkStereoLock(checked){
	console.log('stereo', checked)
	if (checked) {
		viewerParams.normalRenderer = viewerParams.renderer;
		viewerParams.renderer = viewerParams.effect;
		viewerParams.useStereo = true;
	} else {
		viewerParams.renderer = viewerParams.normalRenderer;
		viewerParams.renderer.setSize(window.innerWidth, window.innerHeight);
		viewerParams.useStereo = false;
	}
}

//set values based on various text box entries
function checkText(args){
	var id = args[0];
	var value = args[1];
	var p = null;
	if (args.length > 2) p = args[2];

	var cameraPosition = new THREE.Vector3(viewerParams.camera.position.x, viewerParams.camera.position.y, viewerParams.camera.position.z);
	var cameraRotation = new THREE.Vector3(viewerParams.camera.rotation.x, viewerParams.camera.rotation.y, viewerParams.camera.rotation.z);

	if (id == "CenterXText") viewerParams.center.x = parseFloat(value);
	else if (id == "CenterYText") viewerParams.center.y = parseFloat(value);
	else if (id == "CenterZText") viewerParams.center.z = parseFloat(value);
	else if (id == "CameraXText") cameraPosition.x = parseFloat(value) - viewerParams.center.x;
	else if (id == "CameraYText") cameraPosition.y = parseFloat(value) - viewerParams.center.y
	else if (id == "CameraZText") cameraPosition.z = parseFloat(value) - viewerParams.center.z;
	else if (id == "RotXText") cameraRotation.x = parseFloat(value)
	else if (id == "RotYText") cameraRotation.y = parseFloat(value)
	else if (id == "RotZText") cameraRotation.z = parseFloat(value)
	else if (id == "RenderXText") viewerParams.renderWidth = parseInt(value);
	else if (id == "RenderYText") viewerParams.renderHeight = parseInt(value);
	else if (id == "VideoCapture_duration") viewerParams.VideoCapture_duration = parseFloat(value);
	else if (id == "VideoCapture_FPS") viewerParams.VideoCapture_FPS = parseInt(value);
	else if (id == "VideoCapture_format") viewerParams.VideoCapture_format = parseInt(value);
	else if (id == "VideoCapture_filename") viewerParams.VideoCapture_filename = value;
	else console.log(id,'not recognized in applyUISelections.js:checkText');

	if (p){
		if (id == p+'velAnimateDt') {
			viewerParams.animateVelDt = Math.max(0,parseFloat(value));
			d3.selectAll('.velAnimateDt').each(function(){
				this.value = viewerParams.animateVelDt;
			})
		}
		if (id == p+'velAnimateTmax') {
			viewerParams.animateVelTmax = Math.max(1,parseFloat(value));
			d3.selectAll('.velAnimateTmax').each(function(){
				this.value = viewerParams.animateVelTmax;
			})
		}
	}

	if (!p){
		viewerParams.camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
		//console.log('===here camera', cameraRotation);
		viewerParams.camera.rotation.set(cameraRotation.x, cameraRotation.y, cameraRotation.z);
		viewerParams.controls.target = new THREE.Vector3(viewerParams.center.x, viewerParams.center.y, viewerParams.center.z);
	}
}

function updateVelocityVectorWidth(args){
	//update the width of the velocity vector
	var value = args[0];
	var p = args[1];
	viewerParams.velVectorWidth[p] = parseFloat(value);
}

//save the image to a file
function saveFile(strData, filename) {
	var link = document.createElement('a');
	if (typeof link.download === 'string') {
		document.body.appendChild(link); //Firefox requires the link to be in the body
		link.download = filename;
		link.href = strData;
		link.click();
		document.body.removeChild(link); //remove the link when done
	} else {
		console.log("can't save file");
		return;
		//location.replace(uri);
	}

}

//render the image
function renderImage() {  
//https://stackoverflow.com/questions/26193702/three-js-how-can-i-make-a-2d-snapshot-of-a-scene-as-a-jpg-image   
//this sometimes breaks in Chrome when rendering takes too long
//best to use Firefox to render images  
	var imgData, imgNode;
	var strDownloadMime = "image/octet-stream";
	// can't use viewerParams.VideoCapture_formats b.c. it needs jpEg not jpg
	var screenWidth = window.innerWidth;
	var screenHeight = window.innerHeight;
	var aspect = screenWidth / screenHeight;

	viewerParams.imageCaptureClicked = true;


	try {
		//resize
		console.log('capturing image', viewerParams.renderWidth, viewerParams.renderHeight)
		viewerParams.renderer.setSize(viewerParams.renderWidth, viewerParams.renderHeight);
		viewerParams.camera.aspect = viewerParams.renderWidth / viewerParams.renderHeight;
		viewerParams.camera.updateProjectionMatrix();
		if (viewerParams.columnDensity){
			viewerParams.renderer.render( viewerParams.sceneCD, viewerParams.cameraCD );
		} else {
			viewerParams.renderer.render( viewerParams.scene, viewerParams.camera );
		}

		//save image
		var extension = viewerParams.VideoCapture_formats[viewerParams.VideoCapture_format]
		if (extension == '.jpg'){
			var strMime = "image/jpeg"
			imgData = viewerParams.renderer.domElement.toDataURL(strMime,1.0);
		}
		// gif is not supported so we have to cheat a bit
		else if (extension == '.gif'){
			recordVideo(1, 1);
			return
		}
		else {
			var strMime = "image/png"
			imgData = viewerParams.renderer.domElement.toDataURL(strMime)
		}

		var fname = viewerParams.VideoCapture_filename + extension;
		saveFile(imgData.replace(strMime, strDownloadMime),fname);


		//back to original size
		viewerParams.renderer.setSize(screenWidth, screenHeight);
		viewerParams.camera.aspect = aspect;
		viewerParams.camera.updateProjectionMatrix();


	} catch (e) {
		console.log(e);
		return;
	}


}

function recordVideo(fps = null, duration = null){

	if (!fps) fps = viewerParams.VideoCapture_FPS;
	if (!duration) duration = viewerParams.VideoCapture_duration;

	viewerParams.captureCanvas = true;
	viewerParams.capturer = new CCapture( { 
		format: viewerParams.VideoCapture_formats[viewerParams.VideoCapture_format].slice(1), 
		workersPath: 'static/lib/CCapture/',
		framerate: fps,
		name: viewerParams.VideoCapture_filename,
		timeLimit: duration,
		autoSaveTime: duration,
		verbose: true,
	} );

	viewerParams.capturer.start()

}

function isPrimitive(test) {
	return test !== Object(test);
}
function copyValue(a){
	if (isPrimitive(a)) {
		return a;
	} else {
		return JSON.parse(JSON.stringify(a));
	}
}

function createPreset(){
	var preset = {};
	if (viewerParams.useTrackball){
		preset.center = copyValue([viewerParams.controls.target.x, viewerParams.controls.target.y, viewerParams.controls.target.z]);
	} else {
		var xx = new THREE.Vector3(0,0,0);
		viewerParams.camera.getWorldDirection(xx);
		preset.center = copyValue([xx.x + viewerParams.camera.position.x, xx.y + viewerParams.camera.position.y, xx.z + viewerParams.camera.position.z]);
	}

	preset.zmin = copyValue(viewerParams.zmin);
	preset.zmax = copyValue(viewerParams.zmax);

	preset.camera = copyValue([viewerParams.camera.position.x, viewerParams.camera.position.y, viewerParams.camera.position.z]);
	preset.cameraRotation = copyValue([viewerParams.camera.rotation.x, viewerParams.camera.rotation.y, viewerParams.camera.rotation.z]);
	preset.cameraUp = copyValue([viewerParams.camera.up.x, viewerParams.camera.up.y, viewerParams.camera.up.z]);
	preset.quaternion = copyValue([viewerParams.camera.quaternion.w,viewerParams.camera.quaternion.x, viewerParams.camera.quaternion.y, viewerParams.camera.quaternion.z]);

	preset.startFly = copyValue(!viewerParams.useTrackball);
	preset.startVR = copyValue(viewerParams.allowVRControls);
	preset.startColumnDensity = copyValue(viewerParams.columnDensity);
	preset.startTween = copyValue(viewerParams.updateTween);

	preset.friction = copyValue(viewerParams.friction);
	preset.stereo = copyValue(viewerParams.useStereo);
	preset.stereoSep = copyValue(viewerParams.stereoSep);

	preset.decimate = copyValue(viewerParams.decimate);
	preset.maxVrange = copyValue(viewerParams.maxVrange);
	preset.minPointScale = copyValue(viewerParams.minPointScale);
	preset.maxPointScale = copyValue(viewerParams.maxPointScale);

	elm = document.getElementById('annotate_container');
	if (elm.style.display == 'block') preset.annotation = elm.innerHTML;

	// flag to show fps in top right corner
	preset.showFPS = copyValue(viewerParams.showFPS);
	preset.showMemoryUsage = copyValue(viewerParams.showMemoryUsage);

	// change the memory limit for octrees, in bytes
	preset.memoryLimit = copyValue(viewerParams.memoryLimit);

	//for the UI
	preset.GUIExcludeList = copyValue(viewerParams.GUIExcludeList)
	preset.collapseGUIAtStart = copyValue(viewerParams.collapseGUIAtStart)


	//particle specific options
	preset.UIparticle = {};
	preset.UIdropdown = {};
	preset.UIcolorPicker = {};

	preset.showParts = {};
	preset.sizeMult = {};
	preset.color = {};
	preset.plotNmax = {};

	preset.showVel = {};
	preset.velType = {};
	preset.velVectorWidth = {};
	preset.velGradient = {};
	preset.animateVel = {};
	preset.animateVelDt = {};
	preset.animateVelTmax = {};

	preset.filterLims = {};
	preset.filterVals = {};
	preset.invertFilter = {};

	preset.colormapLims = {};
	preset.colormapVals = {};
	preset.showColormap = {};
	preset.colormap = {};
	preset.colormapVariable = {};
	preset.blendingMode = {};
	preset.depthTest = {};

	preset.radiusVariable = {};

	for (var i=0; i<viewerParams.partsKeys.length; i++){
		var p = copyValue(viewerParams.partsKeys[i]);

		preset.showParts[p] = copyValue(viewerParams.showParts[p]);
		preset.sizeMult[p] = copyValue(viewerParams.PsizeMult[p]);
		preset.color[p] = copyValue(viewerParams.Pcolors[p]);
		preset.plotNmax[p] = copyValue(viewerParams.plotNmax[p]);

		preset.showVel[p] = copyValue(viewerParams.showVel[p]);
		preset.velType[p] = copyValue(viewerParams.velType[p]);
		preset.velVectorWidth[p] = copyValue(viewerParams.velVectorWidth[p]);
		preset.velGradient[p] = copyValue(viewerParams.velGradient[p]);
		preset.animateVel[p] = copyValue(viewerParams.animateVel[p]);
		preset.animateVelDt[p] = copyValue(viewerParams.animateVelDt[p]);
		preset.animateVelTmax[p] = copyValue(viewerParams.animateVelTmax[p]);

		preset.filterLims[p] = {};
		preset.filterVals[p] = {};
		preset.invertFilter[p] = {};
		for (k=0; k<viewerParams.fkeys[p].length; k++){
			var fkey = copyValue(viewerParams.fkeys[p][k]);
			preset.filterLims[p][fkey] = copyValue(viewerParams.filterLims[p][fkey]);
			preset.filterVals[p][fkey] = copyValue(viewerParams.filterVals[p][fkey]);
			preset.invertFilter[p][fkey] = copyValue(viewerParams.invertFilter[p][fkey]);
		}

		preset.colormapLims[p] = {};
		preset.colormapVals[p] = {};
		for (k=0; k<viewerParams.ckeys[p].length; k++){
			var ckey = copyValue(viewerParams.ckeys[p][k]);
			preset.colormapLims[p][ckey] = copyValue(viewerParams.colormapLims[p][ckey]);
			preset.colormapVals[p][ckey] = copyValue(viewerParams.colormapVals[p][ckey]);
		}
		preset.showColormap[p] = copyValue(viewerParams.showColormap[p]);
		preset.colormap[p] = copyValue(viewerParams.colormap[p]);
		preset.colormapVariable[p] = copyValue(viewerParams.colormapVariable[p]);	

		preset.blendingMode[p] = copyValue(viewerParams.blendingMode[p]);	
		preset.depthTest[p] = copyValue(viewerParams.depthTest[p]);	

		preset.radiusVariable[p] = copyValue(viewerParams.radiusVariable[p]);
	}// per particle options

	preset.loaded = true;
	return preset;

}

function savePreset(){
	var preset = createPreset();

	//https://stackoverflow.com/questions/33780271/export-a-json-object-to-a-text-file
	var str = JSON.stringify(preset)
	//Save the file contents as a DataURI
	var dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(str);

	saveFile(dataUri,'preset.json');

}

function updateFriction(value){
	if (viewerParams.useTrackball){
		viewerParams.controls.dynamicDampingFactor = value;
	} else {
		viewerParams.controls.movementSpeed = (1. - value)*viewerParams.flyffac;
	}
	viewerParams.friction = value;
}

function updateStereoSep(value){
	viewerParams.stereoSep = value;
	viewerParams.effect.setEyeSeparation(viewerParams.stereoSep);
}

function updateMemoryLimit(value){
	viewerParams.octree.memoryLimit = parseFloat(value*1e9);
	viewerParams.octree.NParticleMemoryModifierFac = 1.;
	viewerParams.octree.NParticleMemoryModifier = THREE.Math.clamp(viewerParams.octree.NParticleMemoryModifierFac*viewerParams.octree.memoryLimit/viewerParams.memoryUsage, 0., 1.);
	updateOctreeDecimationSpan();
}

function updateNormCameraDistance(vals){
	var value = vals[0];
	var p = vals[1];
	viewerParams.octree.normCameraDistance[p] = parseFloat(value);
}

function setBlendingMode(args){
	var mode = args[0];
	var p = args[1];

	viewerParams.blendingMode[p] = mode;
	var blend = viewerParams.blendingOpts[mode];

	viewerParams.partsMesh[p].forEach( function( m, j ) {
		m.material.depthWrite = viewerParams.depthWrite[p];
		m.material.depthTest = viewerParams.depthTest[p];
		m.material.blending = blend;
		m.material.uniforms.useDepth.value = +viewerParams.depthTest[p]
		m.material.needsUpdate = true;
	});
}

function setCDlognorm(args){
	var checked = args[0];
	viewerParams.CDlognorm = checked;
	viewerParams.materialCD.uniforms.lognorm.value = checked;
	// apparently it doesn't want me to set needsUpdate 
	//viewerParams.meterialCD.needsUpdate = true;
}

function toggleTween(args){

	checked = args[0];// ignore for now?

	if (viewerParams.inTween){
		viewerParams.updateTween = false
		viewerParams.inTween = false
	} else {
		viewerParams.updateTween = true	
		setTweenviewerParams();
	}
}

function setDepthMode(args){
	var p = args[0];
	var checked = args[1];

	// update the viewer params and rely on the render loop
	//  to apply them.
	viewerParams.depthWrite[p] = checked;
	viewerParams.depthTest[p] = checked;
}

function setRadiusVariable(args){
	var radiusVariable = args[0];
	var p = args[1];
	viewerParams.radiusVariable[p] = radiusVariable;
	viewerParams.updateRadiusVariable[p] = true;
	//console.log(radiusVariable)
}