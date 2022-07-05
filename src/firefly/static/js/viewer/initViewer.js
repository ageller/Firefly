/////////////////////
//// for sockets
/////////////////////
//https://blog.miguelgrinberg.com/post/easy-websockets-with-flask-and-gevent

//https://github.com/miguelgrinberg/Flask-SocketIO
function connectViewerSocket(){
	//$(document).ready(function() {
	document.addEventListener("DOMContentLoaded", function(event) { 
		// Event handler for new connections.
		// The callback function is invoked when a connection with the
		// server is established.
		socketParams.socket.on('connect', function() {
			socketParams.socket.emit('connection_test', {data: 'Viewer connected!'});
		});
		socketParams.socket.on('connection_response', function(msg) {
			console.log('connection response', msg);
		});     
		// Event handler for server sent data.
		// The callback function is invoked whenever the server emits data
		// to the client. The data is then displayed in the "Received"
		// section of the page.
		//updates from GUI
		socketParams.socket.on('update_viewerParams', function(msg) {
			setParams(msg);
		});

		socketParams.socket.on('show_loader', function(msg) {
			d3.select("#splashdivLoader").selectAll('svg').remove();
			d3.select("#splashdiv5").text("Loading particle data...");
			d3.select("#loader").style("display","visible");
			viewerParams.loaded = false;
			viewerParams.pauseAnimation = true;

			viewerParams.loadfrac = 0.;
			drawLoadingBar();

			showSplash();
		});

		socketParams.socket.on('input_data', function(msg) {
			//only tested for local (GUI + viewer in one window)
			console.log("======== have new data : ", Object.keys(msg));


			//first compile the data from multiple calls
			if ('status' in msg){
				if (msg.status == 'start') {
					var socketCheck = viewerParams.usingSocket;
					var localCheck = viewerParams.local;
					//in case it's already waiting, which will happen if loading an hdf5 file from the gui
					clearInterval(viewerParams.waitForInit);
					defineViewerParams();
					viewerParams.pauseAnimation = true;
					viewerParams.usingSocket = socketCheck; 
					viewerParams.local = localCheck; 

					viewerParams.newInternalData.data = {};
					viewerParams.newInternalData.len = msg.length;
					viewerParams.newInternalData.count = 0;
				}
				if (msg.status == 'data') {
					viewerParams.newInternalData.count += 1;
					//I will update the loading bar here, but I'm not sure what fraction of the time this should take (using 0.8 for now)
					viewerParams.loadfrac = (viewerParams.newInternalData.count/viewerParams.newInternalData.len)*0.8; 
					updateLoadingBar();
					Object.keys(msg).forEach(function(key,i){
						if (key != 'status'){
							viewerParams.newInternalData.data[key] = JSON.parse(msg[key]);
							if (key.includes('filenames.json')){
								viewerParams.filenames = JSON.parse(msg[key]);
							}
						}
					})
				}
				if (msg.status == 'done'){
					console.log('======== have all data', viewerParams.newInternalData, viewerParams.filenames);
					loadData(initInputData, prefix='', internalData=viewerParams.newInternalData.data, initialLoadFrac=viewerParams.loadfrac)
				}
			}

		});

		socketParams.socket.on('update_streamer', function(msg) {
			viewerParams.streamReady = true;
		});
		socketParams.socket.on('reload_viewer', function(msg) {
			console.log('!!! reloading viewer');
			location.reload();
		});
	});
}

function initInputData(){
	console.log('======== remaking gui and viewer')
	var forGUIprepend = [];
	forGUIprepend.push({'clearGUIinterval':null});
	forGUIprepend.push({'defineGUIParams':null});

	var forGUIappend = [];
	forGUIappend.push({'setGUIParamByKey':[viewerParams.usingSocket, "usingSocket"]});
	forGUIappend.push({'setGUIParamByKey':[viewerParams.local, "local"]});
	forGUIappend.push({'makeUI':viewerParams.local});

	//I think I need to wait a moment because sometimes this doesn't fire (?)
	setTimeout(function(){
		makeViewer(null, forGUIprepend, forGUIappend);
		WebGLStart();
	}, 1000);



}

//so that it can run locally also without using Flask
// note that if allowVRControls == true, then you do not want to start in stereo (the VR button will do the work)
function runLocal(useSockets=true, showGUI=true, allowVRControls=false, startStereo=false, pSize=null){
	d3.select("#splashdiv5").text("Loading particle data...");
	viewerParams.local = true;
	viewerParams.usingSocket = useSockets;
	forGUI = [];
	forGUI.push({'setGUIParamByKey':[viewerParams.usingSocket, "usingSocket"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.local, "local"]});
	sendToGUI(forGUI);

	viewerParams.initialStereo = startStereo;
	viewerParams.allowVRControls = allowVRControls;

	// it appears that in order for Firefly to start correctly, it must be initialized to non-stereo and trackbacl
	// I will re-initialize them to the proper values after the first render pass
	viewerParams.useTrackball = true;
	viewerParams.useStereo = false;

	//both of these start setIntervals to wait for the proper variables to be set
	makeViewer(pSize);
	if (showGUI) {
		makeUI(local=true);
	} else {
		d3.selectAll('.UIcontainer').classed('hidden', true)
	}
	
	//This will  load the data, and then start the WebGL rendering
	getFilenames(prefix = "static/");

}

//wait for all the input before loading
function makeViewer(pSize=null, prepend=[], append=[]){
	viewerParams.haveUI = false;
	viewerParams.ready = false; 
	console.log("Waiting for viewer init ...")
	clearInterval(viewerParams.waitForInit);
	viewerParams.waitForInit = setInterval(function(){ 
		var ready = confirmViewerInit();
		if (ready){
			console.log("Viewer ready.")
			clearInterval(viewerParams.waitForInit);
			viewerParams.ready = true;
			viewerParams.pauseAnimation = false;
			viewerParams.parts.options_initial = createPreset(); //this might break things if the presets don't work...
			//console.log("initial options", viewerParams.parts.options)

			//to test
			if (pSize) {
				viewerParams.PsizeMult.Gas = pSize;
				console.log('new Psize', pSize)
			}
			sendInitGUI(prepend=prepend, append=append);
		}
	}, 100);
}

//if startup.json exists, this is called first
function getFilenames(prefix=""){
	d3.json(prefix+viewerParams.startup,  function(dir) {
		//console.log(prefix, dir, viewerParams.startup, viewerParams)
		if (dir != null){
			var i = 0;
			viewerParams.dir = dir;
			if (Object.keys(viewerParams.dir).length > 1){
				i = null
				console.log("multiple file options in startup:", Object.keys(viewerParams.dir).length, viewerParams.dir);
				var forGUI = [];
				forGUI.push({'setGUIParamByKey':[viewerParams.dir, "dir"]});
				forGUI.push({'showLoadingButton':'#selectStartupButton'});
				forGUI.push({'selectFromStartup':prefix});
				sendToGUI(forGUI);
			} 
			if (i != null && i < Object.keys(viewerParams.dir).length){
				d3.json(prefix+viewerParams.dir[i] + "/filenames.json",  function(files) {
					if (files != null){
						callLoadData([files, prefix]);
					} else {
						sendToGUI([{'showLoadingButton':'#loadDataButton'}]);
						alert("Cannot load data. Please select another directory.");
					}
				});
			}
		} else {
			sendToGUI([{'showLoadingButton':'#loadDataButton'}]);
		}
	});
}

//once a data directory is identified, this will define the parameters, draw the loading bar and, load in the data
function callLoadData(args){
	var files = args[0];
	var prefix = "";
	if (args.length > 0) prefix = args[1];

	var dir = {};
	if (viewerParams.hasOwnProperty('dir')){
		dir = viewerParams.dir;
	}
	viewerParams.dir = dir;
	sendToGUI([{'setGUIParamByKey':[viewerParams.dir, "dir"]}]);

	drawLoadingBar();
	viewerParams.filenames = files;
	//console.log("loading new data", files)
	loadData(WebGLStart, prefix);
}

// launch the app control flow, >> ends in animate <<
function WebGLStart(){

	//reset the window title
	if (viewerParams.parts.hasOwnProperty('options')){
		if (viewerParams.parts.options.hasOwnProperty('title')){
			window.document.title = viewerParams.parts.options.title
		}
	}

	document.addEventListener('mousedown', handleMouseDown);

	//initialize various values for the parts dict from the input data file, 
	initPVals();

	initScene();
	
	initColumnDensity();

	//draw everything
	Promise.all([
		createPartsMesh(),
	]).then(function(){
		
		//begin the animation
		// keep track of runtime for crashing the app rather than the computer
		var currentTime = new Date();
		var seconds = currentTime.getTime()/1000;
		viewerParams.currentTime = seconds;

		viewerParams.pauseAnimation = false;
		animate();

	})



}

