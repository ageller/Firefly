//wait for all the input before loading
function makeUI(local=false){
	if (!local){
		initGUIScene();
		drawCube();
		animateGUI();
	}

	
	GUIParams.waitForInit = setInterval(function(){ 
		var ready = confirmGUIInit();
		console.log("waiting for GUI init", ready)
		if (ready){
			clearInterval(GUIParams.waitForInit);
			if (!local) showSplash(false);
			if (GUIParams.cameraNeedsUpdate) updateGUICamera();
			createUI();
		}
	}, 1000);
}
function confirmGUIInit(){
	if (!GUIParams.GUIready) return false;

	var keys = ["partsKeys", "PsizeMult", "plotNmax", "decimate", "stereoSepMax", "friction", "Pcolors", "showParts", "showVel", "velopts", "velType", "ckeys", "colormapVals", "colormapLims", "colormapVariable", "colormap", "showColormap", "fkeys", "filterVals", "filterLims"];
	var ready = true;
	keys.forEach(function(k,i){
		if (GUIParams[k] == null) {
			//console.log("GUI missing ", k)
			ready = false;
		}
	});
	return ready
}


//////////////
// sockets
//////////////
//https://blog.miguelgrinberg.com/post/easy-websockets-with-flask-and-gevent
//https://github.com/miguelgrinberg/Flask-SocketIO
function connectGUISocket(){
	//$(document).ready(function() {
	document.addEventListener("DOMContentLoaded", function(event) { 
		// Event handler for new connections.
		// The callback function is invoked when a connection with the
		// server is established.
		socketParams.socket.on('connect', function() {
			socketParams.socket.emit('connection_test', {data: 'I\'m connected!'});
		});
		socketParams.socket.on('connection_response', function(msg) {
			console.log(msg);
		});
		// Event handler for server sent data.
		// The callback function is invoked whenever the server emits data
		// to the client. The data is then displayed in the "Received"
		// section of the page.
		socketParams.socket.on('update_GUIParams', function(msg) {
			//console.log('===have commands from viewer', msg)
			setParams(msg); 
		});

	});
}

//function to send events to the viewer
function sendToViewer(viewerInput){
	if (GUIParams.usingSocket){
		socketParams.socket.emit('viewer_input',viewerInput);
	} else {
		setParams(viewerInput);
	}
}

function setGUIParamByKey(args){
	var value = args[0];
	var keyName = args[1];
	GUIParams[keyName] = JSON.parse(JSON.stringify(value));
	// if (typeof value == "object") {
	// 	GUIParams[keyName] = $.extend({}, value);
	// } else {
	// 	GUIParams[keyName] = value;
	// }
}

function updateGUICamera(){
	console.log('===updating camera', GUIParams.controlsTarget)
	GUIParams.camera.position.set(GUIParams.cameraPosition.x, GUIParams.cameraPosition.y, GUIParams.cameraPosition.z);
	GUIParams.camera.rotation.set(GUIParams.cameraRotation.x, GUIParams.cameraRotation.y, GUIParams.cameraRotation.z);
	GUIParams.controls.target = new THREE.Vector3(GUIParams.controlsTarget.x, GUIParams.controlsTarget.y, GUIParams.controlsTarget.z);
	GUIParams.cameraNeedsUpdate = false;
}

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
}
function updateFriction(value){
	if (GUIParams.useTrackball){
		GUIParams.controls.dynamicDampingFactor = value;
	} else {
		GUIParams.controls.movementSpeed = 1. - Math.pow(value, GUIParams.flyffac);
	}
	GUIParams.friction = value;
}

