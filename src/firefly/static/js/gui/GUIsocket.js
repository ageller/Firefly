
//////////////
// socket initialization
// https://blog.miguelgrinberg.com/post/easy-websockets-with-flask-and-gevent
// https://github.com/miguelgrinberg/Flask-SocketIO
//////////////
function connectGUISocket(){
	//$(document).ready(function() {
	document.addEventListener("DOMContentLoaded", function(event) { 

		// this happens when the server connects.
		// all other functions below here are executed when the server emits to that name.
		socketParams.socket.on('connect', function() {
			console.log('sending connection from gui')
			socketParams.socket.emit('connection_test', {data: 'GUI connected!'});
		});
		// socketParams.socket.on('connection_response', function(msg) {
		// 	console.log('connection response', msg);
		// });

		// get the room from the server if the user specified on the command line.  Otherwise prompt the user here for a room.  Then join.
		socketParams.socket.on('room_check', function(msg) {
			console.log('!!!!!!!!! received message about rooms', msg)
			if (!socketParams.room) socketParams.room = msg.room;
			
			// get the room name
			while (!socketParams.room) socketParams.room = prompt("Please enter a session name.  This should be a unique string that you will use for all connections to this session.  Do not include any spaces.");
			console.log('joining room', socketParams.room)
			socketParams.socket.emit('join', {room: socketParams.room});
			flushPendingSocketMessages();

			// tell the viewer we're here. if it loaded data (or put up a data
			//  picker) before this window existed, those messages went nowhere,
			//  so it replays them for us -- see onGUIConnected() in initViewer.js
			if (socketParams.isSeparateGUI) socketParams.socket.emit('gui_connected');
		});


		socketParams.socket.on('update_GUIParams', function(msg) {
			// console.log('===have commands from viewer', msg)
			setParams(msg); 
		});

		socketParams.socket.on('reload_GUI', function(msg) {
			console.log('!!! reloading GUI');
			location.reload();
		});

		socketParams.socket.on('cannot_load_data', function(msg) {
			console.log('!!! cannot load data');
			alert("Cannot load data. Please try again.");
		});
	});
}

///////////////////////
// animate the cube for the detached GUI scene
///////////////////////
// kept outside GUIParams so they survive defineGUIParams(), which is how the GUI
//  gets reset -- otherwise we'd lose the handles and leak the context
var previousGUIRenderer = null;
var previousGUIWindowResize = null;

//this initializes everything needed for the scene
function initGUIScene(){

	var screenWidth = window.innerWidth;
	var screenHeight = window.innerHeight;
	var aspect = screenWidth / screenHeight;

	// this runs again every time the GUI is rebuilt (new dataset, or a viewer
	//  reconnect), so release the previous renderer and its resize listener;
	//  browsers cap how many live WebGL contexts a page may hold
	try {
		if (previousGUIWindowResize) previousGUIWindowResize.stop();
		if (previousGUIRenderer){
			previousGUIRenderer.forceContextLoss();
			previousGUIRenderer.dispose();
		}
	} catch (err) {
		console.warn('Could not fully release the previous GUI renderer:', err);
	}

	// create a renderer for the cube
	if ( Detector.webgl ) {
		GUIParams.renderer = new THREE.WebGLRenderer( {
			antialias:true,
		} );
	} 
	else {
		//Canvas Renderer has been removed, and I can't get the old version to work now
		//GUIParams.renderer = new THREE.CanvasRenderer(); 
		alert("Your browser does not support WebGL.  Therefore Firefly cannot run.  Please use a different browser.");
 
	}

	GUIParams.renderer.setSize(screenWidth, screenHeight);

	d3.select('#WebGLContainer').selectAll("canvas").remove();

	GUIParams.container = document.getElementById('WebGLContainer');
	GUIParams.container.appendChild( GUIParams.renderer.domElement );

	// attach keyboard controls input
	GUIParams.keyboard = new KeyboardState();

	// create scene to hold three.js objects
	GUIParams.scene = new THREE.Scene();     

	// create new camera instance
	GUIParams.camera = new THREE.PerspectiveCamera( GUIParams.fov, aspect, GUIParams.zmin, GUIParams.zmax);
	GUIParams.camera.up.set(0, -1, 0);
	GUIParams.camera.position.z = 30;
	GUIParams.scene.add(GUIParams.camera);  

	// events
	previousGUIRenderer = GUIParams.renderer;
	previousGUIWindowResize = THREEx.WindowResize(GUIParams.renderer, GUIParams.camera);

	// initialize controls for GUI
	initGUIControls(initial=true)
}

