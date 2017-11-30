//all global variables

var container, scene, MWscene, MWInnerScene, camera, renderer, controls, effect;
var keyboard = new KeyboardState();

var partsMesh = {};
var parts = null;

var camDist = 1.;
var camDist0 = 1.;
var camPrev = 1.;
var width0 = 1.;
var height0 = 1.;

var loaded = false;

//positions, will be rest below ()
var center;
var centerMag;
var boxSize = 0.;

//plotting fields
var plotParts = {};

//particle size multiplicative factor
var PsizeMult = {};

//particle default colors;
var Pcolors = {};
//Decimation
var pposMin = [0, 0, 0, 0];
var pposMax = [0, 0, 0, 0];
var partsLength = [0, 0, 0, 0];
var Decimate = 1;
var tickwait = 1;
var addtickwait = 10;
var drawit = true;
var redraw = false;
var tickN = 0

//Filtering
//I need to add a small factor because the precision of the noUiSlider effects the filtering
var fkeys = {};
var SliderF = {};
var SliderFmin = {};
var SliderFmax = {};
var SliderFinputs = {};

var partsKeys;
var partsUse = {};
var updateFilter = {};

//for frustum
var zmax = 10000;
var zmin = 1;
var fov = 45.

var loaded = false;

// for dropdowns
var gtoggle = {"Camera":true};
var plotNmax = {};
var filterLims = {};

//for rendering to image
var renderWidth = 1920;
var renderHeight = 1200;

//for deciding whether to show velocity vectors
var showVel = {};
var velopts = ['line', 'arrow', 'cone']
var velType = {};

//for single sliders
var SliderN = {};
var SliderNmin = {};
var SliderNmax = {};
var SliderNInputs = {};
var SliderP = {};
var SliderPmin = {};
var SliderPmax = {};
var SliderPInputs = {};
var SliderD;
var SliderDmin;
var SliderDmax;
var SliderDInputs;
var keepAlpha = true;

//help screen
var helpMessage = 1;

var incfoo = 0.;

function init() {
	// scene
	scene = new THREE.Scene();

	// camera
	var screenWidth = window.innerWidth;
	var screenHeight = window.innerHeight;
	var fov = 45;
	var aspect = screenWidth / screenHeight;
	var zmin = 1.;
	var zmax = 5.e10;
	camera = new THREE.PerspectiveCamera( fov, aspect, zmin, zmax);
	scene.add(camera);

	camera.position.set(0,0,-1000);//center.x, center.y, center.z); 
	camera.lookAt(scene.position);	

	var dist = scene.position.distanceTo(camera.position);
	var vFOV = THREE.Math.degToRad( camera.fov ); // convert vertical fov to radians
	height0 = 2 * Math.tan( vFOV / 2 ) * dist; // visible height
	width0 = height0 * camera.aspect;           // visible width

	// renderer
	if ( Detector.webgl )
		renderer = new THREE.WebGLRenderer( {antialias:true} );
	else
		renderer = new THREE.CanvasRenderer(); 
	renderer.setSize(screenWidth, screenHeight);
	container = document.getElementById('WebGLContainer');
	container.appendChild( renderer.domElement );

	// events
	THREEx.WindowResize(renderer, camera);
	THREEx.FullScreen.bindKey({ charCode : 'm'.charCodeAt(0) });

	// controls
	controls = new THREE.TrackballControls( camera, renderer.domElement );
	//controls.dynamicDampingFactor = params.friction;
 	//controls.zoomSpeed = params.zoomSpeed;

	// light
	//var light = new THREE.PointLight(0xffffff);
	//light.position.set(100,250,100);
	//scene.add(light);


	//stereo
	effect = new THREE.StereoEffect( renderer );
	effect.setAspect(1.);
	//effect.setEyeSeparation(params.stereoSep);

	
	camera.up.set(0, -1, 0);

}


