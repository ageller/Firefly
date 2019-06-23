//all "global" variables are contained within params object
var viewerParams;
var GUIParams;
var socketParams;

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
		this.SliderF = {};
		this.SliderFmin = {};
		this.SliderFmax = {};
		this.SliderFinputs = {};
		this.updateFilter = {};
		this.filterLims = {};
		this.filterVals = {};
		this.invertFilter = {};

		//for frustum      
		this.zmax = 5.e10;
		this.zmin = 1;
		this.fov = 45.



		//camera controls
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

		//for single sliders
		this.SliderN = {};
		this.SliderNmin = {};
		this.SliderNmax = {};
		this.SliderNInputs = {};
		this.SliderD;
		this.SliderDmin;
		this.SliderDmax;
		this.SliderDInputs;
		this.SliderCF;
		this.SliderCFmin;
		this.SliderCFmax;
		this.SliderCFInputs;
		this.SliderSS;
		this.SliderSSmin;
		this.SliderSSmax;
		this.SliderSSInputs;

		//help screen
		this.helpMessage = 1;

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

		// colormap sliders
		this.SliderCMapinputs = {};
		this.updateColormap = {};
		this.SliderCMap = {};
		this.SliderCMapmin = {};
		this.SliderCMapmax = {};


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

		//when ready the GUI will be created
		this.waitForInit = null;
		this.ready = false; 
	};
}

function defineGUIParams(){
	GUIParams = new function(){
		//for show/hide UI
		this.movingUI = false;
		this.UIhidden = false;

		//when ready the GUI will be created
		this.waitForInit = null;
		this.ready = false; 

		//for dropdowns
		this.gtoggle = {};

		//for sockets
		this.usingSocket = true;

		// list of all colormaps
		this.colormapList = ['viridis', 'plasma', 'inferno', 'magma', 
		'Greys', 'Purples', 'Blues', 'Greens', 'Oranges',
		'binary', 'gist_yarg', 'gist_gray', 'gray', 'afmhot',
		'PiYG', 'PRGn', 'BrBG', 'RdGy', 'coolwarm', 'bwr',
		'Pastel1', 'Pastel2', 'Paired', 'Accent', 'Dark2', 'Set1',
	 	'flag', 'prism', 'ocean', 'gist_earth', 'terrain', 'gist_stern'];
	 	
		///////////////////
		// these below are shared with viewerParams (passed from viewerParams to GUIParams)

		// slider limits for colormap
		this.colormapVals = {};

		// list of possible colormap variables for each particle type
		this.ckeys = {};

		// determines which colormap variable is activated for each particle type
		this.colormapVariable = {};

		// determines which colormap is applied to each particle type
		this.colormap = {};

		// determines if colormap is on or off
		this.showColormap = {};


		//only need to pass the position, rotation, direction portion of the camera
		this.cameraPosition = new THREE.Vector3(0,0,0);
		this.cameraRotation = new THREE.Vector3(0,0,0);
		this.cameraDirection = new THREE.Vector3(0,0,0);
		this.useTrackball = true;

		//only need to pass the controls target?
		this.controlsTarget = new THREE.Vector3(0,0,0);
	};
}

function defineSocketParams(){
	socketParams = new function() {

		//flask + socketio
		// Use a "/test" namespace.
		// An application can open a connection on multiple namespaces, and
		// Socket.IO will multiplex all those connections on a single
		// physical channel. If you don't care about multiple channels, you
		// can set the namespace to an empty string.
		this.namespace = '/test';
		// Connect to the Socket.IO server.
		// The connection URL has the following format:
		//     http[s]://<domain>:<port>[/<namespace>]
		this.socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + this.namespace);

	}
}