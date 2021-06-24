//all "global" variables are contained within params object
var GUIParams;

function defineGUIParams(){
	GUIParams = new function(){

		//for the cube
		this.cube = null;
		this.scene = null;
		this.renderer = null;
		this.container = null;
		this.camera = null;
		this.controls = null;
		this.controlsName = null
		this.keyboard = null;
		this.animating = false;

		//for frustum      
		this.zmax = 5.e10;
		this.zmin = 1;
		this.fov = 45.
		this.flyffac = 0.2;
		
		//when ready the GUI will be created
		this.waitForInit = null;
		this.GUIready = true;

		this.cameraNeedsUpdate = false; 

		//for show/hide UI
		this.movingUI = false;
		this.UIhidden = false;

		//for dropdowns
		this.gtoggle = {};

		//for sockets
		this.usingSocket = true;
		this.local = false; //for GUI and viewer in one but still using sockets?

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

		this.currentlyShownFilter = {};

		//the startup file
		this.startup = "data/startup.json";
		this.filenames = null;
		this.dir = {};


		//for setting the width
		this.containerWidth = 300; //pixels
		
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
        this.definedColorbarContainer = false;

		this.fkeys = null;
		this.filterVals = null;
		this.filterLims = null;
		this.invertFilter = null;

		this.columnDensity = false;
		
		this.updateTween = false;
		this.inTween = false;

		//only need to pass the position, rotation, direction portion of the camera
		this.cameraPosition = new THREE.Vector3(0,0,0);
		this.cameraRotation = new THREE.Vector3(0,0,0);
		this.cameraUp = new THREE.Vector3(0,0,0);
		this.cameraDirection = new THREE.Vector3(0,0,0);
		this.useTrackball = true;
		this.useStereo = false;

		this.renderWidth = 1920;
		this.renderHeight = 1200;

		this.boxSize = 1.;

		//only need to pass the controls target?
		this.controlsTarget = new THREE.Vector3(0,0,0);

		//check for mobile
		//https://stackoverflow.com/questions/3514784/what-is-the-best-way-to-detect-a-mobile-device-in-jquery
		// device detection
		this.isMobile = false;
		if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) 
		|| /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) this.isMobile = true;

	};
}
