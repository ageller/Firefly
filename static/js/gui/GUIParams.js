//all "global" variables are contained within params object
var GUIParams;

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

		this.partsKeys;
		this.PsizeMult = {};
		this.plotNmax = {};
		this.decimate;
		this.stereoSepMax;
		this.friction;
		
		this.colormapVals = {};
		this.ckeys = {};
		this.colormapVariable = {};
		this.colormap = {};
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
