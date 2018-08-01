//all "global" variables are contained within params object
var params;
function defineParams(){
	ParamsInit = function() {

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

		//for frustum      
		this.zmax = 5.e10;
		this.zmin = 1;
		this.fov = 45.

		// for dropdowns
		this.gtoggle = {};

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
		this.SliderP = {};
		this.SliderPmin = {};
		this.SliderPmax = {};
		this.SliderPInputs = {};
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
		this.movingUI = false;
		this.UIhidden = false;
		
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

	};


	params = new ParamsInit();

}

function initControls(){

	if (params.useTrackball) {
		xx = params.camera.getWorldDirection()
		params.controls = new THREE.TrackballControls( params.camera, params.renderer.domElement );
		params.controls.target = new THREE.Vector3(params.camera.position.x + xx.x, params.camera.position.y + xx.y, params.camera.position.z + xx.z);
		if (params.parts.options.hasOwnProperty('center') && !params.switchControls){
			if (params.parts.options.center != null){
				params.controls.target = new THREE.Vector3(params.parts.options.center[0], params.parts.options.center[1], params.parts.options.center[2]);

			}
		} 

		params.controls.dynamicDampingFactor = params.friction;

	} else {
		if (params.haveUI){
			elm = document.getElementById("CenterCheckBox");
			elm.checked = false;
			elm.value = false;
		}
		params.controls = new THREE.FlyControls( params.camera , params.renderer.domElement);
		params.controls.movementSpeed = 1. - Math.pow(params.friction, params.flyffac);

	}

	params.switchControls = false;


	if (params.haveUI){
		updateUICenterText();
		updateUICameraText();
		updateUIRotText();
	}
}

function init() {
	var screenWidth = window.innerWidth;
	var screenHeight = window.innerHeight;
	var aspect = screenWidth / screenHeight;

	if (params.reset){
		params.scene = null;
		params.camera = null;
	} else{

		 //keyboard
		params.keyboard = new KeyboardState();

		// renderer
		if ( Detector.webgl ) {
			params.renderer = new THREE.WebGLRenderer( {
				antialias:true,
				//preserveDrawingBuffer: true , //so that we can save the image
			} );
		} else {
			params.renderer = new THREE.CanvasRenderer(); 
		}
		params.renderer.setSize(screenWidth, screenHeight);
		params.normalRenderer = params.renderer;

		d3.select('#WebGLContainer').selectAll("canvas").remove();

		params.container = document.getElementById('WebGLContainer');
		params.container.appendChild( params.renderer.domElement );

		//stereo
		params.effect = new THREE.StereoEffect( params.renderer );
		params.effect.setAspect(1.);
		params.effect.setEyeSeparation(params.stereoSep);
	}


	// scene
	params.scene = new THREE.Scene();     

	// camera
	params.camera = new THREE.PerspectiveCamera( params.fov, aspect, params.zmin, params.zmax);
	params.camera.up.set(0, -1, 0);
	params.scene.add(params.camera);  

	// events
	THREEx.WindowResize(params.renderer, params.camera);
	//THREEx.FullScreen.bindKey({ charCode : 'm'.charCodeAt(0) });


	params.useTrackball = true;

	//console.log(params.parts.options);
	setCenter(params.parts[params.partsKeys[0]].Coordinates);
	params.camera.position.set(params.center.x, params.center.y, params.center.z - params.boxSize/2.);
	params.camera.lookAt(params.scene.position);  

	//apply presets from the options file
	applyOptions();

	// controls
	initControls();

}

