//all "global" variables are contained within params object
var viewerParams;

// self-contained deep copy: copyValue() lives in applyUISelections.js, which
//  hasn't loaded yet the first time defineViewerParams() runs
function copyDefaultValue(a){
	if (a == null || typeof a != 'object') return a;
	return JSON.parse(JSON.stringify(a));
}

// copy the cached defaults onto the params object being built. values are
//  copied rather than shared so later edits can't corrupt the cache. both
//  defaults objects are attached together, so anything downstream can gate on
//  either one being set (see WebGLStart and confirmViewerInit).
function applyDefaultViewerParams(these_params){
	these_params.defaultSettings = persistentParams.cachedDefaultSettings;
	these_params.defaultParticleSettings = persistentParams.cachedDefaultParticleSettings;
	Object.keys(persistentParams.cachedDefaultSettings).forEach(function (key){
		these_params[key] = copyDefaultValue(persistentParams.cachedDefaultSettings[key]);
	});
}

function setDefaultViewerParams(these_params){
	// already fetched: apply now, so nothing downstream can race us
	if (persistentParams.cachedDefaultSettings && persistentParams.cachedDefaultParticleSettings){
		applyDefaultViewerParams(these_params);
		return;
	}

	// first load: fetch both, and apply only once both have arrived
	d3.json("static/js/misc/defaultSettings.json", function(defaultSettings) {
		persistentParams.cachedDefaultSettings = defaultSettings;
		if (persistentParams.cachedDefaultParticleSettings) applyDefaultViewerParams(these_params);
	})

	// load the default particle settings
	d3.json("static/js/misc/defaultParticleSettings.json", function(defaultParticleSettings) {
		persistentParams.cachedDefaultParticleSettings = defaultParticleSettings;
		if (persistentParams.cachedDefaultSettings) applyDefaultViewerParams(these_params);
	});


}