// GUIParams.useTrackball changes after initGUIScene() has already built controls:
//  the viewer sends it with the initial params (a dataset with startFly set) and
//  again whenever controls are toggled on the viewer side. Nothing rebuilt the
//  controls to match, so the GUI could report fly while still holding a
//  TrackballControls -- whose default keys are A/S/D, so pressing them drove
//  trackball gestures instead of flying, and the fly listeners below were never
//  attached. That needed a space-space toggle to sort itself out.
function syncGUIControlsToParams(){
	if (!GUIParams.controls) return;

	var wanted = GUIParams.useTrackball ? 'TrackballControls' : 'FlyControls';
	if (GUIParams.controlsName == wanted) return;

	console.log('rebuilding GUI controls as', wanted);
	//  don't notify the viewer: we're catching up to what it already told us
	initGUIControls(false, false);
}

// named so they can actually be removed again; the previous version passed fresh
//  anonymous functions to removeEventListener, which never match, so every switch
//  into fly controls left another copy attached (and mousemove emits to the viewer)
function onGUIMouseDown(){ GUIParams.mouseDown = true; }
function onGUIMouseUp(){ GUIParams.mouseDown = false; }
function onGUIMouseMove(){ if (GUIParams.mouseDown) sendCameraInfoToViewer(); }