//initialize various values for the parts dict from the input data file, 
function initPVals(){

	for (var i=0; i<viewerParams.partsKeys.length; i++){
		var p = viewerParams.partsKeys[i];
		if (! viewerParams.reset){
			viewerParams.partsMesh[p] = [];
		}

		// store the name inside the dictionary
		viewerParams.parts[p].pkey = p;

		//misc
		if (!viewerParams.haveOctree[p]) viewerParams.plotNmax[p] = viewerParams.parts.count[p];
		viewerParams.PsizeMult[p] = 1.;
		viewerParams.showParts[p] = true;
		viewerParams.updateOnOff[p] = false;

		//filter
		viewerParams.updateFilter[p] = false;
		viewerParams.filterLims[p] = {};
		viewerParams.filterVals[p] = {};
		viewerParams.invertFilter[p] = {};
		viewerParams.fkeys[p] = [];

		//colormap
		viewerParams.ckeys[p] = [];
		viewerParams.colormapVariable[p] = 0;
		viewerParams.colormap[p] = 4/256;
		viewerParams.showColormap[p] = false;
		viewerParams.updateColormapVariable[p] = false;
		viewerParams.colormapVals[p] = {};
		viewerParams.colormapLims[p] = {};

		// radius scaling
		viewerParams.radiusVariable[p] = 0; // corresponds to "None"
		viewerParams.updateRadiusVariable[p] = false;
		viewerParams.rkeys[p] = [];

		//blending
		viewerParams.blendingMode[p] = 'additive';
		viewerParams.depthWrite[p] = false;
		viewerParams.depthTest[p] = false;

		//velocities
		viewerParams.showVel[p] = false;
		viewerParams.velVectorWidth[p] = 1.;
		viewerParams.velGradient[p] = 0.; //0 == false, 1 == true
		viewerParams.animateVel[p] = false;
		viewerParams.animateVelDt[p] = 0.;
		viewerParams.animateVelTmax[p] = 0.;
		if (viewerParams.parts[p].Velocities_flat != null){
			if (!viewerParams.reset){
				calcVelVals(viewerParams.parts[p]);
				if(!viewerParams.parts[p].hasOwnProperty("filterKeys")){
					viewerParams.parts[p].filterKeys = [];
				}
			 
			}
			viewerParams.velType[p] = 'line';
		}
		
		//filters
		//in case there are no filter possibilities (but will be overwritten below)
		viewerParams.fkeys[p] = ["None"];
		viewerParams.filterLims[p]["None"] = [0,1];
		viewerParams.filterVals[p]["None"] = [0,1]; 
		var haveCurrentFilter = true;
		if (viewerParams.parts[p].currentlyShownFilter == undefined) {
			viewerParams.parts[p].currentlyShownFilter = ["None"];
			haveCurrentFilter = false;
		}
		if (viewerParams.parts[p].hasOwnProperty("filterKeys")){
			viewerParams.fkeys[p] = viewerParams.parts[p].filterKeys;
			viewerParams.parts[p]['playbackTicks'] = 0;
			viewerParams.parts[p]['playbackTickRate'] = 10;   
			for (var k=0; k<viewerParams.fkeys[p].length; k++){
				// TODO we should consider removing this "feature"
				//  and just require users to pass in the mag velocity
				//  as its own field-- or also radius and do radius/speed
				//  flags or something
				//if (viewerParams.fkeys[p][k] == "Velocities"){
					//viewerParams.fkeys[p][k] = "magVelocities";
				//}
				var fkey = viewerParams.fkeys[p][k];
				//calculate limits for the filters
				if (viewerParams.parts[p][fkey] != null){
					var m = calcMinMax(p,fkey)
					viewerParams.filterLims[p][fkey] = [m.min, m.max];
					viewerParams.filterVals[p][fkey] = [m.min, m.max];
					viewerParams.invertFilter[p][fkey] = false;
					// set the currently shown filter for each part type at startup
					// so the first click isn't broken
					if (!haveCurrentFilter) {
						viewerParams.parts[p].currentlyShownFilter = fkey;
						haveCurrentFilter = true;
					}
				}
			}
		}
		//colormap
		//in case there are no colormap possibilities (but will be overwritten below)
		viewerParams.ckeys[p] = ["None"];
		viewerParams.colormapLims[p]["None"] = [0,1];
		viewerParams.colormapVals[p]["None"] = [0,1];
		if (viewerParams.parts[p].hasOwnProperty("colormapKeys")){
			if (viewerParams.parts[p].colormapKeys.length > 0){
				viewerParams.ckeys[p] = viewerParams.parts[p].colormapKeys;
				for (var k=0; k<viewerParams.ckeys[p].length; k++){
						// TODO we should consider removing this "feature"
						//  and just require users to pass in the mag velocity
						//  as its own field-- or also radius and do radius/speed
						//  flags or something
					//if (viewerParams.ckeys[p][k] == "Velocities"){
						//viewerParams.ckeys[p][k] = "magVelocities";
					//}
					var ckey = viewerParams.ckeys[p][k];
					viewerParams.colormapLims[p][ckey] = [0,1];
					viewerParams.colormapVals[p][ckey] = [0,1];
					if (viewerParams.parts[p][ckey] != null){
						//could probably take results from filter to save time, but will do this again to be safe
						var m = calcMinMax(p,ckey)
						viewerParams.colormapLims[p][ckey] = [m.min, m.max];
						viewerParams.colormapVals[p][ckey] = [m.min, m.max];
					}
////////////////////////////////////////////////////////////////////////                    
////////////// I am not sure where to put this <-- I don't think this is used anymore (?)
////////////////////////////////////////////////////////////////////////                    
					if (i == viewerParams.partsKeys.length - 1 && k == viewerParams.ckeys[p].length -1) viewerParams.ready = true;
////////////////////////////////////////////////////////////////////////                    
////////////////////////////////////////////////////////////////////////                    
				}
			}
		}
		// radius scaling
		// None for no radius scaling radius possibilities
		viewerParams.rkeys[p] = ["None"];
		if (viewerParams.parts[p].hasOwnProperty("radiusKeys") &&
			viewerParams.parts[p].radiusKeys.length > 0){
				viewerParams.rkeys[p] = viewerParams.rkeys[p].concat(viewerParams.parts[p].radiusKeys);
		}

		/*
		if (viewerParams.haveOctree[p]){
			// tell app we can scale by OctreeRadii
			viewerParams.rkeys[p].push('OctreeRadii')
			// we just pushed OctreeRadii to the end so we'll set it to the final value
			viewerParams.radiusVariable[p] = viewerParams.rkeys[p].length-1
			viewerParams.updateRadiusVariable[p] = true;
		}
		*/
	}
}

// size the window and optionally initialize stereo view
function initScene() {
	var screenWidth = window.innerWidth;
	var screenHeight = window.innerHeight;
	var aspect = screenWidth / screenHeight;

	viewerParams.renderWidth = window.innerWidth;
	viewerParams.renderHeight = window.innerHeight;

	if (viewerParams.reset){
		viewerParams.scene = null;
		viewerParams.camera = null;
		viewerParams.frustum = null;
	} else{

		 //keyboard
		viewerParams.keyboard = new KeyboardState();

		// renderer
		if ( Detector.webgl ) {
			viewerParams.renderer = new THREE.WebGLRenderer( {
				antialias:true,
				//preserveDrawingBuffer: true , //so that we can save the image
			} );

		} else {
			//Canvas Renderer has been removed, and I can't get the old version to work now
			//viewerParams.renderer = new THREE.CanvasRenderer(); 
			alert("Your browser does not support WebGL.  Therefore Firefly cannot run.  Please use a different browser.");

		}
		viewerParams.renderer.setSize(screenWidth, screenHeight);
		viewerParams.normalRenderer = viewerParams.renderer;

		d3.select('#WebGLContainer').selectAll("canvas").remove();

		viewerParams.container = document.getElementById('WebGLContainer');
		viewerParams.container.appendChild( viewerParams.renderer.domElement );

		//stereo
		viewerParams.effect = new THREE.StereoEffect( viewerParams.renderer );
		viewerParams.effect.setAspect(1.);
		viewerParams.effect.setEyeSeparation(viewerParams.stereoSep);

		// Wtarting with stereo seems to break things (e.g., I can't change particle sizes)
		//   but it works fine if I toggle stereo in the GUI.  I have no idea why this breaks.
		// So, I will switch to stereo if needed after the first render pass (?)
		// 
		// if (viewerParams.useStereo){
		// 	viewerParams.normalRenderer = viewerParams.renderer;
		// 	viewerParams.renderer = viewerParams.effect;
		// }
	}

	// scene
	viewerParams.scene = new THREE.Scene();     

	// camera
	viewerParams.camera = new THREE.PerspectiveCamera( viewerParams.fov, aspect, viewerParams.zmin, viewerParams.zmax);
	viewerParams.camera.up.set(0, -1, 0);
	viewerParams.scene.add(viewerParams.camera);  

	viewerParams.frustum = new THREE.Frustum();

	// events
	THREEx.WindowResize(viewerParams.renderer, viewerParams.camera);
	//THREEx.FullScreen.bindKey({ charCode : 'm'.charCodeAt(0) });

	//viewerParams.useTrackball = true;

	//console.log(viewerParams.parts.options);
	setCenter(viewerParams.parts[viewerParams.partsKeys[0]].Coordinates_flat);
	viewerParams.camera.position.set(viewerParams.center.x, viewerParams.center.y, viewerParams.center.z - viewerParams.boxSize/2.);
	viewerParams.camera.lookAt(viewerParams.scene.position);  

	//apply presets from the options file
	if (viewerParams.parts.hasOwnProperty('options')) applyOptions();

	// controls
	initControls();

	// add button to enable VR
	if (viewerParams.allowVRControls) {
		document.body.appendChild( VRButton.createButton( viewerParams.renderer ) );
		viewerParams.renderer.xr.enabled = true;
	}
	
	//investigating the minimum point size issue
	// console.log("context", viewerParams.renderer.context)
	// //maybe glDisable(GL_POINT_SMOOTH); would solve the point size issue?
	// //see also GL_POINT_SIZE_RANGE
	// var canvas = d3.select('canvas').node();
	// var gl = canvas.getContext('webgl');
	// console.log(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE), gl.getParameter(gl.POINT_SMOOTH));
}

