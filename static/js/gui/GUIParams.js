//all "global" variables are contained within params object
var GUIParams;

function defineGUIParams(){
	GUIParams = new function(){

		//when ready the GUI will be created
		this.waitForInit = null;

		//for show/hide UI
		this.movingUI = false;
		this.UIhidden = false;

		//for dropdowns
		this.gtoggle = {};

		//for sockets
		this.usingSocket = true;

		//check to enable dropdown -- mapped to viewerParams.parts.options.UIdropdown
		this.useDropdown = {}; 

		//check to enable colorpicker -- mapped to viewerParams.parts.options.UIcolorPicker
		this.useColorPicker = {}; 

		//check for velocities -- set in initViewer
		this.haveVelocities = {};

		//check for colormaps -- set in initViewer
		this.haveColormap = {};
		this.haveColormapSlider = {};

		//check for filters -- set in initViewer
		this.haveFilter = {};
		this.haveFilterSlider = {};

		//list of all colormaps
		this.colormapList = ['viridis', 'plasma', 'inferno', 'magma', 
		'Greys', 'Purples', 'Blues', 'Greens', 'Oranges',
		'binary', 'gist_yarg', 'gist_gray', 'gray', 'afmhot',
		'PiYG', 'PRGn', 'BrBG', 'RdGy', 'coolwarm', 'bwr',
		'Pastel1', 'Pastel2', 'Paired', 'Accent', 'Dark2', 'Set1',
	 	'flag', 'prism', 'ocean', 'gist_earth', 'terrain', 'gist_stern'];
	 	

		///////////////////
		// these below are shared with viewerParams (passed from viewerParams to GUIParams)
		this.reset = false;

		this.partsKeys = null;
		this.PsizeMult = null;
		this.plotNmax = null;
		this.decimate = null;
		this.stereoSepMax = null;
		this.friction = null;

		this.Pcolors = null;
		this.showParts = null;
		this.showVel = null;
		this.velopts = null; 
		this.velType = null; 

		this.ckeys = null;
		this.colormapVals = null;
		this.colormapLims = null;
		this.colormapVariable = null;
		this.colormap = null;
		this.showColormap = null;

		this.fkeys = null;
		this.filterVals = null;
		this.filterLims = null;

		//only need to pass the position, rotation, direction portion of the camera
		this.cameraPosition = new THREE.Vector3(0,0,0);
		this.cameraRotation = new THREE.Vector3(0,0,0);
		this.cameraDirection = new THREE.Vector3(0,0,0);
		this.useTrackball = true;
		this.useStereo = false;

		this.renderWidth = 1920;
		this.renderHeight = 1200;

		//only need to pass the controls target?
		this.controlsTarget = new THREE.Vector3(0,0,0);
	};
}
