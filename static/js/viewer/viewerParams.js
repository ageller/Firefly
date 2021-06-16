//all "global" variables are contained within params object
var viewerParams;

function defineViewerParams(){
	viewerParams = new function() {
		this.container = null;
		this.scene = null;
		this.camera = null;
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
	};
}
