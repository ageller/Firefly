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
		this.showfps = false;
		this.fps_list = [];

		//for octree
		this.haveOctree = {}; //will be initialized to false for each of the parts keys in loadData
		this.haveAnyOctree = false; //must be a better way to do this!
		this.FPS = 30; //will be upated in the octree render loop
		this.octree = new function() {

			//these should be set from the Options file (and same with some below)
			this.minFracParticlesToDraw = {'Gas':0.001, 'Stars':0.001, 'LRDM':0.001, 'HRDM':0.001}; //minimum fraction per node to draw (unless there are less particles than this total in the node) >0;  
			this.particleDefaultSizeScale = {'Gas':0.1, 'Stars':0.1, 'LRDM':0.1, 'HRDM':0.01};

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
			this.removeCount = 0;
			this.removeIndex = -1;
			this.toDraw = [];
			this.toDrawIDs = [];
			this.drawCount = 0;
			this.drawIndex = -1;
			this.drawPass = 1;
			this.drawStartTime = 0;
			this.maxDrawInterval = 10; //seconds
			this.maxFilesToRead = 50;
			this.maxToRemove = 50;

			this.FPS = 30; //will be changed each render call
			this.targetFPS = 30; //will be used to controls the NParticleFPSModifier
			this.NParticleFPSModifier = 1.; //will be increased or decreased based on the current fps
			//this.FPSmod = 100;// reset the FPS average every FPSmod draw counts
			this.FPSmod = 1e10;// reset the FPS average every FPSmod draw counts (not sure this is needed anymore, but not ready to remove from code)
			this.boxSize = 0; //will be set based on the root node
			this.pIndex = 0; //will be used to increment through the particles in the render loop

			this.loadingCount = {}; //will contain an array for each particle type that has the total inView and the total drawn to adjust the loading bar
			//normalization for the camera distance in deciding how many particles to draw
			//could be included in GUI
			this.normCameraDistance = {'Gas':100,
							   		   'Stars':100,
							   		   'LRDM':100,
								       'HRDM':100};
		}

	};
}
