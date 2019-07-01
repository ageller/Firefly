//////////////////////////////////////////////////
///// Functions to execute the GUI commands //////
//////////////////////////////////////////////////

//reset to the initial Options file
function resetToOptions(){
	console.log("Resetting to Default");
	viewerParams.parts.options = viewerParams.parts.options0;

	viewerParams.reset = true;
	viewerParams.ready = false;
	//reset all the parts specific values to the initial ones
	initPVals();

	initScene();

	//recreate the GUI
	viewerParams.waitForInit = setInterval(function(){ 
		if (viewerParams.ready){
			clearInterval(viewerParams.waitForInit);
			sendInitGUI();
		}
	}, 100);
	sendToGUI([{'makeUI':null}]);

	drawScene();
	viewerParams.reset = false;

}

//to load in a new data set
function loadNewData(){

	d3.select('#particleUI').html("");
	d3.select('.UIcontainer').html("");
	d3.select("#splashdivLoader").selectAll('svg').remove();
	d3.select("#splashdiv5").text("Loading...");
	console.log('here', viewerParams.dir, Object.keys(viewerParams.dir).length)
	if (Object.keys(viewerParams.dir).length > 1){
		showLoadingButton('#selectStartupButton');
	} else {
		showLoadingButton('#loadDataButton');
	}
	d3.select("#loader").style("display","visible");
	viewerParams.loadfrac = 0.;
	showSplash();

	viewerParams.loaded = false;
	viewerParams.pauseAnimation = true;

	document.getElementById("inputFilenames").click();
}