function initGUIControls(initial=false, notifyViewer=true){
	console.log("initializing controls", GUIParams.useTrackball)
	var forViewer = [];

	// let the outgoing controls go before replacing them, so their listeners
	//  don't stay on the canvas competing with the new ones
	if (GUIParams.controls && GUIParams.controls.dispose) GUIParams.controls.dispose();

	// the anchor, and so the viewing distance, changes with the controls, so
	//  let the initial cube size be worked out again for this mode
	GUIParams.cubeWorldSize = null;

	d3.select('#WebGLContainer').node().removeEventListener("keydown", sendCameraInfoToViewer,true);//for fly controls
	d3.select('#WebGLContainer').node().removeEventListener("keyup", sendCameraInfoToViewer,true);//for fly controls
	d3.select('#WebGLContainer').node().removeEventListener("mousedown", onGUIMouseDown,true);//for fly controls
	d3.select('#WebGLContainer').node().removeEventListener("mouseup", onGUIMouseUp,true);//for fly controls
	d3.select('#WebGLContainer').node().removeEventListener("mousemove", onGUIMouseMove,true);//for fly controls


	if (!initial) {
		forViewer.push({'setViewerParamByKey':[GUIParams.useTrackball, "useTrackball"]});
		forViewer.push({'initControls':null});
	}

	if (GUIParams.useTrackball) {
		var xx = new THREE.Vector3(0,0,0);
		GUIParams.camera.getWorldDirection(xx);
		GUIParams.controlsName = "TrackballControls";
		GUIParams.controls = new THREE.TrackballControls( GUIParams.camera, GUIParams.renderer.domElement );
		if (!initial) GUIParams.controls.target = new THREE.Vector3(GUIParams.camera.position.x + xx.x, GUIParams.camera.position.y + xx.y, GUIParams.camera.position.z + xx.z);
		
		updateCube();

		if (GUIParams.cameraNeedsUpdate) updateGUICamera();

		// if (GUIParams.parts.options.hasOwnProperty('center') && !GUIParams.switchControls){
		// 	if (GUIParams.parts.options.center != null){
		// 		GUIParams.controls.target = new THREE.Vector3(GUIParams.parts.options.center[0], GUIParams.parts.options.center[1], GUIParams.parts.options.center[2]);

		// 	}

		if (GUIParams.isMobile){
			GUIParams.controls.noPan = true; //disable the pinch+drag for pan on mobile
		}

		GUIParams.controls.dynamicDampingFactor = GUIParams.friction;
		GUIParams.controls.removeEventListener('change', sendCameraInfoToViewer, true);
		GUIParams.controls.addEventListener('change', sendCameraInfoToViewer, true);
	} // if (GUIParams.useTrackball)
	else {
		GUIParams.controlsName = "FlyControls";
		GUIParams.controls = new THREE.FlyControls( GUIParams.camera , GUIParams.renderer.domElement);
		GUIParams.controls.movementSpeed = (1. - GUIParams.friction)*GUIParams.flyffac;

		d3.select('#WebGLContainer').node().addEventListener("keydown", sendCameraInfoToViewer,true);//for fly controls
		d3.select('#WebGLContainer').node().addEventListener("keyup", sendCameraInfoToViewer,true);//for fly controls
		d3.select('#WebGLContainer').node().addEventListener("mousedown", onGUIMouseDown,true);//for fly controls
		d3.select('#WebGLContainer').node().addEventListener("mouseup", onGUIMouseUp,true);//for fly controls
		d3.select('#WebGLContainer').node().addEventListener("mousemove", onGUIMouseMove,true);//for fly controls

		// no target in fly controls: re-capture an anchor ahead of the camera
		GUIParams.cubeFlyAnchor = null;
		updateCube();
	}

	var elm = document.getElementById("CenterCheckBox")
	if (elm != null){
		elm.checked = GUIParams.useTrackball; 
		elm.value = GUIParams.useTrackball;
	}

	//GUIParams.switchControls = false;
	// send signal to viewer that we're done here, if there was information
	// to transmit that'll get sent too.
	if (notifyViewer && forViewer.length) sendToViewer(forViewer);
}

// create a Cube object
// The cube is a world-space stand-in for the data: you orbit it in trackball and
//  fly past it in fly controls. It keeps its original boxSize/100 size, and this
//  is how much of the viewport width it may take up before being capped.
var cubeViewportFraction = 0.25;

// The GUI camera is built in initGUIScene() from GUIParams.zmin/zmax, which at
//  that point are still the defaults (zmin 1) because the dataset's values
//  haven't arrived yet -- and nothing ever updated the camera afterwards. A near
//  plane one dataset-unit out clips anything placed close to the camera, which is
//  exactly where the trackball target (camera + a *unit* view vector) puts the
//  cube. That's what made it invisible until you zoomed a long way out.
function syncGUICameraPlanes(){
	if (!GUIParams.camera) return;
	if (GUIParams.camera.near == GUIParams.zmin && GUIParams.camera.far == GUIParams.zmax) return;

	GUIParams.camera.near = GUIParams.zmin;
	GUIParams.camera.far = GUIParams.zmax;
	GUIParams.camera.updateProjectionMatrix();
}

// width of the visible region at distance d from the camera
function visibleWidthAt(d){
	var aspect = window.innerWidth/window.innerHeight;
	return 2*d*Math.tan(GUIParams.fov*Math.PI/360)*aspect;
}

// the cube's world size, as it always was
function cubeNaturalSize(){
	var s = GUIParams.boxSize/100.;
	if (!s || !isFinite(s) || s <= 0) s = 1.;
	return s;
}