// apply any settings from options file
function applyOptions(){

	var options = viewerParams.parts.options;

	var forGUI = [];

	//modify the minimum z to show particles at (avoid having particles up in your face)
	if (options.hasOwnProperty('zmin') && options.zmin != null) viewerParams.zmin = options.zmin;

	//modify the maximum z to show particles at (avoid having particles up way in the background)
	if (options.hasOwnProperty('zmax') && options.zmax != null) viewerParams.zmax = options.zmax;

	//initialize center
	if (options.hasOwnProperty('center')){
		if (options.center != null){
			viewerParams.center = new THREE.Vector3(options.center[0], options.center[1], options.center[2]);
			setBoxSize(viewerParams.parts[viewerParams.partsKeys[0]].Coordinates_flat); } 
		else options.center = [viewerParams.center.x, viewerParams.center.y, viewerParams.center.z]; } 
	else options.center = [viewerParams.center.x, viewerParams.center.y, viewerParams.center.z];

	//change location of camera
	if (options.hasOwnProperty('camera') &&
		options.camera != null) viewerParams.camera.position.set(
			options.camera[0],
			options.camera[1],
			options.camera[2]);

	//change the rotation of the camera 
	if (options.hasOwnProperty('cameraRotation') &&
		options.cameraRotation != null) viewerParams.camera.rotation.set(
			options.cameraRotation[0],
			options.cameraRotation[1],
			options.cameraRotation[2]);

	//change the up vector of the camera (required to get the rotation correct)
	if (options.hasOwnProperty('cameraUp') &&
		options.cameraUp != null) viewerParams.camera.up.set(
			options.cameraUp[0],
			options.cameraUp[1],
			options.cameraUp[2]);

	//check if we are starting in Fly controls
	if (options.hasOwnProperty('startFly') && options.startFly) viewerParams.useTrackball = false;

	//check if we are starting in VR controls
	if (options.hasOwnProperty('startVR') && options.startVR) viewerParams.allowVRControls = true;

	//check if we are starting in column density mode
	if (options.hasOwnProperty('startColumnDensity') && options.startColumnDensity) viewerParams.columnDensity = true;

	// flag to start in a tween loop
	if (options.hasOwnProperty('startTween') && options.startTween){
		viewerParams.updateTween = true	
		setTweenviewerParams();
	}

	//modify the initial friction
	if (options.hasOwnProperty('friction') && options.friction != null) viewerParams.friction = options.friction;

	//check if we are starting in Stereo
	if (options.hasOwnProperty('stereo') && options.stereo){
		viewerParams.normalRenderer = viewerParams.renderer;
		viewerParams.renderer = viewerParams.effect;
		viewerParams.useStereo = true;
		if (viewerParams.haveUI){
			var evalString = 'elm = document.getElementById("StereoCheckBox"); elm.checked = true; elm.value = true;'
			forGUI.push({'evalCommand':[evalString]})
	} 	}

	//modify the initial stereo separation
	if (options.hasOwnProperty('stereoSep') && options.stereoSep != null){
			viewerParams.stereoSep = options.stereoSep;
			viewerParams.effect.setEyeSeparation(viewerParams.stereoSep);
	}

	//modify the initial decimation
	if (options.hasOwnProperty('decimate') && options.decimate != null) viewerParams.decimate = options.decimate;
	
	//maximum range in calculating the length the velocity vectors
	if (options.hasOwnProperty("maxVrange") && options.maxVrange != null){
		viewerParams.maxVrange = options.maxVrange; //maximum dynamic range for length of velocity vectors
		for (var i=0; i<viewerParams.partsKeys.length; i++){
			var p = viewerParams.partsKeys[i];
			if (viewerParams.parts[p].Velocities_flat != null){
				calcVelVals(viewerParams.parts[p]);     
	} 	} 	}

	//modify the minimum point scale factor
	if (options.hasOwnProperty('minPointScale') && options.minPointScale != null) viewerParams.minPointScale = options.minPointScale;

	//modify the maximum point scale factor
	if (options.hasOwnProperty('maxPointScale') && options.maxPointScale != null) viewerParams.maxPointScale = options.maxPointScale;

    // add an annotation to the top if necessary
	if (options.hasOwnProperty('annotation') && options.annotation != null){
		elm = document.getElementById('annotate_container');
		elm.innerHTML=options.annotation;
		elm.style.display='block';
    }

	// flag to show fps in top right corner
	if (options.hasOwnProperty('showFPS') && options.showFPS != null) viewerParams.showFPS = options.showFPS;

	// flag to show memory usage in top right corner
	if (options.hasOwnProperty('showMemoryUsage') && options.showMemoryUsage != null) viewerParams.showMemoryUsage = options.showMemoryUsage;

	// change the memory limit for octrees, in bytes
	if (options.hasOwnProperty('memoryLimit') && options.memoryLimit != null) viewerParams.memoryLimit = options.memoryLimit;
	// flag to launch the app in a tween loop
	if (viewerParams.parts.options.hasOwnProperty('start_tween')){
		if (viewerParams.parts.options.start_tween){
			viewerParams.updateTween = true	
			setTweenviewerParams();
		}
	}

	//  --------- column density options ----------- 

	// flag to launch the app with the column density projection mode enabled
	if (viewerParams.parts.options.hasOwnProperty(viewerParams.CDkey)){
		if (viewerParams.parts.options.columnDensity != null){
			viewerParams.columnDensity = viewerParams.parts.options.columnDensity;
		}
	}

	// flag to renormalize column densities in logspace
	if (viewerParams.parts.options.hasOwnProperty('CDlognorm')){
		if (viewerParams.parts.options.CDlognorm != null){
			viewerParams.CDlognorm = viewerParams.parts.options.CDlognorm;
		}
	}

	// bottom of the column density renormalization
	if (viewerParams.parts.options.hasOwnProperty('CDmin')){
		if (viewerParams.parts.options.CDmin != null){
			viewerParams.CDmin = viewerParams.parts.options.CDmin;
		}
	}

	// top of the column density renormalization
	if (viewerParams.parts.options.hasOwnProperty('CDmax')){
		if (viewerParams.parts.options.CDmax != null){
			viewerParams.CDmax = viewerParams.parts.options.CDmax;
		}
	}	

	// disable GUI elements
	if (viewerParams.parts.options.hasOwnProperty('GUIExcludeList')){
		if (viewerParams.parts.options.GUIExcludeList != null){
			viewerParams.GUIExcludeList = viewerParams.parts.options.GUIExcludeList;
		}
	}

	if (viewerParams.parts.options.hasOwnProperty('collapseGUIAtStart')){
		if (viewerParams.parts.options.collapseGUIAtStart != null){
			viewerParams.collapseGUIAtStart = viewerParams.parts.options.collapseGUIAtStart;
		}
	}

	//particle specific options
	var options_keys = Object.keys(viewerParams.parts.options.showParts);
	for (var i=0; i<viewerParams.partsKeys.length; i++){
		var viewer_p = viewerParams.partsKeys[i];
		var p;
		for (j=0;j<options_keys.length;j++){
			if (removeSpecialChars(options_keys[j]) == viewer_p){
				p = options_keys[j];
				break;
			}
		}

		//on/off
		if (options.hasOwnProperty("showParts") && 
			options.showParts != null && 
			options.showParts.hasOwnProperty(p) && 
			options.showParts[p] != null) viewerParams.showParts[viewer_p] = options.showParts[p];

		//size
		if (options.hasOwnProperty("sizeMult") && 
			options.sizeMult != null && 
			options.sizeMult.hasOwnProperty(p) && 
			options.sizeMult[p] != null) viewerParams.PsizeMult[viewer_p] = options.sizeMult[p];

		//color
		if (options.hasOwnProperty("color") &&
			options.color != null &&
			options.color.hasOwnProperty(p) && 
			options.color[p] != null) viewerParams.Pcolors[viewer_p] = options.color[p];

		//maximum number of particles to plot
		if (options.hasOwnProperty("plotNmax") &&
			options.plotNmax != null &&
			options.plotNmax.hasOwnProperty(p) &&
			options.plotNmax[p] != null) viewerParams.plotNmax[viewer_p] = options.plotNmax[p];

		//start plotting the velocity vectors
		if (options.hasOwnProperty("showVel") && 
			options.showVel != null &&
			options.showVel.hasOwnProperty(p) &&
			options.showVel[p]){

			viewerParams.showVel[viewer_p] = true;
			if (viewerParams.haveUI){
				var evalString = 'elm = document.getElementById("'+p+'velCheckBox"); elm.checked = true; elm.value = true;'
				forGUI.push({'evalCommand':[evalString]})
		} 	}

		//type of velocity vectors
		if (options.hasOwnProperty("velType") &&
			options.velType != null &&
			options.velType.hasOwnProperty(p) && 
			options.velType[p] != null){
			// type guard the velocity lines, only allow valid values
			if (options.velType[p] == 'line' || options.velType[p] == 'arrow' || options.velType[p] == 'triangle'){
				viewerParams.velType[viewer_p] = options.velType[p];
		} 	}

		//velocity vector width
		if (options.hasOwnProperty("velVectorWidth") &&
			options.velVectorWidth != null &&
			options.velVectorWidth.hasOwnProperty(p) &&
			options.velVectorWidth[p] != null) viewerParams.velVectorWidth[viewer_p] = options.velVectorWidth[p]; 

		//velocity vector gradient
		if (options.hasOwnProperty("velGradient") && 
			options.velGradient != null && 
			options.velGradient.hasOwnProperty(p) &&
			options.velGradient[p] != null) viewerParams.velGradient[viewer_p] = +options.velGradient[p]; //convert from bool to int

		//start showing the velocity animation
		if (options.hasOwnProperty("animateVel") && 
			options.animateVel != null &&
			options.animateVel.hasOwnProperty(p) &&
			options.animateVel[p] != null){

			viewerParams.animateVel[viewer_p] = true;
			if (viewerParams.haveUI){
				var evalString = 'elm = document.getElementById("'+p+'velAnimateCheckBox"); elm.checked = true; elm.value = true;'
				forGUI.push({'evalCommand':[evalString]})
		} 	}

		//animate velocity dt
		if (options.hasOwnProperty("animateVelDt") &&
			options.animateVelDt != null &&
			options.animateVelDt.hasOwnProperty(p) &&
			options.animateVelDt[p] != null) viewerParams.animateVelDt[viewer_p] = options.animateVelDt[p];

		//animate velocity tmax
		if (options.hasOwnProperty("animateVelTmax") &&
			options.animateVelTmax != null &&
			options.animateVelTmax.hasOwnProperty(p) &&
			options.animateVelTmax[p] != null) viewerParams.animateVelTmax[viewer_p] = options.animateVelTmax[p];

		//filter limits
		if (options.hasOwnProperty("filterLims") &&
			options.filterLims != null &&
			options.filterLims.hasOwnProperty(p) &&
			options.filterLims[p] != null){
			viewerParams.updateFilter[viewer_p] = true

			for (k=0; k<viewerParams.fkeys[viewer_p].length; k++){
				var fkey = viewerParams.fkeys[viewer_p][k]
				if (options.filterLims[p].hasOwnProperty(fkey)){
					if (options.filterLims[p][fkey] != null){
						viewerParams.filterLims[viewer_p][fkey] = []
						viewerParams.filterLims[viewer_p][fkey].push(options.filterLims[p][fkey][0]);
						viewerParams.filterLims[viewer_p][fkey].push(options.filterLims[p][fkey][1]);
		} 	} 	} 	}

		//filter values
		if (options.hasOwnProperty("filterVals") &&
			options.filterVals != null &&
			options.filterVals.hasOwnProperty(p) &&
			options.filterVals[p] != null){
			viewerParams.updateFilter[viewer_p] = true

			for (k=0; k<viewerParams.fkeys[viewer_p].length; k++){
				var fkey = viewerParams.fkeys[viewer_p][k]
				if (options.filterVals[p].hasOwnProperty(fkey)){
					if (options.filterVals[p][fkey] != null){
						viewerParams.filterVals[viewer_p][fkey] = []
						viewerParams.filterVals[viewer_p][fkey].push(options.filterVals[p][fkey][0]);
						viewerParams.filterVals[viewer_p][fkey].push(options.filterVals[p][fkey][1]);
		} 	} 	} 	}

		//filter invert
		if (options.hasOwnProperty("invertFilter") &&
			options.invertFilter != null &&
			options.invertFilter.hasOwnProperty(p) &&
			options.invertFilter[p] != null){
			for (k=0; k<viewerParams.fkeys[viewer_p].length; k++){
				var fkey = viewerParams.fkeys[viewer_p][k]
				if (options.invertFilter[p].hasOwnProperty(fkey)){
					if (options.invertFilter[p][fkey] != null){
						viewerParams.invertFilter[viewer_p][fkey] = options.invertFilter[p][fkey];
		} 	}	 } 	}

		//colormap limits
		if (options.hasOwnProperty("colormapLims") &&
			options.colormapLims != null && 
			options.colormapLims.hasOwnProperty(p) && 
			options.colormapLims[p] != null){
			for (k=0; k<viewerParams.ckeys[viewer_p].length; k++){
				var ckey = viewerParams.ckeys[viewer_p][k]
				if (options.colormapLims[p].hasOwnProperty(ckey)){
					if (options.colormapLims[p][ckey] != null){
						viewerParams.colormapLims[viewer_p][ckey] = []
						viewerParams.colormapLims[viewer_p][ckey].push(options.colormapLims[p][ckey][0]);
						viewerParams.colormapLims[viewer_p][ckey].push(options.colormapLims[p][ckey][1]);
		} 	} 	} 	}

		//colormap values
		if (options.hasOwnProperty("colormapVals") &&
			options.colormapVals != null &&
			options.colormapVals.hasOwnProperty(p) &&
			options.colormapVals[p] != null){

			for (k=0; k<viewerParams.ckeys[viewer_p].length; k++){
				var ckey = viewerParams.ckeys[viewer_p][k]
				if (options.colormapVals[p].hasOwnProperty(ckey)){
					if (options.colormapVals[p][ckey] != null){
						viewerParams.colormapVals[viewer_p][ckey] = []
						viewerParams.colormapVals[viewer_p][ckey].push(options.colormapVals[p][ckey][0]);
						viewerParams.colormapVals[viewer_p][ckey].push(options.colormapVals[p][ckey][1]);
		} 	} 	} 	}

		//start plotting with a colormap
		if (options.hasOwnProperty("showColormap") &&
			options.showColormap != null &&
			options.showColormap.hasOwnProperty(p) &&
			options.showColormap[p] == true){
			viewerParams.showColormap[viewer_p] = true;
			if (viewerParams.haveUI){
				console.log(p+'colorCheckBox')
				var evalString = 'elm = document.getElementById("'+p+'colorCheckBox"); elm.checked = true; elm.value = true;'
				forGUI.push({'evalCommand':[evalString]})
		} 	}

		//choose which colormap to use
		if (options.hasOwnProperty("colormap") && 
			options.colormap != null &&
			options.colormap.hasOwnProperty(p) && 
			options.colormap[p] != null) viewerParams.colormap[viewer_p] = copyValue(options.colormap[p]);

		//select the colormap variable to color by
		if (options.hasOwnProperty("colormapVariable") && 
			options.colormapVariable != null &&
			options.colormapVariable.hasOwnProperty(p) && 
			options.colormapVariable[p] != null) viewerParams.colormapVariable[viewer_p] = copyValue(options.colormapVariable[p]);

		//select the radius variable to scale by
		if (options.hasOwnProperty("radiusVariable") && 
			options.radiusVariable != null &&
			options.radiusVariable.hasOwnProperty(p) && 
			options.radiusVariable[p] != null) viewerParams.radiusVariable[viewer_p] = copyValue(options.radiusVariable[p]);

		if (options.hasOwnProperty("blendingMode") && 
			options.blendingMode != null &&
			options.blendingMode.hasOwnProperty(p) && 
			options.blendingMode[p] != null) viewerParams.blendingMode[viewer_p] = copyValue(options.blendingMode[p]);
			
		if (options.hasOwnProperty("depthTest") && 
			options.depthTest != null &&
			options.depthTest.hasOwnProperty(p) && 
			options.depthTest[p] != null){
				viewerParams.depthTest[viewer_p] = copyValue(options.depthTest[p]);
				viewerParams.depthWrite[viewer_p] = copyValue(options.depthTest[p]);
				/*
				var evalString =( 'elm = document.getElementById(' + p + '_depthCheckBox);'+
					'elm.checked = ' + options.depthTest[p] + ';'+
					'elm.value = ' + options.depthTest[p]+';')
				forGUI.push({'evalCommand':evalString});
				*/
			}
			
	}// particle specific options

	// initialize all the colormap stuff that columnDensity will need. Because it's
	//  not a real particle group it won't get set in the loop above
	//  do it here so it happens in the presets too and load settings, etc...
	viewerParams.showParts[viewerParams.CDkey] = viewerParams.partsKeys.some(
		function (key){return viewerParams.showParts[key]});
	viewerParams.colormap[viewerParams.CDkey] = 4/256
	viewerParams.ckeys[viewerParams.CDkey] = [viewerParams.CDckey]
	viewerParams.colormapLims[viewerParams.CDkey] = {}
	viewerParams.colormapLims[viewerParams.CDkey][viewerParams.ckeys[viewerParams.CDkey][0]] = [viewerParams.CDmin,viewerParams.CDmax]
	viewerParams.colormapVals[viewerParams.CDkey] = {}
	viewerParams.colormapVals[viewerParams.CDkey][viewerParams.ckeys[viewerParams.CDkey][0]] = [viewerParams.CDmin,viewerParams.CDmax]
	viewerParams.colormapVariable[viewerParams.CDkey] = 0;
	viewerParams.showColormap[viewerParams.CDkey] = false;
	viewerParams.updateColormapVariable[viewerParams.CDkey] = false;

	sendToGUI(forGUI);
}

