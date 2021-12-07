//all "global" variables are contained within params object
var viewerParams;

function defineViewerParams(){
	viewerParams = new function() {
		this.container = null;
		this.scene = null;
		this.camera = null;
		this.frustum = null;
		this.renderer = null;
		this.controls = null
		this.effect = null;
		this.normalRenderer = null;

		this.keyboard = null;

		this.parts = null;
		this.partsKeys;
		this.partsMesh = {};

		this.loaded = false;

		//positions, will be rest below ()
		this.center;
		this.boxSize = 0.;

		//plotting fields
		this.showParts = {};
		this.updateOnOff = {};

		//particle size multiplicative factor
		this.PsizeMult = {};
		this.vSizeMult = 10.; //factor to multiply velocities vectors by, so we don't always have to increase particle size

		//particle default colors;
		this.Pcolors = {};

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
		this.zmin = 1;
		this.fov = 45.

		//camera controls
		this.useOrientationControls = false;
		this.useTrackball = true;
		this.useStereo = false;
		this.stereoSep = 0.06;
		this.stereoSepMax = 1.;

		//for rendering to image
		this.renderWidth = 1920;
		this.renderHeight = 1200;

		//for deciding whether to show velocity vectors
		this.showVel = {};
		this.velopts = {'line':0., 'arrow':1., 'triangle':2.};
		this.velType = {};
		this.maxVrange = 2000.; //maximum dynamic range for length of velocity vectors (can be reset in options file)
		this.velVectorWidth = {};

		//for deciding whether to animate the velocities
		this.animateVel = {};
		this.animateVelDt = 0;
		this.animateVelTmax = 1;		
		this.animateVelTime = 0;		

		//help screen
		this.helpMessage = false;

		//initial friction value
		this.friction = 0.1;
		this.flyffac = 0.2;
		this.switchControls = false;

		//check to see if the UI exists
		this.haveUI = false;

		this.reset = false;

		
		//for the loading bar
		var screenWidth = window.innerWidth;
		var screenHeight = window.innerHeight;
		this.loadingSizeX = screenWidth*0.5;
		this.loadingSizeY = screenHeight*0.1;
		this.loadfrac = 0.;
		this.drawfrac = 0.;
		this.svgContainer = null;

		//the startup file
		this.startup = "data/startup.json";
		this.filenames = null;
		this.dir = {};

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

		//check if we need to update the colormap when rendering
		this.updateColormap = {};

		//tweening
		this.inTween = false;
		this.updateTween = false;
		this.tweenFile = null;
		this.tweenParams = {};
		this.tweenPos = [];
		this.tweenRot = [];
		this.tweenFileName = "tweenParams.json"

		//render texture to show column density
		this.textureCD = null;
		this.columnDensity = false;
		this.materialCD = null;
		this.sceneCD = null;
		this.cameraCD = null;
		this.scaleCD = 0.1; //scaling factor for the shader so that it adds up to one at highest density
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
		this.fps_list = [];

		//for octree
		this.haveOctree = {}; //will be initialized to false for each of the parts keys in loadData
		this.haveAnyOctree = false; //must be a better way to do this!
		this.FPS = 30; //will be upated in the octree render loop
		this.memoryUsage = 0; //if using Chrome, we can track the memory usage and try to avoid crashes
		this.drawPass = 0;
		this.totalParticlesInMemory = 0; //try to hold the total number of particles in memory

		this.octree = new function() {

			//these should be set from the Options file (and same with some below)
			this.minFracParticlesToDraw = {'default':0.001}; //minimum fraction per node to draw (unless there are less particles than this total in the node) >0;  
			this.particleDefaultSizeScale = {'default':0.1};

			//normalization for the camera distance in deciding how many particles to draw
			//could be included in GUI, will be reset in pruneOctree to be a fraction of boundingBox
			this.normCameraDistance = {'default':1000};

			this.nodes = {};

			//minimum pixel width for a node to require rendering points
			this.minNodeScreenSize = 5;

			//default minimum particles size
			//this.defaultMinParticleSize = 6.;
			this.defaultMinParticleSize = 0.1;

			//will contain a list of nodes that are drawn
			this.alreadyDrawn = [];

			this.toRemove = [];
			this.toRemoveIDs = [];
			this.maxToRemove = 50;
			this.waitingToRemove = false;

			this.removeTimeout = 2; //(s) to wait to add to the remove list (in case the user just moves around a litte)
			this.toRemoveTmp = [];
			this.toRemoveTmpIDs = [];
			this.waitingToAddToRemove = false;

			this.toReduce = [];
			this.toReduceIDs = [];
			this.maxToReduce = 50;
			this.waitingToReduce = false;

			this.toDraw = [];
			this.toDrawIDs = [];
			this.maxFilesToRead = 50;
			this.waitingToDraw = false;
			this.lastDrawnID = '';

			this.drawPass = 1;

			this.minDiffForUpdate = 100; //minumum number of particles that need to be different between drawn and expected for the node to be updated
			this.maxUpdatesPerDraw = this.maxFilesToRead/2; //maximum number of updates to make during a draw loop, to make sure new nodes are always drawn
			this.NUpdate = 0; //will cound the number of nodes needing updates in a render pass

			this.targetFPS = 30; //will be used to controls the NParticleFPSModifier
			this.NParticleFPSModifier = 1.; //will be increased or decreased based on the current fps
			//this.FPSmod = 100;// reset the FPS average every FPSmod draw counts
			this.FPSmod = 1e10;// reset the FPS average every FPSmod draw counts (not sure this is needed anymore, but not ready to remove from code)
			this.boxSize = 0; //will be set based on the root node
			this.pIndex = 0; //will be used to increment through the particles in the render loop

			this.memoryLimit = 5*1e9; //bytes, maximum memory allowed -- for now this is more like a target
			this.NParticleMemoryModifier = 1.; //will be increased or decreased based on the current memory usage
			this.NParticleMemoryModifierFac = 1.;

			this.loadingCount = {}; //will contain an array for each particle type that has the total inView and the total drawn to adjust the loading bar

		}

	};
}