// FlyControls has no target to anchor to. Capture a world point ahead of the
//  camera once, at the distance where the cube fills about cubeViewportFraction
//  of the view, then leave it there -- so flying moves us relative to the cube
//  rather than dragging it along with the camera.
function flyCubeAnchor(){
	if (GUIParams.cubeFlyAnchor) return GUIParams.cubeFlyAnchor;

	// invert visibleWidthAt(): the distance at which the cube looks right
	var aspect = window.innerWidth/window.innerHeight;
	var d = cubeNaturalSize()/(2*cubeViewportFraction*Math.tan(GUIParams.fov*Math.PI/360)*aspect);

	// and keep it clear of both clipping planes
	var near = GUIParams.camera.near || 0.01;
	var far = GUIParams.camera.far || 1.e10;
	if (!d || !isFinite(d)) d = 10*near;
	d = Math.min(Math.max(d, 10*near), far/10.);

	var dir = new THREE.Vector3(0,0,0);
	GUIParams.camera.getWorldDirection(dir);
	GUIParams.cubeFlyAnchor = dir.multiplyScalar(d).add(GUIParams.camera.position);

	return GUIParams.cubeFlyAnchor;
}

// Where the cube belongs. Keyed off useTrackball rather than the presence of
//  .target, because updateGUICamera() assigns a .target onto whatever controls
//  object it finds, FlyControls included.
function cubeAnchorPosition(){
	if (GUIParams.useTrackball && GUIParams.controls && GUIParams.controls.target){
		return GUIParams.controls.target;
	}
	return flyCubeAnchor();
}

// The cube's world size: boxSize/100, shrunk only if that would fill more than
//  cubeViewportFraction of the view from where we first see it. Worked out once
//  and then kept -- the cap is on the *initial* size only, so zooming in still
//  lets the cube grow as large as it likes.
function cubeWorldSize(){
	if (GUIParams.cubeWorldSize) return GUIParams.cubeWorldSize;

	var size = cubeNaturalSize();

	var d = GUIParams.camera.position.distanceTo(cubeAnchorPosition());
	if (d && isFinite(d)) size = Math.min(size, cubeViewportFraction*visibleWidthAt(d));

	GUIParams.cubeWorldSize = size;
	return size;
}

// keep the cube at its anchor. size is fixed in world units (see cubeWorldSize),
//  so it grows and shrinks with distance like any other object in the scene.
function updateCube(){
	if (!GUIParams.cube || !GUIParams.camera) return;
	setCubePosition(cubeAnchorPosition());
	GUIParams.cube.scale.setScalar(cubeWorldSize());
}