//reset to a preset file
function resetToPreset(preset){
	console.log("Resetting to Preset");
	viewerParams.parts.options = preset;

	viewerParams.reset = true;
	viewerParams.ready = false;
	//reset all the parts specific values to the initial ones
	initPVals();

	initScene();

	//recreate the GUI
	viewerParams.waitForInit = setInterval(function(){ 
		if (viewerParams.ready){
			clearInterval(viewerParams.waitForInit);
			sendInitGUI();
		}
	}, 100);
	sendToGUI([{'makeUI':null}]);

	drawScene();
	viewerParams.reset = false;

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
//NOTE: if the cameraRotation is set, then the controls become fly controls
function resetCamera() {

	var screenWidth = window.innerWidth;
	var screenHeight = window.innerHeight;
	var aspect = screenWidth / screenHeight;
	viewerParams.camera = new THREE.PerspectiveCamera( viewerParams.fov, aspect, viewerParams.zmin, viewerParams.zmax);
	viewerParams.camera.up.set(0, -1, 0);
	viewerParams.scene.add(viewerParams.camera); 

	setCenter(viewerParams.parts[viewerParams.partsKeys[0]].Coordinates);
	viewerParams.camera.position.set(viewerParams.center.x, viewerParams.center.y, viewerParams.center.z - viewerParams.boxSize/2.);
	viewerParams.camera.lookAt(viewerParams.scene.position);  

	//change the center?
	if (viewerParams.parts.options.hasOwnProperty('center')){
		if (viewerParams.parts.options.center != null){
			viewerParams.center = new THREE.Vector3(viewerParams.parts.options.center[0], viewerParams.parts.options.center[1], viewerParams.parts.options.center[2]);
			setBoxSize(viewerParams.parts[viewerParams.partsKeys[0]].Coordinates);
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
			viewerParams.useTrackball = false;
			viewerParams.camera.rotation.set(viewerParams.parts.options.cameraRotation[0], viewerParams.parts.options.cameraRotation[1], viewerParams.parts.options.cameraRotation[2]);
		}
	}


	viewerParams.controls.dispose();
	initControls();


}

//reset the camera center.  Can be useful when switching back and forth between trackball and fly controls
function recenterCamera() {
	initControls();
}


//replace the current camera settings in options with the current camera position and rotation (to return here upon clicking reset)
//NOTE: with a reset, this will set the controls to fly controls
function saveCamera() {

	if (viewerParams.parts.options.hasOwnProperty('camera')){
		if (viewerParams.parts.options.camera == null){
			viewerParams.parts.options.camera = [0,0,0];
		}
	} else {
		viewerParams.parts.options.camera = [0,0,0];
	}
	viewerParams.parts.options.camera[0] = viewerParams.camera.position.x;
	viewerParams.parts.options.camera[1] = viewerParams.camera.position.y;
	viewerParams.parts.options.camera[2] = viewerParams.camera.position.z;


	if (viewerParams.parts.options.hasOwnProperty('center')){
		if (viewerParams.parts.options.center == null){
			viewerParams.parts.options.center = [0,0,0];
		}
	} else {
		viewerParams.parts.options.center = [0,0,0];
	}

	if (viewerParams.useTrackball){
		viewerParams.parts.options.center[0] = viewerParams.controls.target.x;
		viewerParams.parts.options.center[1] = viewerParams.controls.target.y;
		viewerParams.parts.options.center[2] = viewerParams.controls.target.z;
	} 

	if (viewerParams.parts.options.hasOwnProperty('cameraRotation')){
		if (viewerParams.parts.options.cameraRotation != null){
			viewerParams.parts.options.cameraRotation[0] = viewerParams.camera.rotation.x;
			viewerParams.parts.options.cameraRotation[1] = viewerParams.camera.rotation.y;
			viewerParams.parts.options.cameraRotation[2] = viewerParams.camera.rotation.z;
		}
	}
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

//turn on/off the colormap
function checkColormapBox(args){
	var p = args[0];
	var checked = args[1];
	var forGUI = []; 
	viewerParams.showColormap[p] = false;
	if (checked){
		viewerParams.showColormap[p] = true;
		viewerParams.updateColormap[p] = true;
		viewerParams.updateFilter[p] = true;
		forGUI.push({'fillColorbarContainer':p})

		// redraw particle type (this may not be necessary if I'm smarter about initializing things)
		drawScene(pDraw = [p]);
	}

	forGUI.unshift({'setGUIParamByKey':[viewerParams.showColormap, "showColormap"]})
	sendToGUI(forGUI);
	console.log(p, " showColormap:", viewerParams.showColormap[p])

	// redraw particle type (this seems necessary to enable the correct blending)
	drawScene(pDraw = [p]);


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

//turn on/off playback
//this is probably broken
function checkPlaybackFilterBox(args){
	var p = args[0];
	var checked = args[1];
	// figure out which checkbox was checked by slicing the ID, clever move Aaron!
	this_label = document.getElementById(p+'_PlaybackLabel');

	//reset the text/appstate to default values
	this_label.innerText = "Playback: "
	viewerParams.parts[p]["playbackEnabled"]=false;
	viewerParams.updateFilter[p]=false;
	viewerParams.parts[p]['playbackTicks']=0;
	if (box.checked){
		// read which fkey is currently shown 
		this_label = document.getElementById(p+'_PlaybackLabel');
		// update the playback text in the UI
		this_label.innerText += " " + viewerParams.parts[p]['currentlyShownFilter']//"under development"//

		//flag that we should run playback
		viewerParams.parts[p]["playbackEnabled"]=true;
		viewerParams.updateFilter[p]=true;
		viewerParams.parts[p]['playbackFilter']=viewerParams.parts[p][['currentlyShownFilter']]
		console.log(viewerParams.parts[p]['playbackFilter'])
	}
}

//change the color of particles
function checkColor(args){
	var p = args[0];
	var rgb = args[1];
	viewerParams.Pcolors[p] = [rgb.r/255., rgb.g/255., rgb.b/255., rgb.a];
}

//function to check which types to plot
function checkshowParts(args){
	var p = args[0];
	var checked = args[1];
	
	viewerParams.updateOnOff[p] = true;
	viewerParams.updateFilter[p] = true;
	viewerParams.showParts[p] = false;
	if (checked){
		viewerParams.showParts[p] = true;
	}
}

//check for stereo separation
function checkStereoLock(checked){
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
function checkText(input){

	if (input.id == "CenterXText") viewerParams.center.x = parseFloat(input.value);
	if (input.id == "CenterYText") viewerParams.center.y = parseFloat(input.value);
	if (input.id == "CenterZText") viewerParams.center.z = parseFloat(input.value);
	if (input.id == "CameraXText") viewerParams.camera.position.x = parseFloat(input.value) - viewerParams.center.x;
	if (input.id == "CameraYText") viewerParams.camera.position.y = parseFloat(input.value) - viewerParams.center.y
	if (input.id == "CameraZText") viewerParams.camera.position.z = parseFloat(input.value) - viewerParams.center.z;
	if (input.id == "RotXText") viewerParams.camera.rotation.x = parseFloat(input.value)
	if (input.id == "RotYText") viewerParams.camera.rotation.y = parseFloat(input.value)
	if (input.id == "RotZText") viewerParams.camera.rotation.z = parseFloat(input.value)
	if (input.id == "RenderXText") viewerParams.renderWidth = parseInt(input.value);
	if (input.id == "RenderYText") viewerParams.renderHeight = parseInt(input.value);

}


//apply the options file to the UI
function applyUIoptions(){
// now check if we need to hide any of this
	if (viewerParams.parts.options.hasOwnProperty('UI')){
		if (!viewerParams.parts.options.UI){
			d3.select('.UIcontainer').style('display','none');
		}
	}
	if (viewerParams.parts.options.hasOwnProperty('UIfullscreen')){
		if (!viewerParams.parts.options.UIfullscreen){
			d3.select('#fullScreenDiv').style('display','none');
		}
	}
	if (viewerParams.parts.options.hasOwnProperty('UIsnapshot')){
		if (!viewerParams.parts.options.UIsnapshot){
			d3.select('#snapshotDiv').style('display','none');
		}
	}
	if (viewerParams.parts.options.hasOwnProperty('UIreset')){
		if (!viewerParams.parts.options.UIreset){
			d3.select('#resetDiv').style('display','none');
		}
	}
	if (viewerParams.parts.options.hasOwnProperty('UIsavePreset')){
		if (!viewerParams.parts.options.UIsavePreset){
			d3.select('#savePresetDiv').style('display','none');
		}
	}
	if (viewerParams.parts.options.hasOwnProperty('UIloadNewData')){
		if (!viewerParams.parts.options.UIloadNewData){
			d3.select('#loadNewDataDiv').style('display','none');
		}
	}
	if (viewerParams.parts.options.hasOwnProperty('UIcameraControls')){
		if (!viewerParams.parts.options.UIcameraControls){
			d3.select('#cameraControlsDiv').style('display','none');
		}
	}
	if (viewerParams.parts.options.hasOwnProperty('UIdecimation')){
		if (!viewerParams.parts.options.UIdecimation){
			d3.select('#decimationDiv').style('display','none');
		}
	}	
	if (viewerParams.parts.options.hasOwnProperty('UIparticle')){
		for (i=0; i<viewerParams.partsKeys.length; i++){
			d = viewerParams.partsKeys[i];    	
			if (viewerParams.parts.options.UIparticle.hasOwnProperty(d)){
				if (!viewerParams.parts.options.UIparticle[d]){
					d3.selectAll('div.'+d+'Div').style('display','none');
				}
			}
		}
	}


	//particle specific options
	for (var i=0; i<viewerParams.partsKeys.length; i++){
		var p = viewerParams.partsKeys[i];

		//filter values
		if (viewerParams.parts.options.hasOwnProperty("filterVals")){
			if (viewerParams.parts.options.filterVals != null){
				if (viewerParams.parts.options.filterVals.hasOwnProperty(p)){
					if (viewerParams.parts.options.filterVals[p] != null){
						//because we are now redrawing each time, we do not need to do this
						viewerParams.updateFilter[p] = true

						for (k=0; k<viewerParams.fkeys[p].length; k++){
							var fkey = viewerParams.fkeys[p][k]
							if (viewerParams.parts.options.filterVals[p].hasOwnProperty(fkey)){
								if (viewerParams.parts.options.filterVals[p][fkey] != null){
									viewerParams.SliderF[p][fkey].noUiSlider.set(viewerParams.parts.options.filterVals[p][fkey]);
								}
							}
						}

					}
				}
			}
		}
	}
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
	var strMime = "image/png";
	var screenWidth = window.innerWidth;
	var screenHeight = window.innerHeight;
	var aspect = screenWidth / screenHeight;




	try {
		//resize
		console.log('capturing image', viewerParams.renderWidth, viewerParams.renderHeight)
		viewerParams.renderer.setSize(viewerParams.renderWidth, viewerParams.renderHeight);
		viewerParams.camera.aspect = viewerParams.renderWidth / viewerParams.renderHeight;
		viewerParams.camera.updateProjectionMatrix();
		viewerParams.renderer.render( viewerParams.scene, viewerParams.camera );

		//save image
		imgData = viewerParams.renderer.domElement.toDataURL(strMime);

		saveFile(imgData.replace(strMime, strDownloadMime), "image.png");


		//back to original size
		viewerParams.renderer.setSize(screenWidth, screenHeight);
		viewerParams.camera.aspect = aspect;
		viewerParams.camera.updateProjectionMatrix();
		viewerParams.renderer.render( viewerParams.scene, viewerParams.camera );

	} catch (e) {
		console.log(e);
		return;
	}


}


function createPreset(){
	var preset = {};
	if (viewerParams.useTrackball){
		preset.center = [viewerParams.controls.target.x, viewerParams.controls.target.y, viewerParams.controls.target.z];
	} else {
		var xx = new THREE.Vector3(0,0,0);
		viewerParams.camera.getWorldDirection(xx);
		preset.center = [xx.x + viewerParams.camera.position.x, xx.y + viewerParams.camera.position.y, xx.z + viewerParams.camera.position.z];
	}
	preset.camera = [viewerParams.camera.position.x, viewerParams.camera.position.y, viewerParams.camera.position.z];
	preset.startFly = !viewerParams.useTrackball;
	if (viewerParams.parts.options.hasOwnProperty('cameraRotation')){
		if (viewerParams.parts.options.cameraRotation != null){
			preset.cameraRotation = [viewerParams.camera.rotation.x, viewerParams.camera.rotation.y, viewerParams.camera.rotation.z];
		}
	}
	preset.friction = viewerParams.friction;
	preset.stereo = viewerParams.useStereo;
	preset.stereoSep = viewerParams.stereoSep;
	preset.decimate = viewerParams.decimate;
	preset.maxVrange = viewerParams.maxVrange;

	//for the UI
	preset.UI = viewerParams.parts.options.UI;
	preset.UIfullscreen = viewerParams.parts.options.UIfullscreen;
	preset.UIsnapshot = viewerParams.parts.options.UIsnapshot;
	preset.UIreset = viewerParams.parts.options.UIreset;
	preset.UIsavePreset = viewerParams.parts.options.UIsavePreset;
	preset.UIloadNewData = viewerParams.parts.options.UIloadNewData;
	preset.UIcameraControls = viewerParams.parts.options.UIcameraControls;
	preset.UIdecimation = viewerParams.parts.options.UIdecimation;


	//particle specific options
	preset.showParts = {};
	preset.sizeMult = {};
	preset.color = {};
	preset.plotNmax = {};
	preset.showVel = {};
	preset.velType = {};
	preset.filterLims = {};
	preset.filterVals = {};
	preset.colormapLims = {};
	preset.colormapVals = {};
	preset.UIparticle = {};
	preset.UIdropdown = {};
	preset.UIcolorPicker = {};
	preset.showColormap = {};
	preset.colormap = {};
	preset.colormapVariable = {};
	for (var i=0; i<viewerParams.partsKeys.length; i++){
		var p = viewerParams.partsKeys[i];

		preset.showParts[p] = viewerParams.showParts[p];
		preset.sizeMult[p] = viewerParams.PsizeMult[p];
		preset.color[p] = viewerParams.Pcolors[p];
		preset.plotNmax[p] = viewerParams.plotNmax[p];
		preset.showVel[p] = viewerParams.showVel[p];
		preset.velType[p] = viewerParams.velType[p];
		preset.showColormap[p] = viewerParams.showColormap[p];
		preset.colormap[p] = viewerParams.colormap[p];
		preset.colormapVariable[p] = viewerParams.colormapVariable[p];	

		preset.UIparticle[p] = viewerParams.parts.options.UIparticle[p];
		preset.UIdropdown[p] = viewerParams.parts.options.UIdropdown[p];
		preset.UIcolorPicker[p] = viewerParams.parts.options.UIcolorPicker[p];
		preset.filterLims[p] = {};
		preset.filterVals[p] = {};
		preset.colormapLims[p] = {};
		preset.colormapVals[p] = {};
		for (k=0; k<viewerParams.fkeys[p].length; k++){
			var fkey = viewerParams.fkeys[p][k]
			preset.filterLims[p][fkey] = viewerParams.filterLims[p][fkey];
			preset.filterVals[p][fkey] = viewerParams.filterVals[p][fkey];
		}
		for (k=0; k<viewerParams.ckeys[p].length; k++){
			var ckey = viewerParams.ckeys[p][k]
			preset.colormapLims[p][ckey] = viewerParams.colormapLims[p][ckey];
			preset.colormapVals[p][ckey] = viewerParams.colormapVals[p][ckey];
		}
	}

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
		viewerParams.controls.movementSpeed = 1. - Math.pow(value, viewerParams.flyffac);
	}
	viewerParams.friction = value;
}