// connect fly/trackball controls
function initControls(updateGUI = true,force_fly=false){

	var forGUI = []
	forGUI.push({'setGUIParamByKey':[viewerParams.useTrackball, "useTrackball"]})

	// Firefly seems to behave best when it is initialized with trackball controls.  If the user chooses a different set of controls
	// I will still initialize it with trackball, and then change after the first render pass
	if (!force_fly && (viewerParams.useTrackball || viewerParams.drawPass < 1)) { 
		//console.log('initializing TrackballControls')
		viewerParams.controlsName = 'TrackballControls'
		var xx = new THREE.Vector3(0,0,0);
		if (viewerParams.center.x == viewerParams.camera.position.x &&
			viewerParams.center.y == viewerParams.camera.position.y &&
			viewerParams.center.z == viewerParams.camera.position.z){
			viewerParams.camera.position.z+=1e-2
		}

		viewerParams.camera.getWorldDirection(xx);
		viewerParams.controls = new THREE.TrackballControls( viewerParams.camera, viewerParams.renderer.domElement );
		viewerParams.controls.target = new THREE.Vector3(viewerParams.camera.position.x + xx.x, viewerParams.camera.position.y + xx.y, viewerParams.camera.position.z + xx.z);
		if (viewerParams.parts.hasOwnProperty('options') && !viewerParams.switchControls){
			if (viewerParams.parts.options.hasOwnProperty('center') ){
				if (viewerParams.parts.options.center != null){
					viewerParams.controls.target = new THREE.Vector3(viewerParams.parts.options.center[0], viewerParams.parts.options.center[1], viewerParams.parts.options.center[2]);

				}
			}
			if (viewerParams.parts.options.hasOwnProperty('cameraUp') ){
				if (viewerParams.parts.options.cameraUp != null){
					viewerParams.camera.up.set(viewerParams.parts.options.cameraUp[0], viewerParams.parts.options.cameraUp[1], viewerParams.parts.options.cameraUp[2]);
				}
			}
			//this does not work (a bug/feature of trackballControls)
			if (viewerParams.parts.options.hasOwnProperty('cameraRotation') ){
				if (viewerParams.parts.options.cameraRotation != null){
					viewerParams.camera.rotation.set(viewerParams.parts.options.cameraRotation[0], viewerParams.parts.options.cameraRotation[1], viewerParams.parts.options.cameraRotation[2]);
				}
			}

		} 
		viewerParams.controlsTarget = viewerParams.controls.target;
		viewerParams.controls.dynamicDampingFactor = viewerParams.friction;
		viewerParams.controls.addEventListener('change', sendCameraInfoToGUI);
		if (!viewerParams.useTrackball) return initControls(updateGUI,true); 
	} else {
		console.log('initializing FlyControls')
		viewerParams.controlsName = 'FlyControls';
		viewerParams.controls = new THREE.FlyControls( viewerParams.camera , viewerParams.normalRenderer.domElement);
		viewerParams.controls.movementSpeed = (1. - viewerParams.friction)*viewerParams.flyffac;
	}

	if (viewerParams.haveUI){
		var evalString = 'elm = document.getElementById("CenterCheckBox"); elm.checked = '+viewerParams.useTrackball+'; elm.value = '+viewerParams.useTrackball+';'
		forGUI.push({'evalCommand':evalString});
	}

	viewerParams.switchControls = false;
	if (updateGUI) sendToGUI(forGUI);

}