function defineViewerParams(){
	viewerParams = new function() {

		this.url = new URL(window.location.href);

		var currentTime = new Date();
		// in seconds
		this.initialize_time = currentTime.getTime()/1000;
		//this.sleepTimeout = 1.5 // seconds
		// no timeout
		this.sleepTimeout = null // seconds
		this.showSplashAtStartup = false;

		this.container = null;
		this.scene = null;
		this.camera = null;
		this.frustum = null;
		this.renderer = null;
		this.controls = null
		this.effect = null;
		this.normalRenderer = null;
		this.windowResize = null; //THREEx.WindowResize handle, so its listener can be released

		this.title = null;
		this.annotation = null;

		this.keyboard = null;

		this.parts = null;
		this.partsKeys;
		this.partsMesh = {};

		this.loaded = false;
		// guards WebGLStart against building the scene twice (checkDone can call
		//  it more than once, and it retries while the defaults are in flight)
		this.webGLStarted = false;
		this.loopErrorLogged = false; //so a repeating render loop error is reported once

		// for disabling GUI elements
		this.GUIExcludeList = []
		this.collapseGUIAtStart = true;

		//positions, will be rest below ()
		this.center;
		this.boxSize = 0.;

		//plotting fields
		this.showParts = {};
		this.updateOnOff = {};

		//particle size multiplicative factor
		this.partsSizeMultipliers = {};

		//particle default colors;
		this.partsColors = {};

		//Decimation
		this.decimate = 1;
		this.plotNmax = {};

		//Filtering
		this.fkeys = {};
		this.updateFilter = {};
		this.filterLims = {};
		this.filterVals = {};
		this.invertFilter = {};
		this.currentlyShownFilter = {};

		//for frustum      
		this.zmax = 5.e10;
		this.zmin = 0.01;
		this.fov = 45.

		//camera controls
		this.controlsName = null;
		this.useTrackball = true;
		this.allowVRControls = false;
		this.initialFlyControls = false;
		this.useStereo = false;
		this.initialStereo = false;
		this.stereoSep = 0.06;
		this.stereoSepMax = 1.;

		//for rendering to image
		this.renderWidth = 1920;
		this.renderHeight = 1200;

		// defaults for rendering to movie
		this.VideoCapture_duration = 5; // seconds
		this.VideoCapture_FPS = 30; // 30 frames per second
		this.VideoCapture_filename = 'firefly_capture';
		this.VideoCapture_format = 0; // index of format
		this.VideoCapture_formats = ['.gif','.png','.jpg']//,'.webm'] // webm doesn't seem to be working :\
		this.VideoCapture_frame = 0; // will store the frame so that we can shut off the capture when completed
		// the  CCCapture object will be added when recordVideo is called
		this.capturer = null; 
		this.captureCanvas = false;
		this.imageCaptureClicked = false; //to help differentiate between an image and movie for a gif

		//for deciding whether to show velocity vectors
		this.showVel = {};
		this.velopts = {'line':0., 'arrow':1., 'triangle':2.};
		this.velType = {};
		this.maxVrange = 500.; //maximum dynamic range for length of velocity vectors (can be reset in options file)
		this.velVectorWidth = {};
		this.velGradient = {}; //0 == false, 1 == true

		//blending modes
		this.blendingOpts = {'additive':THREE.AdditiveBlending, 
							 'normal':THREE.NormalBlending, 
							 'subtractive':THREE.SubtractiveBlending, 
							 'multiply':THREE.MultiplyBlending, 
							 'none':THREE.NoBlending};
		this.blendingMode = {};
		//fraction of a point's radius held at full alpha before it fades to the edge
		this.brightCenterFraction = {};
		this.depthTest = {};

		//for deciding whether to animate the velocities
		this.animateVel = {};
		this.animateVelDt = 0;
		this.animateVelTmax = 1;		
		this.animateVelTime = 0;		

		//help screen
		this.helpMessage = false;

		//initial friction value
		this.friction = 0.1;
		this.flyffac = 1.;
		this.switchControls = false;

		//check to see if the UI exists
		this.haveUI = false;

		this.reset = false;

		
		//for the loading bar
		var screenWidth = window.innerWidth;
		var screenHeight = window.innerHeight;
		this.loadingSizeX = screenWidth*0.9;
		this.loadingSizeY = screenHeight*0.05;
		this.loadfrac = 0.;
		this.drawfrac = 0.;
		this.datasetName = null; //shown on the splash screen, when known (see resetSplashProgress())
		// true once a startup.json with multiple entries has offered its picker
		// (see getFilenames(), and dataPicker.js); lets loadNewData() know which
		// picker to offer when the user asks for new data
		this.startupChooserActive = false;
		// what the splash is offering while no data is loaded: 'startupPicker',
		// 'pathPicker', or null. replayed to a GUI window that connects after
		// we already decided (see onGUIConnected()).
		this.dataPickerState = null;
		this.startupPrefix = "";
		// where the current dataset is served from: "static/" for anything under
		// firefly/static/data, "userdata/<room>/" for a directory of the user's
		// own (see load_data_path in server.py). octree node files are fetched
		// outside loadData() and so can't be handed the prefix directly.
		this.prefix = "static/";

		//the startup file
		this.startup = "data/startup.json";
		this.filenames = null;
		this.dir = {};

		// throttle for the camera readout we push to the GUI while a movement key
		// is held down (see the keydown listener at the end of initViewer.js)
		this.lastCameraInfoToGUI = 0;
		this.cameraInfoToGUIInterval = 100; //ms

		//animation
		this.pauseAnimation = false;
		this.animating = false;

		// contains colormap texture
		this.colormapTexture = new THREE.TextureLoader().load( "static/textures/colormap.png" );

		// determines which colormap is applied to each particle type
		this.colormap = {};

		// determines which colormap variable is activated for each particle type
		this.colormapVariable = {};

		// list of possible colormap variables for each particle type
		this.ckeys = {};

		// determines if colormap is on or off
		this.showColormap = {};

		// slider limits for colormap
		this.colormapVals = {};
		// textbox limits for colormap
		this.colormapLims = {};
		// boolean for reversing colormap
		this.colormapReversed = {};

		//check if we need to update the colormap when rendering
		this.updateColormapVariable = {};

		// list of possible radius variables for each particle type
		this.rkeys = {};

		// determines which radius variable, if any, is activated for each particle type
		this.radiusVariable = {};

		//check if we need to update the colormap when rendering
		this.updateRadiusVariable = {};

		//tweening
		this.inTween = false;
		this.updateTween = false;
		this.haveTween = false;
		this.tweenFile = null;
		this.tweenParams = {};
		this.tweenPos = [];
		this.tweenRot = [];

		//render texture to show column density
		this.textureCD = null;
		this.columnDensity = false;
		this.materialCD = null;
		this.sceneCD = null;
		this.cameraCD = null;
		this.scaleCD = 0.01; //scaling factor for the shader so that it adds up to one at highest density

		this.CDmin = 1;
		this.CDmax = 10;
		this.CDlognorm = 0;
		this.CDckey = 'ColumnDensity' // the name of the ckey, shows up in the colorbar label
		this.CDkey = '__column__density__foo__abg' // the name of the pseudo particle group, salted so that no one overwrites it


		this.cmap = this.colormapTexture;//new THREE.TextureLoader().load( "textures/cmap.png");
		this.cmap.minFilter = THREE.LinearFilter;
		this.cmap.magFilter = THREE.NearestFilter;
		this.quadCD = null; //for the column density 

		//for sockets
		this.usingSocket = true;
		this.local = false; //for GUI and viewer in one but still using sockets?

		//when ready the GUI will be created
		this.waitForInit = null;
		this.ready = false; 
		this.counting = false;

		//save the initial state in a preset file
		this.initialState = null;

		//from GUI
		this.cameraPosition = new THREE.Vector3(0,0,0);
		this.cameraRotation = new THREE.Vector3(0,0,0);
		this.cameraUp = new THREE.Vector3(0,0,0);
		this.cameraDirection = new THREE.Vector3(0,0,0);
		this.controlsTarget = new THREE.Vector3(0,0,0);

		//for streamer
		this.streamerActive = false;
		this.streamReady = true;
		this.streamQuality = 1.0;

		//for internal data
		this.newInternalData = {};

		// for debugging
		this.showfps = true;
		this.fps_list = Array(30).fill(0);

		//for octree
		this.haveOctree = {}; //will be initialized to false for each of the parts keys in loadData
		this.haveAnyOctree = false; //must be a better way to do this!
		this.FPS = 30; //will be upated in the octree render loop
		this.FPS0 = 30; //save the previous to check if we need to update the GUI
		this.memoryUsage = 0; //bytes we've allocated for buffers (see update_memory_usage)
		this.memoryUsage0 = 0; //save the previous to check if we need to update the GUI
		this.drawPass = 0;
		this.memoryLimit = 2*1e9; //bytes, maximum memory allowed -- for now this is more like a target
		this.baseMemoryUsage = 0; //bytes held by the non-octree meshes, set in createPartsMesh

		//default min/max particles sizes
		this.minPointScale = .01;
		this.maxPointScale = 10;

		this.octree = new function() {
			// TODO remove this from the UI
			this.normCameraDistance = {'default':1000};

			this.pIndex = 0; //will be used to increment through the particle types in the render loop

			// containers for nodes that should be loaded or discarded
			//  separate draw queues for each particle type but single remove queue (because it's faster)
			this.toDraw = {};
			this.toRemove = [];

			// flags used to gate drawing/removing multiple nodes at the same time
			this.waitingToDraw = false;
			this.waitingToRemove = false;

			this.boxSize = 0; //will be set based on the root node

			this.loadingCount = {}; //will contain an array for each particle type that has the total inView and the total drawn to adjust the loading bar

			// the loading bar is refreshed from the render loop rather than on
			//  every node draw/remove: each refresh walks the whole draw queue
			//  and, with the GUI in its own window, costs a socket round trip
			this.loadingBarDirty = false;
			this.loadingBarLastSent = 0;
			this.loadingBarInterval = 200; //ms between refreshes

			this.showCoMParticles = false;

			// bytes held by the node buffers we've loaded
			this.bytesInMemory = {}; //per particle key, initialized in initOctree
			this.totalBytesInMemory = 0;

			// at the memory limit we stop queueing new nodes until usage falls back
			//  below memoryResumeFraction*limit; the gap keeps us from freeing and
			//  reloading a node every frame
			this.memoryLimitReached = false;
			this.memoryResumeFraction = 0.9;
			this.maxEvictionsPerPass = 20; //cap so freeing back down to the limit can't stall a frame

			// per particle key, set by the clear/pause/resume buttons in the GUI
			this.loadingPaused = {};


			/*
			this.maxToRemove = 50;
			//normalization for the camera distance in deciding how many particles to draw
			//could be included in GUI, will be reset in pruneOctree to be a fraction of boundingBox
			this.normCameraDistance = {'default':1000};
			this.removeTimeout = 2; //(s) to wait to add to the remove list (in case the user just moves around a litte)
			this.toReduce = [];
			this.maxToReduce = 50;
			this.waitingToReduce = false;
			this.maxFilesToRead = 50;
			this.drawPass = 1;
			this.minDiffForUpdate = 100; //minumum number of particles that need to be different between drawn and expected for the node to be updated
			this.maxUpdatesPerDraw = this.maxFilesToRead/2; //maximum number of updates to make during a draw loop, to make sure new nodes are always drawn
			this.NUpdate = 0; //will cound the number of nodes needing updates in a render pass
			this.NParticleMemoryModifier = 1.; //will be increased or decreased based on the current memory usage
			this.NParticleMemoryModifierFac = 1.;
			this.targetFPS = 30; //will be used to controls the NParticleFPSModifier
			this.NParticleFPSModifier = 1.; //will be increased or decreased based on the current fps
			*/

		}

		this.selector = new function() {
			// settings for the selection region
			// currently set as a sphere

			this.object3D = null;
			this.center = new THREE.Vector3(0,0,0);
			this.radius = 10.;
            this.distance = 100.;
			this.active = false;
            this.sendingData = false;
		}
		this.inputDataAttributes = {};


		setDefaultViewerParams(this);
	};
}