///////////////////////
// scene
///////////////////////
function drawCube(){
	var size = 1.;
	// CUBE
	var geometry = new THREE.CubeGeometry(size, size, size);
	var cubeMaterials = [ 
		new THREE.MeshBasicMaterial({color:"yellow", side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({color:"orange", side: THREE.DoubleSide}), 
		new THREE.MeshBasicMaterial({color:"red", side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({color:"green", side: THREE.DoubleSide}), 
		new THREE.MeshBasicMaterial({color:"blue", side: THREE.DoubleSide}), 
		new THREE.MeshBasicMaterial({color:"purple", side: THREE.DoubleSide}), 
	]; 
	// Create a MeshFaceMaterial, which allows the cube to have different materials on each face 
	var cubeMaterial = new THREE.MeshFaceMaterial(cubeMaterials); 
	var cube = new THREE.Mesh(geometry, cubeMaterial);


	GUIParams.scene.add( cube );
}

//this initializes everything needed for the scene
function initGUIScene(){

	var screenWidth = window.innerWidth;
	var screenHeight = window.innerHeight;
	var aspect = screenWidth / screenHeight;

	// renderer
	if ( Detector.webgl ) {
		GUIParams.renderer = new THREE.WebGLRenderer( {
			antialias:true,
			//preserveDrawingBuffer: true , //so that we can save the image
		} );
	} else {
		GUIParams.renderer = new THREE.CanvasRenderer(); 
	}
	GUIParams.renderer.setSize(screenWidth, screenHeight);

	d3.select('#WebGLContainer').selectAll("canvas").remove();

	GUIParams.container = document.getElementById('WebGLContainer');
	GUIParams.container.appendChild( GUIParams.renderer.domElement );

	//keyboard
	GUIParams.keyboard = new KeyboardState();

	// scene
	GUIParams.scene = new THREE.Scene();     

	// camera
	GUIParams.camera = new THREE.PerspectiveCamera( GUIParams.fov, aspect, GUIParams.zmin, GUIParams.zmax);
	GUIParams.camera.up.set(0, -1, 0);
	GUIParams.camera.position.z = 30;
	GUIParams.scene.add(GUIParams.camera);  

	// events
	THREEx.WindowResize(GUIParams.renderer, GUIParams.camera);

	//controls
	initGUIControls(initial=true)
}

function initGUIControls(initial=false){
	console.log("initializing controls", GUIParams.useTrackball)
	var forViewer = [];

	if (!initial) {
		forViewer.push({'setViewerParamByKey':[GUIParams.useTrackball, "useTrackball"]});
		forViewer.push({'initControls':null});
	}

	if (GUIParams.useTrackball) {
		var xx = new THREE.Vector3(0,0,0);
		GUIParams.camera.getWorldDirection(xx);
		GUIParams.controls = new THREE.TrackballControls( GUIParams.camera, GUIParams.renderer.domElement );
		console.log('===initGUICOntrols', GUIParams.camera.position, xx)
		if (!initial) GUIParams.controls.target = new THREE.Vector3(GUIParams.camera.position.x + xx.x, GUIParams.camera.position.y + xx.y, GUIParams.camera.position.z + xx.z);
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

	} else {
		GUIParams.controls = new THREE.FlyControls( GUIParams.camera , GUIParams.renderer.domElement);
		GUIParams.controls.movementSpeed = 1. - Math.pow(GUIParams.friction, GUIParams.flyffac);
		d3.select('#WebGLContainer').node().removeEventListener("keydown", sendCameraInfoToViewer,true);//for fly controls
		d3.select('#WebGLContainer').node().addEventListener("keydown", sendCameraInfoToViewer,true);//for fly controls
		d3.select('#WebGLContainer').node().removeEventListener("keyup", sendCameraInfoToViewer,true);//for fly controls
		d3.select('#WebGLContainer').node().addEventListener("keyup", sendCameraInfoToViewer,true);//for fly controls
	}

	var elm = document.getElementById("CenterCheckBox")
	if (elm != null){
		elm.checked = GUIParams.useTrackball; 
		elm.value = GUIParams.useTrackball;
	}
	


	//GUIParams.switchControls = false;
	sendToViewer(forViewer);

}
//this is the animation loop
function animateGUI(time) {
	requestAnimationFrame( animateGUI );
	animateGUIupdate();


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
	GUIParams.controls.update();
	GUIParams.keyboard.update();

	if (GUIParams.keyboard.down("space")){
		GUIParams.useTrackball = !GUIParams.useTrackball;
		//GUIParams.switchControls = true;
		GUIParams.controls.dispose();
		initGUIControls();
	}

	GUIParams.renderer.render( GUIParams.scene, GUIParams.camera );

}