// create CD texture buffers and parameters
function initColumnDensity(){
	//following this example: https://threejs.org/examples/webgl_rtt.html
	var screenWidth = window.innerWidth;
	var screenHeight = window.innerHeight;
	var aspect = screenWidth / screenHeight;

	//render texture
	viewerParams.textureCD = new THREE.WebGLRenderTarget( screenWidth, screenHeight, {
		minFilter: THREE.LinearFilter, 
		magFilter: THREE.NearestFilter, 
		format: THREE.RGBAFormat 
	} );

	//for now, just use the first colormap
	viewerParams.materialCD = new THREE.ShaderMaterial( {
		uniforms: { 
			tex: { value: viewerParams.textureCD.texture }, 
			cmap: { type:'t', value: viewerParams.cmap },
			colormap: {value: viewerParams.colormap[viewerParams.CDkey]},
			CDmin: {value: viewerParams.colormapVals[viewerParams.CDkey][viewerParams.ckeys[viewerParams.CDkey][0]][0]}, // bottom of CD renormalization
			CDmax: {value: viewerParams.colormapVals[viewerParams.CDkey][viewerParams.ckeys[viewerParams.CDkey][0]][1]}, // top of CD renormalization
			lognorm: {value: viewerParams.CDlognorm}, // flag to normalize column densities in log space
			scaleCD: {value: viewerParams.scaleCD},
		},
		vertexShader: myVertexShader,
		fragmentShader: myFragmentShader_pass2,
		depthWrite: false
	} );
	var plane = new THREE.PlaneBufferGeometry( screenWidth, screenHeight );
	viewerParams.quadCD = new THREE.Mesh( plane, viewerParams.materialCD );
	viewerParams.quadCD.position.z = -100;
	viewerParams.sceneCD = new THREE.Scene();
	viewerParams.sceneCD.add( viewerParams.quadCD );

	// camera
	viewerParams.cameraCD = new THREE.OrthographicCamera( screenWidth/-2, screenWidth/2, screenHeight/2, screenHeight/-2, -10000, 10000 );
	//viewerParams.cameraCD = new THREE.PerspectiveCamera( viewerParams.fov, aspect, viewerParams.zmin, viewerParams.zmax);
	viewerParams.cameraCD.position.z = 100;
	viewerParams.cameraCD.up.set(0, -1, 0);
	viewerParams.sceneCD.add(viewerParams.cameraCD);  
}

/* HELPER FUNCTIONS */
// makeViewer ->
// continuously check if viewerParams attributes that
// should be initialized here are null, if so, keep waiting
function confirmViewerInit(){
	var keys = ["partsKeys", "PsizeMult", "plotNmax", "decimate", "stereoSepMax", "friction", "Pcolors", "showParts", "showVel", "animateVel", "velopts", "velType", "ckeys", "colormapVals", "colormapLims", "colormapVariable", "colormap", "showColormap", "fkeys", "filterVals", "filterLims", "renderer", "scene", "controls","camera","parts"];

	var ready = true;
	keys.forEach(function(k,i){
		if (viewerParams[k] == null) ready = false;
	});

	if (viewerParams.parts == null){
		ready = false;
	} else {
		var partsVals = ["Coordinates_flat"]
		if (viewerParams.hasOwnProperty('partsKeys')){
			viewerParams.partsKeys.forEach(function(p){
				partsVals.forEach(function(k,i){
					if (viewerParams.parts[p][k] == null) ready = false;
				});
			})
		}
	}

	return ready;
}

