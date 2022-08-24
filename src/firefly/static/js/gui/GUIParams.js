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
		this.flyffac = 1.;
		
		//when ready the GUI will be created
		this.waitForInit = null;
		this.GUIready = true;
		this.GUIbuilt = false;
		this.GUIWidth = 0; //will hold the width of the GUI as a check if it is completely built

		//will hold the GUI width as a check if it's done building
		this.currentGUIwidth = 0;

		this.cameraNeedsUpdate = false; 

		//for show/hide UI
		this.movingUI = false;
		this.UIhidden = false;
		this.collapseGUIAtStart = true;

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

		//check for radii -- set in initViewer
		this.rkeys = {};
		this.radiusVariable = {};

		this.currentlyShownFilter = {};

		//the startup file
		this.startup = "data/startup.json";
		this.filenames = null;
		this.dir = {};


		//for setting the width
		this.containerWidth = 300; //pixels

		var name_file = "static/textures/colormap_names.json";

		var colormapList = [];

		// ABG: this was the best I could do to load a colormap names list...
		d3.json(name_file,  function(name_file) {
			for (i=0; i <32; i++){
				colormapList.push(name_file['names'][i])
			}
			//console.log(colormapList)
		});
		this.colormapList = colormapList

		this.colormapImage = 'static/textures/colormap.png';
		// get the image size
		var img = new Image();
		img.onload = function(){
			this.colormapImageX = img.width;
			this.colormapImageY = img.height;
			//console.log("checking", this.colormapImageX, this.colormapImageY)
			img = null;
		}.bind(this)
		img.src = this.colormapImage;

		this.colormapScale = 2; //size scale for the final colorbar

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

		this.animateVel = null;
		this.animateVelDt = null;
		this.animateVelTmax = null;
		this.velVectorWidth = null;

		this.blendingOpts = null; 
		this.blendingMode = null; 

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
		this.CDmin = 1;
		this.CDmax = 10;
		this.CDlognorm = 0;
		this.scaleCD = 0.1; //scaling factor for the shader so that it adds up to one at highest density
		
		this.haveTween = false;
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

		// prevent users from accidentally making particles big enough to 
		//  freeze their computer by forcing them to interactively slide the sliders
		//  up to the maximum value after they set it.
		this.safePSizeSliders = true;

		this.haveOctree = {}; //will be initialized to false for each of the parts keys in loadData
		this.haveAnyOctree = false;
		this.octreeMemoryLimit = 0;
		this.octreeNormCameraDistance = {};

		//only need to pass the controls target?
		this.controlsTarget = new THREE.Vector3(0,0,0);

		// extra checking for fly controls
		this.mouseDown = false;

		this.FPS = 0;
		this.memoryUsage = 0;

		this.VideoCapture_duration = 5; // seconds
		this.VideoCapture_FPS = 30; // 30 frames per second
		this.VideoCapture_filename = 'firefly_capture';
		this.VideoCapture_format = 0; // index of format
		this.VideoCapture_formats = ['.gif','.png','.jpg']//,'.webm'] // webm doesn't seem to be working :\
		

		this.GUIState_variables = [
			'built','current','id','name','builder','parent','children','url','button','segments','d3Element'
		]
		//object to hold the current visible window in the GUI
		//current will hold the key that defines the currently visible window
		//the rest of the keys will point to the IDs for the DOM elements that hold those windows
		//the particles state will be populated in createUI
		this.GUIExcludeList = [
		];
		this.GUIState = {
			'current':'main',
			'main':{
				'id':'main',
				'general' : {
					'id':'general',
					'name':'general',
					'data':{
						'id':'data',
						'builder':createControlsBox,
						'decimation':{
							'id':'decimation',
							'builder':createDecimationSegment
						},
						'savePreset':{
							'id':'savePreset',
							'builder':createPresetSegment
						},
						'reset':{
							'id':'reset',
							'builder':createResetSegment
						},
						'loadNewData':{
							'id':'loadNewData',
							'builder':createLoadNewDataSegment
						}
					},
					'camera':{
						'id':'camera',
						'builder':createControlsBox,
						'centerTextBoxes':{
							'id':'centerTextBoxes',
							'builder':createCenterTextBoxesSegment
						},
						'cameraTextBoxes':{
							'id':'cameraTextBoxes',
							'builder':createCameraTextBoxesSegment
						},
						'rotationTextBoxes':{
							'id':'rotationTextBoxes',
							'builder':createRotationTextBoxesSegment
						},
						'cameraButtons':{
						 	'id':'cameraButtons',
							'builder':createCameraButtonsSegment
						},
						'fullScreen':{
							'id':'fullScreen',
							'builder':createFullScreenSegment
						},	
						'cameraFriction':{
							'id':'cameraFriction',
							'builder':createCameraFrictionSegment
						},
						'stereoSep':{
							'id':'stereoSep',
							'builder':createStereoSepSegment
						}
					},
					'capture':{
						'id':'capture',
						'builder':createControlsBox,
						'captureButtons':{
							'id':'captureButtons',
							'builder':createCaptureButtonsSegment
						},
						'captureResolution':{
							'id':'captureResolution',
							'builder':createCaptureResolutionSegment
						},
						'videoDuration':{
							'id':'videoDuration',
							'builder':createVideoDurationSegment
						},
						'videoFormat':{
							'id':'videoDuration',
							'builder':createVideoFormatSegment
						}
					},
					'projection':{
						'id':'projection',
						'builder':createControlsBox,
						'columnDensityCheckBox':{
							'id':'columnDensityCheckBox',
							'builder':createColumnDensityCheckBoxSegment
						},
						'columnDensityLogCheckBox':{
							'id':'columnDensityLogCheckBox',
							'builder':createColumnDensityLogCheckBoxSegment
						},
						'columnDensitySelectCmap':{
							'id':'columnDensitySelectCmap',
							'builder':createColumnDensitySelectCmapSegment
						},
						'columnDensitySliders':{
							'id':'columnDensitySliders',
							'builder':createColumnDensitySlidersSegment
						}
					},
				},
			'particles':{'id':'particles'}
			},
			'colorbarContainer':{
				'id':'colorbarContainer',
				'builder':createColormapContainer
			},
			'FPSContainer':{
				'id':'FPSContainer',
				'builder':createFPSContainer
			},
			'octreeLoadingBarContainer':{
				'id':'octreeLoadingBarContainer',
				'builder':createOctreeLoadingBar
			}
	
		}

		// will hold a list of all the ides from GUIState
		this.GUIIDs = [];

		//check for mobile
		//https://stackoverflow.com/questions/3514784/what-is-the-best-way-to-detect-a-mobile-device-in-jquery
		// device detection
		this.isMobile = false;
		if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) 
		|| /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) this.isMobile = true;

	};
}