function applyOptions(){

	//initialize center
	if (params.parts.options.hasOwnProperty('center')){
		if (params.parts.options.center != null){
			params.center = new THREE.Vector3(params.parts.options.center[0], params.parts.options.center[1], params.parts.options.center[2]);
			setBoxSize(params.parts[params.partsKeys[0]].Coordinates);
		} else {
			params.parts.options.center = [params.center.x, params.center.y, params.center.z];
		}
	} else {
		params.parts.options.center = [params.center.x, params.center.y, params.center.z];
	}

	//change location of camera
	if (params.parts.options.hasOwnProperty('camera')){
		if (params.parts.options.camera != null){
			params.camera.position.set(params.parts.options.camera[0], params.parts.options.camera[1], params.parts.options.camera[2]);
		}
	} 

	//change the rotation of the camera (which requires Fly controls)
	if (params.parts.options.hasOwnProperty('cameraRotation')){
		if (params.parts.options.cameraRotation != null){
			params.useTrackball = false;
			params.camera.rotation.set(params.parts.options.cameraRotation[0], params.parts.options.cameraRotation[1], params.parts.options.cameraRotation[2]);
		}
	}

	//check if we are starting in Fly controls
	if (params.parts.options.hasOwnProperty('startFly')){
		if (params.parts.options.startFly == true){
			params.useTrackball = false;
		}
	}

	//modify the initial friction
	if (params.parts.options.hasOwnProperty('friction')){
		if (params.parts.options.friction != null){
			params.friction = params.parts.options.friction;
		}
	}

	//check if we are starting in Stereo
	if (params.parts.options.hasOwnProperty('stereo')){
		if (params.parts.options.stereo == true){
			params.normalRenderer = params.renderer;
			params.renderer = params.effect;
			params.useStereo = true;
			if (params.haveUI){
				elm = document.getElementById("StereoCheckBox");
				elm.checked = true;
				elm.value = true;
			}
		}
	}

	//modify the initial stereo separation
	if (params.parts.options.hasOwnProperty('stereoSep')){
		if (params.parts.options.stereoSep != null){
			params.stereoSep = params.parts.options.stereoSep;
			params.effect.setEyeSeparation(params.stereoSep);

		}
	}

	//modify the initial decimation
	if (params.parts.options.hasOwnProperty('decimate')){
		if (params.parts.options.decimate != null){
			params.decimate = params.parts.options.decimate;
		}
	}

	//maximum range in calculating the length the velocity vectors
	if (params.parts.options.hasOwnProperty("maxVrange")){
		if (params.parts.options.maxVrange != null){
			params.maxVrange = params.parts.options.maxVrange; //maximum dynamic range for length of velocity vectors
			for (var i=0; i<params.partsKeys.length; i++){
				var p = params.partsKeys[i];
				if (params.parts[p].Velocities != null){
					calcVelVals(p);		
				}
			}
		}
	}

	//particle specific options
	for (var i=0; i<params.partsKeys.length; i++){
		var p = params.partsKeys[i];

		//on/off
		if (params.parts.options.hasOwnProperty("showParts")){
			if (params.parts.options.showParts != null){
				if (params.parts.options.showParts.hasOwnProperty(p)){
					if (params.parts.options.showParts[p] != null){
						params.showParts[p] = params.parts.options.showParts[p];
					}
				}
			}
		}

		//size
		if (params.parts.options.hasOwnProperty("sizeMult")){
			if (params.parts.options.sizeMult != null){
				if (params.parts.options.sizeMult.hasOwnProperty(p)){
					if (params.parts.options.sizeMult[p] != null){
						params.PsizeMult[p] = params.parts.options.sizeMult[p];
					}
				}
			}
		}

		//color
		if (params.parts.options.hasOwnProperty("color")){
			if (params.parts.options.color != null){
				if (params.parts.options.color.hasOwnProperty(p)){
					if (params.parts.options.color[p] != null){
						params.Pcolors[p] = params.parts.options.color[p];
					}
				}
			}
		}



		//maximum number of particles to plot
		if (params.parts.options.hasOwnProperty("plotNmax")){
			if (params.parts.options.plotNmax != null){
				if (params.parts.options.plotNmax.hasOwnProperty(p)){
					if (params.parts.options.plotNmax[p] != null){
						params.plotNmax[p] = params.parts.options.plotNmax[p];
					}
				}
			}
		}

		//start plotting the velocity vectors
		if (params.parts.options.hasOwnProperty("showVel")){
			if (params.parts.options.showVel != null){
				if (params.parts.options.showVel.hasOwnProperty(p)){
					if (params.parts.options.showVel[p] == true){
						params.showVel[p] = true;
						if (params.haveUI){
							elm = document.getElementById(p+'velCheckBox');
							elm.checked = true;
							elm.value = true;
						}
					}
				}
			}
		}

		//type of velocity vectors
		if (params.parts.options.hasOwnProperty("velType")){
			if (params.parts.options.velType != null){
				if (params.parts.options.velType.hasOwnProperty(p)){
					if (params.parts.options.velType[p] == 'line' || params.parts.options.velType[p] == 'arrow' || params.parts.options.velType[p] == 'triangle'){
						params.velType[p] = params.parts.options.velType[p];
					}
				}
			}
		}

		//filter limits
		if (params.parts.options.hasOwnProperty("filterLims")){
			if (params.parts.options.filterLims != null){
				if (params.parts.options.filterLims.hasOwnProperty(p)){
					if (params.parts.options.filterLims[p] != null){
						params.updateFilter[p] = true

						for (k=0; k<params.fkeys[p].length; k++){
							var fkey = params.fkeys[p][k]
							if (params.parts.options.filterLims[p].hasOwnProperty(fkey)){
								if (params.parts.options.filterLims[p][fkey] != null){
									params.filterLims[p][fkey] = []
									params.filterLims[p][fkey].push(params.parts.options.filterLims[p][fkey][0]);
									params.filterLims[p][fkey].push(params.parts.options.filterLims[p][fkey][1]);
								}
							}
						}

					}
				}
			}
		}

		//filter values
		if (params.parts.options.hasOwnProperty("filterVals")){
			if (params.parts.options.filterVals != null){
				if (params.parts.options.filterVals.hasOwnProperty(p)){
					if (params.parts.options.filterVals[p] != null){
						params.updateFilter[p] = true

						for (k=0; k<params.fkeys[p].length; k++){
							var fkey = params.fkeys[p][k]
							if (params.parts.options.filterVals[p].hasOwnProperty(fkey)){
								if (params.parts.options.filterVals[p][fkey] != null){
									params.filterVals[p][fkey] = []
									params.filterVals[p][fkey].push(params.parts.options.filterVals[p][fkey][0]);
									params.filterVals[p][fkey].push(params.parts.options.filterVals[p][fkey][1]);
								}
							}
						}

					}
				}
			}
		}
	}


}