// makeViewer ->
function sendInitGUI(prepend=[], append=[]){
	//general particle settings
	//console.log('Sending init to GUI', viewerParams);

	var forGUI = prepend;
	forGUI.push({'setGUIParamByKey':[false,"GUIready"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.partsKeys, "partsKeys"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.PsizeMult, "PsizeMult"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.plotNmax, "plotNmax"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.decimate, "decimate"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.Pcolors, "Pcolors"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.showParts, "showParts"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.boxSize, "boxSize"]});

	//for velocities
	forGUI.push({'setGUIParamByKey':[viewerParams.showVel, "showVel"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.velopts, "velopts"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.velType, "velType"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.velVectorWidth, "velVectorWidth"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.velGradient, "velGradient"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.animateVel, "animateVel"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.animateVelDt, "animateVelDt"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.animateVelTmax, "animateVelTmax"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.blendingOpts, "blendingOpts"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.blendingMode, "blendingMode"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.depthTest, "depthTest"]});
	var haveVelocities = {};
	viewerParams.partsKeys.forEach(function(p){
		haveVelocities[p] = false;
		if (viewerParams.parts[p].Velocities_flat != null){
			haveVelocities[p] = true;
		}
	});
	forGUI.push({'setGUIParamByKey':[haveVelocities,"haveVelocities"]});

	//for colormap
	forGUI.push({'setGUIParamByKey':[viewerParams.ckeys,"ckeys"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.colormapVals, "colormapVals"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.colormapLims, "colormapLims"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.colormapVariable, "colormapVariable"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.colormap, "colormap"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.showColormap, "showColormap"]});
	var haveColormap = {};
	var haveColormapSlider = {};
	viewerParams.partsKeys.forEach(function(p){
		haveColormap[p] = false;
		haveColormapSlider[p] = {};
		viewerParams.ckeys[p].forEach(function(ck){
			haveColormapSlider[p][ck] = false;
			if (viewerParams.parts[p][ck] != null){
				haveColormap[p] = true;
				haveColormapSlider[p][ck] = true;
			}
		});
	});
	forGUI.push({'setGUIParamByKey':[haveColormap,"haveColormap"]});
	forGUI.push({'setGUIParamByKey':[haveColormapSlider,"haveColormapSlider"]});

	//for filters
	forGUI.push({'setGUIParamByKey':[viewerParams.fkeys,"fkeys"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.filterVals,"filterVals"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.filterLims,"filterLims"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.invertFilter,"invertFilter"]});
	var haveFilter = {};
	var haveFilterSlider = {};
	viewerParams.partsKeys.forEach(function(p){
		haveFilter[p] = false;
		haveFilterSlider[p] = {};
		forGUI.push({'setGUIParamByKey':[viewerParams.parts[p].currentlyShownFilter,"currentlyShownFilter",p]});
		viewerParams.fkeys[p].forEach(function(fk){
			haveFilterSlider[p][fk] = false;
			if (viewerParams.parts[p][fk] != null){
				haveFilter[p] = true;
				haveFilterSlider[p][fk] = true;
			}
		});
	});
	forGUI.push({'setGUIParamByKey':[haveFilter,"haveFilter"]});
	forGUI.push({'setGUIParamByKey':[haveFilterSlider,"haveFilterSlider"]});


	forGUI.push({'setGUIParamByKey':[viewerParams.rkeys,"rkeys"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.radiusVariable,"radiusVariable"]});


	//for camera
	forGUI.push({'setGUIParamByKey':[viewerParams.stereoSepMax, "stereoSepMax"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.friction, "friction"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.useTrackball, "useTrackball"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.useStereo, "useStereo"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.renderWidth,"renderWidth"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.renderHeight,"renderHeight"]});

	forGUI.push({'setGUIParamByKey':[viewerParams.reset,"reset"]});

	forGUI.push({'setGUIParamByKey':[viewerParams.camera.position, "cameraPosition"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.camera.rotation, "cameraRotation"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.camera.up, "cameraUp"]});
	var xx = new THREE.Vector3(0,0,0);
	viewerParams.camera.getWorldDirection(xx);
	forGUI.push({'setGUIParamByKey':[xx, "cameraDirection"]});
	if (viewerParams.useTrackball) forGUI.push({'setGUIParamByKey':[viewerParams.controls.target, "controlsTarget"]});

	forGUI.push({'updateUICenterText':null});
	forGUI.push({'updateUICameraText':null});
	forGUI.push({'updateUIRotText':null});

	//if (viewerParams.usingSocket && !viewerParams.local) forGUI.push({'updateGUICamera':null});
	if (viewerParams.usingSocket && !viewerParams.local) forGUI.push({'setGUIParamByKey':[true, "cameraNeedsUpdate"]});

	forGUI.push({'setGUIParamByKey':[viewerParams.haveOctree,"haveOctree"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.haveAnyOctree,"haveAnyOctree"]});
	if (viewerParams.haveAnyOctree) {
		forGUI.push({'setGUIParamByKey':[viewerParams.memoryLimit,"octreeMemoryLimit"]});
		forGUI.push({'setGUIParamByKey':[viewerParams.octree.normCameraDistance,"octreeNormCameraDistance"]});
		}

	forGUI.push({'setGUIParamByKey':[viewerParams.showFPS,"showFPS"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.showMemoryUsage,"showMemoryUsage"]});

	forGUI.push({'setGUIParamByKey':[viewerParams.columnDensity,"columnDensity"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.CDmin,"CDmin"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.CDmax,"CDmax"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.CDkey,"CDkey"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.CDckey,"CDckey"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.CDlognorm,"CDlognorm"]});

	//check if there is a tween file
	viewerParams.haveTween = false;
	if (viewerParams.filenames.hasOwnProperty('tweenParams') &&  ('tweenParams' in viewerParams.parts && viewerParams.parts.tweenParams.loaded)) viewerParams.haveTween = true;
	forGUI.push({'setGUIParamByKey':[viewerParams.haveTween,"haveTween"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.inTween,"inTween"]});

	forGUI.push({'setGUIParamByKey':[viewerParams.GUIExcludeList,"GUIExcludeList"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.collapseGUIAtStart,"collapseGUIAtStart"]});

	// add any extra commands
	append.forEach(function(x,i){
		forGUI.push(x);
	})

	forGUI.push({'setGUIParamByKey':[true,"GUIready"]});


	sendToGUI(forGUI);

	//ready to create GUI
	console.log("sent all inits to GUI", forGUI)

}