function calcFilterLimits(p, fkey){
//calculate limits for the filters
   	
	var j=0;
	if (parts[p][fkey] != null){
	   	var i=0;
	   	min = parts[p][fkey][i];
	   	max = parts[p][fkey][i];
	   	for (i=0; i< parts[p][fkey].length; i++){
	   		min = Math.min(min, parts[p][fkey][i]);
	   		max = Math.max(max, parts[p][fkey][i]);
	   	}
	   	//need to add a small factor here because of the precision of noUIslider
	   	min -= 0.001;
	   	max += 0.001;
	   	filterLims[p][fkey] = [min, max];
	}
}

function calcVelVals(p){
    parts[p].VelVals = [];
    parts[p].magVelocities = [];
    var mag, angx, angy, v;
    var max = -1.;
    var min = 1.e20;
    for (var i=0; i<parts[p].Velocities.length; i++){
        v = parts[p].Velocities[i];
        mag = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
        angx = Math.atan2(v[1],v[0]);
        angy = Math.acos(v[2]/mag);
        if (mag > max){
            max = mag;
        }
        if (mag < min){
            min = mag;
        }
        parts[p].VelVals.push([mag, angx, angy]);
        parts[p].magVelocities.push(mag);
    }
    for (var i=0; i<parts[p].Velocities.length; i++){
        parts[p].VelVals[i].push(parts[p].VelVals[i][0]/(max - min));
    }

}
//initialize various values for the parts dict from the input data file, 
function initPVals(){
	for (var i=0; i<partsKeys.length; i++){
		var p = partsKeys[i];
		partsMesh[p] = [];
		PsizeMult[p] = parts[p].sizeMult;
		Pcolors[p] = parts[p].color;
		updateFilter[p] = false;
		filterLims[p] = {};
		gtoggle[p] = true;
		plotNmax[p] = parts[p].Coordinates.length;
		plotParts[p] = true;

		parts[p].nMaxPlot = Math.min(parts[p].nMaxPlot, parts[p].Coordinates.length);

        if (parts[p].Velocities != null){
            calcVelVals(p);
            parts[p].filterKeys.push("magVelocities");
            velType[p] = 'line';
            //console.log(p, parts[p].VelVals, parts[p].Velocities)
        }
        showVel[p] = false;
        fkeys[p] = parts[p].filterKeys;
        for (var k=0; k<fkeys[p].length; k++){
            calcFilterLimits(p, fkeys[p][k]);
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
    center = new THREE.Vector3(sum[0]/coords.length, sum[1]/coords.length, sum[2]/coords.length);
    centerMag = Math.sqrt(center[0]*center[0] + center[1]*center[1] + center[2]*center[2]);

    var fee, foo;
    for( var i = 0; i < coords.length; i++ ){
    	foo = new THREE.Vector3(coords[i][0], coords[i][0], coords[i][0]);
    	fee = center.distanceTo(foo)
    	if (fee > boxSize){
    		boxSize = fee;
    	}
	}
}


function loadData(callback){
	d3.json("data/filenames.json",  function(files) {
	//d3.json("data/filenamesBox.json",  function(files) {
		console.log(files)
    	partsKeys = Object.keys(files);
    	parts = {};
    	partsKeys.forEach( function(p, i) {
    		parts[p] = {};
			d3.json("data/"+files[p],  function(foo) {
		//	d3.json(files[p],  function(foo) {
				parts[p] = foo;
				if (i ==  partsKeys.length-1){
					setTimeout(function(){ callback(); }, 100); //silly, but seems to fix the problem with loading
				}
			});
    	});


	});

}


function WebGLStart(){

	clearloading();

//initialize
    setCenter(parts[partsKeys[0]].Coordinates);
	initPVals();

	document.addEventListener('mousedown', handleMouseDown);
	document.addEventListener('mouseup', handleMouseUp);

	init();
    updateUICenterText();

	createUI();
    mouseDown = false;  //silly fix

//draw everything
	drawScene();

//begin the animation
	animate();
}

//////this will load the data, and then start the WebGL rendering
loadData(WebGLStart);