function calcFilterLimits(p, fkey){
//calculate limits for the filters
	
	var j=0;
	if (params.parts[p][fkey] != null){
		var i=0;
		min = params.parts[p][fkey][i];
		max = params.parts[p][fkey][i];
		for (i=0; i< params.parts[p][fkey].length; i++){
			min = Math.min(min, params.parts[p][fkey][i]);
			max = Math.max(max, params.parts[p][fkey][i]);
		}
		//need to add a small factor here because of the precision of noUIslider
		min -= 0.001;
		max += 0.001;
		params.filterLims[p][fkey] = [min, max];
		params.filterVals[p][fkey] = [min, max];
	}
}

function calcVelVals(p){
	params.parts[p].VelVals = [];
	params.parts[p].magVelocities = [];
	var mag, angx, angy, v;
	var max = -1.;
	var min = 1.e20;
	var vdif = 1.;
	for (var i=0; i<params.parts[p].Velocities.length; i++){
		v = params.parts[p].Velocities[i];
		mag = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
		angx = Math.atan2(v[1],v[0]);
		angy = Math.acos(v[2]/mag);
		if (mag > max){
			max = mag;
		}
		if (mag < min){
			min = mag;
		}
		params.parts[p].VelVals.push([v[0],v[1],v[2]]);
		params.parts[p].magVelocities.push(mag);
	}
	vdif = Math.min(max - min, params.maxVrange);
	for (var i=0; i<params.parts[p].Velocities.length; i++){
		params.parts[p].VelVals[i].push( THREE.Math.clamp((params.parts[p].magVelocities[i] - min) / vdif, 0., 1.));
	}
}
//initialize various values for the parts dict from the input data file, 
function initPVals(){


	for (var i=0; i<params.partsKeys.length; i++){
		var p = params.partsKeys[i];
		if (! params.reset){
			params.partsMesh[p] = [];
		}
		params.updateFilter[p] = false;
		params.filterLims[p] = {};
		params.filterVals[p] = {};
		params.fkeys[p] = [];
		params.plotNmax[p] = params.parts[p].Coordinates.length;
		params.PsizeMult[p] = 1.;


		params.showVel[p] = false;
		if (params.parts[p].Velocities != null){
			if (!params.reset){
				calcVelVals(p);
				if(!params.parts[p].hasOwnProperty("filterKeys")){
					params.parts[p].filterKeys = [];
				}
				params.parts[p].filterKeys.push("magVelocities");
			 
			}
			params.velType[p] = 'line';
			//console.log(p, params.parts[p].VelVals, params.parts[p].Velocities)
		}
		if (params.parts[p].hasOwnProperty("filterKeys")){
			params.fkeys[p] = params.parts[p].filterKeys;
			for (var k=0; k<params.fkeys[p].length; k++){
				calcFilterLimits(p, params.fkeys[p][k]);
			}
		}
	}


}