//const specialChars = /[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~\t\n]/g;
// removed _ from between ) and +
const specialChars = /[ `!@#$%^&*()+\-=\[\]{};':"\\|,.<>\/?~\t\n]/;
// https://bobbyhadz.com/blog/javascript-check-if-string-contains-special-characters
function removeSpecialChars(str) {
	while (specialChars.test(str)){
		str = str.replace(specialChars.exec(str)[0],'_')
	}
	return str;
}

// callLoadData ->
function loadData(callback, prefix="", internalData=null, initialLoadFrac=0){

	viewerParams.parts = {};
	viewerParams.parts.totalSize = 0.;
	viewerParams.parts.count = {};


	viewerParams.partsKeys = Object.keys(viewerParams.filenames);
	// count how many particles we need to load
	viewerParams.partsKeys.forEach( function(p, i) {
		// replace any special characters
		var sanitary_p = removeSpecialChars(p);
		viewerParams.parts.count[p] = 0;
		viewerParams.filenames[p].forEach( function(f, j) {
			var amt = 0;
			if (f.constructor == Array) amt = parseFloat(f[1]);
			else if (j == 1) amt = parseFloat(f);

			if (amt > 0) {
				viewerParams.parts.totalSize += amt;
				viewerParams.parts.count[p] += amt;
			} 
		});
	});

	viewerParams.partsKeys.forEach( function(p, i) {
		// replace any special characters
		var sanitary_p = removeSpecialChars(p);
		// initialize this particle dictionary
		viewerParams.parts[sanitary_p] = {};

		// default that no particle groups have an octree
		viewerParams.haveOctree[sanitary_p] = false

		// loop through each of the files to open
		viewerParams.filenames[p].forEach( function(f, j) {
			// passed data through flask, not an actual filename
			if (internalData){
				console.log('==== compiling internal data', f)
				Object.keys(internalData).forEach(function(key,k){
					//if I was sent a prefix, this could be simplified
					// TODO should handle passing binary data
					if (key.includes(f[0])) compileJSONData(internalData[key], sanitary_p, callback, initialLoadFrac)
				})
				if (internalData && i == viewerParams.partsKeys.length - 1 && j == viewerParams.filenames[p].length - 1) viewerParams.newInternalData = {};

			} 
			// passed an actual file, let's read it
			else {
				// determine what sort of "file" i was passed
				//  i.e. where is the actual file name 
				// 	ABG NOTE: (not sure why f.constructor might be an array?) 
				var readf = null;
				if (f.constructor == Array) readf = "data/"+f[0];
				else if (j == 0) readf = "data/"+f;

				// alright, let's go ahead and read the file
				if (readf != null){
					// read JSON files (including octree.json files
					//  which reference .fftree files. Those are loaded
					//  separately on demand.)
					if (readf.toLowerCase().includes('.json')){
						//console.log(prefix+readf)
						d3.json(prefix+readf, function(foo) {
							compileJSONData(foo, sanitary_p, callback, initialLoadFrac);
						});
					}
					// read binary .ffly files
					else if (readf.toLowerCase().includes('.ffly' )){
						loadFFLYKaitai(prefix+readf, function(foo){
							compileFFLYData(foo, sanitary_p, callback, initialLoadFrac)}
						);
					}
				}
			}
		});
		// replace the parts key with the sanitary_p
		viewerParams.partsKeys[i] = sanitary_p;
	});
}

// callCompileData ->
function compileJSONData(data, p, callback, initialLoadFrac=0){
	// handle backwards compatability, multi dimensional arrays were flattened in later
	//  versions of firefly
	['Coordinates','Velocities'].forEach(function (key){
		if (data.hasOwnProperty(key) && !data.hasOwnProperty(key+'_flat')){
			data[key+'_flat'] = Array(3*data[key].length);
			for (var i=0; i<data[key].length; i++){
				data[key+'_flat'][3*i] = data[key][i][0];
				data[key+'_flat'][3*i+1] = data[key][i][1];
				data[key+'_flat'][3*i+2] = data[key][i][2];
			}
			data.removeProperty(key);
		}
	})

	key = 'colorArray'
	if (data.hasOwnProperty(key) && !data.hasOwnProperty('rgbaColors_flat')){
		data[key+'_flat'] = Array(3*data[key].length);
		for (var i=0; i<data[key].length; i++){
			data['rgbaColors_flat'][4*i] = data[key][i][0];
			data['rgbaColors_flat'][4*i+1] = data[key][i][1];
			data['rgbaColors_flat'][4*i+2] = data[key][i][2];
			data['rgbaColors_flat'][4*i+3] = data[key][i][3];
		}
		data.removeProperty(key);
	}

	Object.keys(data).forEach(function(k, jj) {
		//console.log("k = ", k, jj)
		if (viewerParams.parts[p].hasOwnProperty(k)){
			viewerParams.parts[p][k] = viewerParams.parts[p][k].concat(data[k]);
			//console.log('appending', k, p, viewerParams.parts[p])

		} else {
			viewerParams.parts[p][k] = data[k];
			//console.log('creating', k, p, viewerParams.parts[p], data[k])
		}
	});	

	// did we just load an octree.json file? let's initialize the octree then.
	if (data.hasOwnProperty('octree')) initOctree(p,data);

	countPartsForLoadingBar(initialLoadFrac);

	checkDone(callback);	
}

function countPartsForLoadingBar(initialLoadFrac=0){
	var num = 0;
	if (!viewerParams.counting){
		var num = countParts()
		var frac = (num/viewerParams.parts.totalSize);
		if (viewerParams.parts.totalSize == 0) frac = 1.;
		var loadfrac = frac*(1. - initialLoadFrac) + initialLoadFrac;
		//some if statment like this seems necessary.  Otherwise the loading bar doesn't update (I suppose from too many calls)
		if (loadfrac - viewerParams.loadfrac > 0.1 || loadfrac == 1){
			viewerParams.loadfrac = loadfrac;
			updateLoadingBar();
		}
	}
}

function checkDone(callback){
	if ((!viewerParams.filenames.hasOwnProperty('tweenParams') || // no tweenParams file provided
		('tweenParams' in viewerParams.parts && viewerParams.parts.tweenParams.loaded)) &&
		(!viewerParams.filenames.hasOwnProperty('options') || // no options file provided
		('options' in viewerParams.parts && viewerParams.parts.options.loaded))){
		// we're done loading!
		if (countParts() ==  viewerParams.parts.totalSize){

			var index = viewerParams.partsKeys.indexOf('options');
			if (index > -1) {
				viewerParams.partsKeys.splice(index, 1);
				viewerParams.parts.options0 = JSON.parse(JSON.stringify(viewerParams.parts.options));
			}
			var index = viewerParams.partsKeys.indexOf('tweenParams');
			if (index > -1) {
				viewerParams.partsKeys.splice(index, 1);
				//viewerParams.tweenParams = JSON.parse(JSON.stringify(viewerParams.parts.tweenParams));
			}
			callback(); 
		}
	}
}

// read a file, convert to a blob, and then pass the kaitai struct
//  to be translated into the viewerParams!
function loadFFLYKaitai(fname,callback){
	// initialize a FileReader object
	var binary_reader = new FileReader;
	// get local file
	fetch(fname)
		.then(res => res.blob()) // convert to blob
		.then(blob =>{ 
		// interpret blob as an "ArrayBuffer" (basic binary stream)
		binary_reader.readAsArrayBuffer(blob)
		// wait until loading finishes, then call function
		binary_reader.onloadend = function () {
			// convert ArrayBuffer to FireflyFormat
			kaitai_format = new FireflyFormat1(
				new KaitaiStream(binary_reader.result));
			// call compileFFLYData as a callback
			callback(kaitai_format);
		}
	});
};

// translate the katai format to viewerParams
function compileFFLYData(data, p, callback, initialLoadFrac=0){
	var hasVelocities = data.fireflyHeader.hasVelocities;
	var hasRgbaColors = data.fireflyHeader.hasRgbaColors;
	var this_parts = viewerParams.parts[p];
	if (!data.hasOwnProperty('coordinatesFlat')) console.log("Invalid particle group data",data);
	else {
		// need to initialize various arrays that would've just been copied from the JSON
		if (!this_parts.hasOwnProperty('Coordinates_flat')){
			this_parts.Coordinates_flat = [];
			if (hasVelocities) this_parts.Velocities_flat = [];
			if (hasRgbaColors) this_parts.rgbaColors_flat = [];
			this_parts.filterKeys = [];
			this_parts.colormapKeys = [];
			// TODO hook this up for choosing which variable to scale points by
			this_parts.radiusKeys = [];
			//this_parts.doSPHrad = Array(false);

			// initialize scalar field arrays and corresponding flags
			for (i=0; i < data.fireflyHeader.fieldNames.length; i++){
				field_name = data.fireflyHeader.fieldNames[i].fieldName
				this_parts[field_name] = [];
				if (data.fireflyHeader.filterFlags.buffer[i]) this_parts.filterKeys.push(field_name);
				if (data.fireflyHeader.colormapFlags.buffer[i]) this_parts.colormapKeys.push(field_name);
				if (data.fireflyHeader.radiusFlags.buffer[i]) this_parts.radiusKeys.push(field_name);
			}
		} // if (!this_parts.hasOwnProperty)('Coordinates_flat'))
		this_parts.Coordinates_flat = this_parts.Coordinates_flat.concat(data.coordinatesFlat.flatVectorData.data.values);
		// only load velocities if we actually have them
		if (hasVelocities) this_parts.Velocities_flat = this_parts.Velocities_flat.concat(data.velocitiesFlat.flatVectorData.data.values);
		if (hasRgbaColors) this_parts.rgbaColors_flat = this_parts.rgbaColors_flat.concat(data.rgbaColorsFlat.flatVector4Data.data.values);

		// and now load the scalar field data
		for (i=0; i < data.fireflyHeader.nfields; i++){
			field_name = data.fireflyHeader.fieldNames[i].fieldName
			this_parts[field_name] = this_parts[field_name].concat(
				data.scalarFields[i].fieldData.data.values
			);
		}
	}
	
	countPartsForLoadingBar(initialLoadFrac);

	checkDone(callback);	
}


// compileJSONData ->
function countParts(){
	var num = 0.;
	viewerParams.counting = true;
	viewerParams.partsKeys.forEach( function(p, i) {
		if (viewerParams.parts.hasOwnProperty(p)){
			// count the particles that have already been loaded,
			//  safe to assume they have coordinates.
			if (viewerParams.parts[p].hasOwnProperty('Coordinates_flat')){
				num += viewerParams.parts[p].Coordinates_flat.length/3;
			}
		}
		if (i == viewerParams.partsKeys.length - 1) viewerParams.counting = false;
	})
	return num;
}

// callLoadData -> , connectViewerSocket ->
function drawLoadingBar(){
	d3.select('#loadDataButton').style('display','none');
	d3.select('#selectStartupButton').style('display','none');

	var screenWidth = parseFloat(window.innerWidth);

	//Make an SVG Container
	var splash = d3.select("#splashdivLoader")

	splash.selectAll('svg').remove();

	var svg = splash.append("svg")
		.attr("width", screenWidth)
		.attr("height", viewerParams.loadingSizeY);

	viewerParams.svgContainer = svg.append("g")


	viewerParams.svgContainer.append("rect")
		.attr('id','loadingRectOutline')
		.attr("x", (screenWidth - viewerParams.loadingSizeX)/2)
		.attr("y", 0)
		.attr("width",viewerParams.loadingSizeX)
		.attr("height",viewerParams.loadingSizeY)
		.attr('fill','rgba(0,0,0,0)')
		.attr('stroke','var(--logo-color1)')
		.attr('stroke-width', '3')

	viewerParams.svgContainer.append("rect")
		.attr('id','loadingRect')
		.attr("x", (screenWidth - viewerParams.loadingSizeX)/2)
		.attr("y", 0)//(screenHeight - sizeY)/2)
		.attr("height",viewerParams.loadingSizeY)
		.attr('fill','var(--logo-color1)')
		.attr("width",viewerParams.loadingSizeX*viewerParams.loadfrac);


	window.addEventListener('resize', moveLoadingBar);

}

// drawLoadingBar ->
function moveLoadingBar(){
	var screenWidth = parseFloat(window.innerWidth);
	d3.selectAll('#loadingRectOutline').attr('x', (screenWidth - viewerParams.loadingSizeX)/2);
	d3.selectAll('#loadingRect').attr('x', (screenWidth - viewerParams.loadingSizeX)/2);
}

// compileJSONData ->
function updateLoadingBar(){
	//console.log(viewerParams.loadfrac, viewerParams.loadingSizeX*viewerParams.loadfrac)
	d3.selectAll('#loadingRect').transition().attr("width", viewerParams.loadingSizeX*viewerParams.loadfrac);

}

// initPVals -> 
function calcMinMax(p,key, addFac = true){
	var i=0;
	min = viewerParams.parts[p][key][i];
	max = viewerParams.parts[p][key][i];
	for (i=0; i< viewerParams.parts[p][key].length; i++){
		min = Math.min(min, viewerParams.parts[p][key][i]);
		max = Math.max(max, viewerParams.parts[p][key][i]);
	}
	if (addFac){
		//need to add a small factor here because of the precision of noUIslider
		min -= 0.001;
		max += 0.001;
	}
	return {"min":min, "max":max}
}

// initScene -> 
function setCenter(coords_flat){
	var sum = [0., 0., 0.];
	var nparts = coords_flat.length/3;
	for( var i = 0; i < nparts; i++ ){
		sum[0] += coords_flat[3*i];
		sum[1] += coords_flat[3*i+1];
		sum[2] += coords_flat[3*i+2];
	}

	// guard against divide by 0 error
	viewerParams.center = new THREE.Vector3(sum[0], sum[1], sum[2]);
	if (coords_flat.length > 0) viewerParams.center.divideScalar(coords_flat.length/3); 

	// avoid having the camera center too close to 0,0,0.  If the target is also 0,0,0, then it is hard to zoom out initially.
	var lim = 1e-5
	if (Math.abs(viewerParams.center.x) < lim & Math.abs(viewerParams.center.y) < lim  & Math.abs(viewerParams.center.z) < lim){
		viewerParams.center.z = 10;
	}
	setBoxSize(coords_flat);

}

// setCenter ->
function setBoxSize(coords_flat){
	var fee, foo;
	var nparts = coords_flat.length/3;
	for( var i = 0; i < nparts; i++ ){
		foo = new THREE.Vector3(coords_flat.slice(3*i,3*(i+1)))
		fee = viewerParams.center.distanceTo(foo);
		if (fee > viewerParams.boxSize){
			viewerParams.boxSize = fee;
		}
	}
}

// applyOptions -> 
function calcVelVals(this_parts){
	this_parts.VelVals = [];
	magVelocities = [];
	var mag, v;
	var max = -1.;
	var min = 1.e20;
	var vdif = 1.;
	for (var i=0; i<this_parts.Coordinates_flat.length/3; i++){
		v = this_parts.Velocities_flat.slice(3*i,3*(i+1));
		mag = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
		// update min/max
		if (mag > max) max = mag;
		if (mag < min) min = mag;
		this_parts.VelVals[4*i]   = v[0]/mag
		this_parts.VelVals[4*i+1] = v[1]/mag
		this_parts.VelVals[4*i+2] = v[2]/mag
		// keep track of the magnitude so that we can use it to normalize below
		magVelocities.push(mag)
	}
	vdif = Math.min(max - min, viewerParams.maxVrange);
	// normalize velocity between 0 and 1 depending on the velocity dynamic range
	for (var i=0; i<this_parts.Coordinates_flat.length/3; i++){
		this_parts.VelVals[4*i+3] = THREE.Math.clamp((magVelocities[i] - min) / vdif, 0., 1.)
	}
}

// initControls ->
function sendCameraInfoToGUI(foo, updateCam=false){

	var xx = new THREE.Vector3(0,0,0);
	viewerParams.camera.getWorldDirection(xx);

	var forGUI = [];
	forGUI.push({'setGUIParamByKey':[viewerParams.camera.position, "cameraPosition"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.camera.rotation, "cameraRotation"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.camera.up, "cameraUp"]});
	forGUI.push({'setGUIParamByKey':[xx, "cameraDirection"]});
	if (viewerParams.useTrackball) forGUI.push({'setGUIParamByKey':[viewerParams.controls.target, "controlsTarget"]});

	forGUI.push({'updateUICenterText':null});
	forGUI.push({'updateUICameraText':null});
	forGUI.push({'updateUIRotText':null});

	if (updateCam) forGUI.push({'updateGUICamera':null});

	sendToGUI(forGUI);
}

//for fly controls
document.addEventListener("keydown", sendCameraInfoToGUI);

// called numerous times outside this file
//check if the data is loaded
function clearloading(gui_done=false){
	if (!gui_done){
		d3.select("#splashdiv5").text("Building GUI...");
		return;
	}

	viewerParams.loaded = true;
	viewerParams.reset = false;

	//show the rest of the page
	d3.select("#ContentContainer").style("visibility","visible")

	//console.log("loaded")
	d3.select("#loader").style("display","none")
	if (viewerParams.local){
		d3.select("#splashdiv5").text("Click to begin.");
		if (!viewerParams.showSplashAtStartup) showSplash(false);
	} else {
		showSplash(false);
	}

}

// not sure where this is called
function updateViewerCamera(){
	if (viewerParams.useTrackball) viewerParams.controls.target = new THREE.Vector3(viewerParams.controlsTarget.x, viewerParams.controlsTarget.y, viewerParams.controlsTarget.z);

	if (viewerParams.camera){
		viewerParams.camera.position.set(viewerParams.cameraPosition.x, viewerParams.cameraPosition.y, viewerParams.cameraPosition.z);
		viewerParams.camera.rotation.set(viewerParams.cameraRotation._x, viewerParams.cameraRotation._y, viewerParams.cameraRotation._z);
		viewerParams.camera.up.set(viewerParams.cameraUp.x, viewerParams.cameraUp.y, viewerParams.cameraUp.z);
	}
	//console.log(viewerParams.camera.position, viewerParams.camera.rotation, viewerParams.camera.up);
}

function blankCallback(){
	console.log('blank callback')
}

function updateOctreeLoadingBar(){
	var forGUI = [];
	viewerParams.partsKeys.forEach(function(p){
		if (viewerParams.haveOctree[p]) {
			var numerator = viewerParams.octree.loadingCount[p][0];
			var parts_numerator = viewerParams.octree.loadingCount[p][1];
			var remaining_count = 0;
			viewerParams.octree.toDraw[p].forEach( function (tuple){
				node = tuple[0];
				remaining_count+=node.buffer_size;
			});

			var parts_denominator = parts_numerator + remaining_count;
			var denominator = numerator + viewerParams.octree.toDraw[p].length;
			var out = {
				'p':p,
				'numerator':numerator,
				'denominator':denominator,
				'parts_numerator':parts_numerator,
				'parts_denominator':parts_denominator};
			forGUI.push({'updateOctreeLoadingBarUI':out});
		}
	})
	sendToGUI(forGUI);
}