function createCube(){
	// unit cube, scaled by updateCube() below, so the size can be re-evaluated
	//  whenever the view changes
	var geometry = new THREE.BoxGeometry(1, 1, 1);
	var cubeMaterials = [ 
		new THREE.MeshBasicMaterial({color:"yellow", side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({color:"orange", side: THREE.DoubleSide}), 
		new THREE.MeshBasicMaterial({color:"red", side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({color:"green", side: THREE.DoubleSide}), 
		new THREE.MeshBasicMaterial({color:"blue", side: THREE.DoubleSide}), 
		new THREE.MeshBasicMaterial({color:"purple", side: THREE.DoubleSide}), 
	]; 
	// Create a MeshFaceMaterial, which allows the cube to have different materials on each face 
	var cubeMaterial = cubeMaterials;
	GUIParams.cube = new THREE.Mesh(geometry, cubeMaterial);
	updateCube();

	GUIParams.scene.add( GUIParams.cube );
}


// bumped each time a new cube loop starts. defineGUIParams() resets
//  GUIParams.animating, so makeUI()'s "if (!animating)" guard isn't enough on
//  its own to stop a second loop -- each loop checks its own generation instead.
var GUILoopGeneration = 0;

//this is the animation loop
function animateGUI(time) {
	GUILoopGeneration += 1;
	var myGeneration = GUILoopGeneration;
	GUIParams.animating = true;

	function loop(t){
		// a newer loop has taken over
		if (myGeneration != GUILoopGeneration) return;

		// queue the next frame before doing the work, as the original did: an
		//  exception in animateGUIupdate() must not be able to kill the loop
		//  and leave the GUI's scene frozen
		requestAnimationFrame( loop );

		try {
			animateGUIupdate();
		} catch (err) {
			if (!GUIParams.loopErrorLogged){
				GUIParams.loopErrorLogged = true;
				console.error('Error in the GUI render loop:', err);
			}
		}
	}
	loop(time);


	// //send the camera info back to the flask app, and then on to the viewer
	// if (internalParams.controls.changed){
	// 	internalParams.socket.emit('camera_input',{
	// 		"position":internalParams.camera.position,
	// 		"rotation":internalParams.camera.rotation,
	// 		"up":internalParams.camera.up
	// 	});
	// 	//send the controls infro back to the flask app, and then on to the viewer
	// 	internalParams.socket.emit('controls_input',{
	// 		"target":internalParams.controls.target,
	// 	});
	// }
}

function animateGUIupdate(){
	// the dataset's zmin/zmax arrive after the camera was built
	syncGUICameraPlanes();

	// make sure the controls we're holding are the kind GUIParams says we are
	syncGUIControlsToParams();

	if (GUIParams.controls) GUIParams.controls.update();

	// cheap, and keeps the cube correct no matter what order the viewer's
	//  camera/centre/boxSize params arrived in
	updateCube();

	if (GUIParams.keyboard){
		GUIParams.keyboard.update();

		// handle keyboard event to swap control mode
		if (GUIParams.keyboard.down("space")){
			GUIParams.useTrackball = !GUIParams.useTrackball;
			//GUIParams.switchControls = true;
			GUIParams.controls.dispose();
			initGUIControls();
		}

		// increase and decrease speed for fly controls
		if (GUIParams.keyboard.down("+")){
			GUIParams.flyffac += 1;
			sendToViewer([{'setViewerParamByKey':[GUIParams.flyffac, "flyffac"]}]);
			updateFlyMovementSpeed(GUIParams.flyffac);
			console.log('fly speed', GUIParams.flyffac)
		}
		if (GUIParams.keyboard.down("-")){
			GUIParams.flyffac = Math.max(1., GUIParams.flyffac - 1);
			sendToViewer([{'setViewerParamByKey':[GUIParams.flyffac, "flyffac"]}]);
			updateFlyMovementSpeed(GUIParams.flyffac);
			console.log('fly speed', GUIParams.flyffac)
		}

		// handle keyboard event to initialize tweening
		if (GUIParams.keyboard.down("T")) {
			if (GUIParams.inTween){
				GUIParams.updateTween = false;
				GUIParams.inTween = false;
				var forViewer = [];
				forViewer.push({'setViewerParamByKey':[GUIParams.updateTween, "updateTween"]});
				forViewer.push({'setViewerParamByKey':[GUIParams.inTween, "inTween"]});
				sendToViewer(forViewer);
			} 
			else {
				console.log("tweening")
				GUIParams.inTween = true;
				GUIParams.updateTween = true;	
				var forViewer = [];
				forViewer.push({'setViewerParamByKey':[GUIParams.updateTween, "updateTween"]});
				forViewer.push({'setTweenviewerParams':['static/']});
				sendToViewer(forViewer);
			}
		}

		// handle keyboard event to render in column density mode (in the viewer)
		if (GUIParams.keyboard.down("P")){
			GUIParams.columnDensity = !GUIParams.columnDensity;
			sendToViewer([{'setViewerParamByKey':[GUIParams.columnDensity, "columnDensity"]}]);
		}
	}

	// now we can render, don't have to worry about rendering targets, just render straight
	//  to the canvas. 
	if (GUIParams.renderer) GUIParams.renderer.render( GUIParams.scene, GUIParams.camera );

}

//////////////
// socket communication
//////////////

function sendCameraInfoToViewer(){

	var xx = new THREE.Vector3(0,0,0);
	GUIParams.camera.getWorldDirection(xx);

	var forViewer = [];
	forViewer.push({'setViewerParamByKey':[GUIParams.camera.position, "cameraPosition"]});
	forViewer.push({'setViewerParamByKey':[GUIParams.camera.rotation, "cameraRotation"]});
	forViewer.push({'setViewerParamByKey':[GUIParams.camera.up, "cameraUp"]});
	forViewer.push({'setViewerParamByKey':[xx, "cameraDirection"]});
	if (GUIParams.useTrackball) forViewer.push({'setViewerParamByKey':[GUIParams.controls.target, "controlsTarget"]});

	forViewer.push({'updateViewerCamera':null});
	//console.log(GUIParams.camera.position, GUIParams.camera.rotation, GUIParams.camera.up);

	sendToViewer(forViewer);

	// in case we are not in trackball controls, this needs to be set (but might as well set it here always)
	GUIParams.cameraPosition = GUIParams.camera.position.clone();
	updateUICameraText();
}

function updateGUICamera(){
	if (GUIParams.camera){
		GUIParams.camera.position.set(
			GUIParams.cameraPosition.x,
			GUIParams.cameraPosition.y,
			GUIParams.cameraPosition.z);
		GUIParams.camera.rotation.set(
			GUIParams.cameraRotation._x,
			GUIParams.cameraRotation._y,
			GUIParams.cameraRotation._z);
		GUIParams.camera.up.set(
			GUIParams.cameraUp.x,
			GUIParams.cameraUp.y,
			GUIParams.cameraUp.z);
		GUIParams.controls.target = new THREE.Vector3(GUIParams.controlsTarget.x, GUIParams.controlsTarget.y, GUIParams.controlsTarget.z);
		// camera and target both just moved; re-establish the initial cube size
		GUIParams.cubeWorldSize = null;
		updateCube();
		GUIParams.cameraNeedsUpdate = false;
	}
}

// move the cube to a specific position
function setCubePosition(pos){
	if (!GUIParams.cube) return;
	// callers in fly controls pass GUIParams.controls.target, which doesn't exist
	//  there; fall back to the anchor rather than throwing on pos.x
	if (!pos) pos = cubeAnchorPosition();
	GUIParams.cube.position.set(pos.x, pos.y, pos.z);
}

function updateFriction(value){
	if (GUIParams.useTrackball){
		GUIParams.controls.dynamicDampingFactor = value;
	} else {
		GUIParams.controls.movementSpeed = (1. - value)*GUIParams.flyffac;
	}
	GUIParams.friction = value;
}

function updateFlyMovementSpeed(flyffac){
	GUIParams.flyffac = flyffac;
	
	//update for the GUI cube
	if (GUIParams.controls){
		if (GUIParams.controlsName == 'FlyControls') GUIParams.controls.movementSpeed = (1. - GUIParams.friction)*GUIParams.flyffac;
	}

	//update for the viewer



}

function updateFPSContainer(){
	var txt = ''
	if (GUIParams.showFPS){
		txt += Math.round(GUIParams.FPS) + ' fps';
		if (GUIParams.showMemoryUsage) txt += ', ';
	}
	if (GUIParams.memoryUsage > 0 && GUIParams.showMemoryUsage) txt+= (Math.round(GUIParams.memoryUsage/1e9*100.)/100.).toFixed(2) + ' GB'
	elm = document.getElementById("fps_container");
	if (elm) elm.innerHTML = txt;
	// hide the element if we're not showing anything
	if (!GUIParams.showFPS && !GUIParams.showMemoryUsage && elm) elm.style.display='none';
}

// live "x.xx / y.yy GB" readout under the memory slider
function updateOctreeMemoryStatusUI(){
	var elm = d3.select('#octreeMemoryStatusSpan');
	if (elm.size() < 1) return;

	var used = GUIParams.memoryUsage/1e9;
	var limit = GUIParams.octreeMemoryLimit/1e9;

	var txt = 'Octree memory: ' + used.toFixed(2) + ' / ' + limit.toFixed(2) + ' GB';
	if (GUIParams.octreeMemoryLimitReached) txt += ' - loading paused';

	elm.text(txt)
		.style('color', GUIParams.octreeMemoryLimitReached ? '#ffaa00' : null);
}

// keep the Pause/Resume buttons labelled to match the viewer's state, which can
//  change without a click (Clear also pauses)
function updateOctreeMemoryButtonsUI(){
	if (!GUIParams.partsKeys) return;
	GUIParams.partsKeys.forEach(function(p){
		if (!GUIParams.haveOctree[p]) return;
		var btn = d3.select('#' + p + '_pauseLoadingButton').select('span');
		if (btn.size() < 1) return;
		btn.text(GUIParams.octreeLoadingPaused[p] ? 'Resume' : 'Pause');
	});
}

// measure a loading bar label. done in a throwaway svg on the body because the UI
//  container is hidden while the GUI is built, and a hidden element measures as 0.
function measureOctreeLoadingLabel(label, fontSize){
	var probe = d3.select('body').append('svg')
		.style('position','absolute')
		.style('left','-9999px')
		.style('top','0px');
	var text = probe.append('text').style('font-size', fontSize + 'px').text(label);
	var w = text.node().getComputedTextLength();
	probe.remove();
	//fall back to an estimate if we still couldn't measure it
	if (!w) w = 0.6*fontSize*label.length;
	return w;
}

// give the count labels more room when a longer one appears, and shrink every bar
//  to match so they stay a uniform width. Only ever grows the label allowance, so
//  this converges after the first pass or two instead of oscillating.
function resizeOctreeLoadingBars(labelWidth){
	var geo = GUIParams.octreeBarGeometry;
	if (!geo || labelWidth <= geo.labelWidth) return;

	geo.labelWidth = labelWidth;
	geo.width = Math.max(60, geo.svgWidth - geo.margin - 2*geo.offset - labelWidth);

	GUIParams.partsKeys.forEach(function(p){
		if (!GUIParams.haveOctree[p]) return;
		d3.select('#' + p + 'octreeLoadingOutline').attr('width', geo.width + 'px');
		d3.select('#' + p + 'octreeLoadingText').attr('x', (geo.margin + geo.width + geo.offset) + 'px');
	});
}

function updateOctreeLoadingBarUI(input){
	var id = '#' + input.p + 'octreeLoadingOutline';
	var selection = d3.select(id)
	// size checks if the selection caught anything
	if (selection.size() < 1) return
	if (input.denominator > 0){
		var textElm = d3.select('#' + input.p + 'octreeLoadingText');
		textElm.text(input.p + ' (' + input.numerator + '/' + input.denominator + ')');

		//make room if this label is wider than anything we've shown so far
		var geo = GUIParams.octreeBarGeometry;
		if (geo) resizeOctreeLoadingBars(textElm.node().getComputedTextLength());

		//read the width back after any resize so the fill matches the outline
		var width = parseFloat(selection.attr('width'));
		var frac = THREE.Math.clamp(input.parts_numerator/input.parts_denominator, 0, 1);
		//var frac = Math.max(viewerParams.octree.loadingCount[p][1]/viewerParams.octree.loadingCount[p][0], 0);
		//console.log('loading',p, width,viewerParams.octree.loadingCount[p], frac)
		d3.select('#' + input.p + 'octreeLoadingFill').transition().attr('width', (width*frac) + 'px');
		//d3.select('#' + input.p + 'octreeLoadingText').text(input.p + ' (' + Math.round(frac*100) + '%)');
	}
}

function savePreset(){
	// NOTE: AMG moved this to the viewer side because all the other functions are on that side.
	// But in a split screen mode, it is probably better for the download to happen on the GUI side...
	sendToGUI([{'savePresetViewer':null}]);
}