function setCenter(coords){
	var sum = [0., 0., 0.];
	for( var i = 0; i < coords.length; i++ ){
		sum[0] += coords[i][0];
		sum[1] += coords[i][1];
		sum[2] += coords[i][2];
	}
	params.center = new THREE.Vector3(sum[0]/coords.length, sum[1]/coords.length, sum[2]/coords.length);

	setBoxSize(coords);

}

function setBoxSize(coords){
	var fee, foo;
	for( var i = 0; i < coords.length; i++ ){
		foo = new THREE.Vector3(coords[i][0], coords[i][0], coords[i][0]);
		fee = params.center.distanceTo(foo)
		if (fee > params.boxSize){
			params.boxSize = fee;
		}
	}
}

function countParts(){
	var num = 0.;
	params.partsKeys.forEach( function(p, i) {
		if (params.parts.hasOwnProperty(p)){
			if (params.parts[p].hasOwnProperty('Coordinates')){
				num += params.parts[p].Coordinates.length;
			}
		}
	})
	return num;
}

//if startup.json exists, this is called first
function getFilenames(){
	defineParams();

	d3.json(params.startup,  function(dir) {
		if (dir != null){
			var i = 0;
			params.dir = dir;
			if (Object.keys(params.dir).length > 1){
				i = null
				console.log("multiple file options in startup:", Object.keys(params.dir).length, params.dir);
				showLoadingButton('#selectStartupButton');
				selectFromStartup();

			} 
			if (i != null && i < Object.keys(params.dir).length){
				d3.json(params.dir[i] + "/filenames.json",  function(files) {
					if (files != null){
						callLoadData(files);
					} else {
						showLoadingButton('#loadDataButton');
						alert("Cannot load data. Please select another directory.");
					}
				});
			}
		} else {
			showLoadingButton('#loadDataButton');
		}
	});
}
//for loading and reading a new data directory
function loadStartup(){
	document.getElementById("inputFilenames").click();
}
//for loading and reading a startup file with multiple entries
function selectFromStartup(){
	var screenWidth = parseFloat(window.innerWidth);

	var dirs = [];
	Object.keys(params.dir).forEach(function(d, i) {
		dirs.push(params.dir[i]);
	});

//https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog
//https://www.w3schools.com/howto/howto_css_modals.asp
	var dialog = d3.select('#splashdivLoader').append('div');
	dialog.attr('id','startupModal').attr('class','modal');

	var form = dialog.append('div')
		.attr('class','modal-content')

	var section = form.append('div')
	section.append('div')
		.attr('class','modal-header')
		.style('font-size','20pt')
		.html('Select the startup directory : <br />');

	var mid = section.append('div')
		.attr('class','modal-body')
		.style('height','20px')

	var select = mid.append('select')
		.attr('id','selectedStartup');

	var options = select.selectAll('option')
		.data(dirs).enter()
			.append('option')
				.text(function (d) { return d; });

	var menu = form.append('div').attr('class','modal-footer');
	menu.append('button')
		.attr('id','cancelSelection')
		.attr('class', 'button')
		.style('width','100px')
		.append('span')
			.text('Cancel');
	menu.append('button')
		.attr('id','submitSelection')
		.attr('class', 'button')
		.style('width','100px')
		.append('span')
			.text('Confirm');


	var updateButton = document.getElementById('selectStartupButton');
	var cancelButton = document.getElementById('cancelSelection');
	var submitButton = document.getElementById('submitSelection');
	var startupModal = document.getElementById('startupModal');
	var selection = document.getElementById('selectedStartup');

	selection.value = dirs[0]
	selection.defaultValue = dirs[0]

	// Update button opens a modal dialog
	updateButton.addEventListener('click', function() {
		startupModal.style.display = "block";
	});

	// Form cancel button closes the modal box
	cancelButton.addEventListener('click', function() {
		startupModal.style.display = "none";
	});

	// submit fires the loader
	submitButton.addEventListener('click', function() {
		startupModal.style.display = "none";
		var f = selection.value+'/filenames.json';
		d3.json(f,  function(files) {
			if (files != null){
				callLoadData(files);
			} else {
				alert("Cannot load data. Please select another directory.");
			}
		});

	});

}
//show the button on the splash screen
function showLoadingButton(id){
	var screenWidth = parseFloat(window.innerWidth);
	var width = parseFloat(d3.select(id).style('width'));
	d3.select(id)
		.style('display','inline')
		.style('margin-left',(screenWidth - width)/2);
}
//once a data directory is identified, this will define the parameters, draw the loading bar and, load in the data
function callLoadData(files){
	var dir = {};
	if (params.hasOwnProperty('dir')){
		dir = params.dir;

	}
	defineParams();
	params.dir = dir;

	drawLoadingBar();
	params.filenames = files;
	loadData(WebGLStart);
}
function loadData(callback){

	document.getElementById("inputFilenames").value = "";

	params.parts = {};
	params.parts.totalSize = 0.;


	//console.log(files)
	params.partsKeys = Object.keys(params.filenames);
	params.partsKeys.forEach( function(p, i) {
		params.filenames[p].forEach( function(f, j) {
			if (f.constructor == Array){ 
				params.parts.totalSize += parseFloat(f[1]);
			} else if (j == 1){
				params.parts.totalSize += parseFloat(f);
			}
		});
	});

	params.partsKeys.forEach( function(p, i) {
		params.parts[p] = {};


		params.filenames[p].forEach( function(f, j) {
			var readf = null;
			if (f.constructor == Array){
				readf = "data/"+f[0];
			} else if (j == 0){
				readf = "data/"+f
			}
			//console.log(readf)
			if (readf != null){
				//console.log("f = ", f)
				d3.json(readf,  function(foo) {
					//console.log("keys", Object.keys(foo), f[0])
					Object.keys(foo).forEach(function(k, jj) {
						//console.log("k = ", k, jj)
						if (params.parts[p].hasOwnProperty(k)){
							params.parts[p][k] = params.parts[p][k].concat(foo[k]);
							//console.log('appending', k, p, params.parts[p])

						} else {
							params.parts[p][k] = foo[k];
							//console.log('creating', k, p, params.parts[p], foo[k])
						}
					});


					params.loadfrac = countParts()/params.parts.totalSize;
					//console.log("loading", params.loadfrac)
					if (10. * params.loadfrac % 1 < 0.1 || params.loadfrac == 1){
						updateLoadingBar();
					}
					//console.log(d3.selectAll('#loadingRect').node().getBoundingClientRect().width)
					//console.log("counting", countParts(), params.parts.totalSize, params.loadfrac)
					if (countParts() ==  params.parts.totalSize && params.parts.options.loaded){
						//console.log("here")

						var index = params.partsKeys.indexOf('options');
						if (index > -1) {
							params.partsKeys.splice(index, 1);
							params.parts.options0 = JSON.parse(JSON.stringify(params.parts.options));
						}



						callback(); 
					}

				});
			}
		});
	});

 

}

function drawLoadingBar(){
	d3.select('#loadDataButton').style('display','none');
	d3.select('#selectStartupButton').style('display','none');

	var screenWidth = parseFloat(window.innerWidth);

	//Make an SVG Container
	var splash = d3.select("#splashdivLoader")

	splash.selectAll('svg').remove();

	var svg = splash.append("svg")
		.attr("width", screenWidth)
		.attr("height", params.loadingSizeY);

	params.svgContainer = svg.append("g")


	params.svgContainer.append("rect")
		.attr('id','loadingRectOutline')
		.attr("x", (screenWidth - params.loadingSizeX)/2)
		.attr("y", 0)
		.attr("width",params.loadingSizeX)
		.attr("height",params.loadingSizeY)
		.attr('fill','rgba(0,0,0,0)')
		.attr('stroke','#4E2A84')
		.attr('stroke-width', '3')

	params.svgContainer.append("rect")
		.attr('id','loadingRect')
		.attr("x", (screenWidth - params.loadingSizeX)/2)
		.attr("y", 0)//(screenHeight - sizeY)/2)
		.attr("height",params.loadingSizeY)
		.attr('fill','#4E2A84')
		.attr("width",params.loadingSizeX*params.loadfrac);


	window.addEventListener('resize', moveLoadingBar);

}
function updateLoadingBar(){

	//console.log(params.loadfrac, params.loadingSizeX*params.loadfrac)
	d3.selectAll('#loadingRect').transition().attr("width", params.loadingSizeX*params.loadfrac);

}

function moveLoadingBar(){
	var screenWidth = parseFloat(window.innerWidth);
	d3.selectAll('#loadingRectOutline').attr('x', (screenWidth - params.loadingSizeX)/2);
	d3.selectAll('#loadingRect').attr('x', (screenWidth - params.loadingSizeX)/2);
}

//check if the data is loaded
function clearloading(){
	params.loaded = true;
	params.reset = false;

	//show the rest of the page
	d3.select("#ContentContainer").style("visibility","visible")

	console.log("loaded")
	d3.select("#loader").style("display","none")
	d3.select("#splashdiv5").text("Click to begin.");

}


function WebGLStart(){

//reset the window title
	if (params.parts.options.hasOwnProperty('title')){
		window.document.title = params.parts.options.title
	}

	document.addEventListener('mousedown', handleMouseDown);
	document.addEventListener('mouseup', handleMouseUp);

	initPVals();

	init();

	createUI();
	mouseDown = false;  //silly fix

//draw everything
	drawScene();


//begin the animation
	params.pauseAnimation = false;
	animate();
}

/////////////////////
//this is an input file that will fire if there is no startup.json in the data directory
d3.select('body').append('input')
	.attr('type','file')
	.attr('id','inputFilenames')
	.attr('webkitdirectory', true)
	.attr('directory', true)
	.attr('mozdirectory', true)
	.attr('msdirectory', true)
	.attr('odirectory', true)
	.attr('multiple', true)
	.on('change', function(e){
		var foundFile = false;
		for (i=0; i<this.files.length; i++){
			if (this.files[i].name == "filenames.json"){
				foundFile = true;
				var file = this.files[i];
				var reader = new FileReader();
				reader.readAsText(file, 'UTF-8');
				reader.onload = function(){
					var foo = JSON.parse(this.result);
					if (foo != null){
						callLoadData(foo);
					} else {
						alert("Cannot load data. Please select another directory.");
					}
				}
			}
		}
		if (i == this.files.length && !foundFile){
			alert("Cannot load data. Please select another directory.");
		}
	})
	.style('display','None');


//This will define the params object (that contains all "global" variables), then load the data, and then start the WebGL rendering
getFilenames();
