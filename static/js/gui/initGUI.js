//wait for all the input before loading
function makeUI(local=false){
	if (!local){
		initGUIScene();
		drawCube();
		animateGUI();
		document.addEventListener("keydown", sendCameraInfoToViewer);//for fly controls
	}

	GUIParams.waitForInit = setInterval(function(){ 
		var ready = confirmInit();
		console.log("waiting for GUI init", ready)
		if (ready){
			clearInterval(GUIParams.waitForInit);
			if (!local) showSplash(false);
			createUI();
		}
	}, 1000);
}
function confirmInit(){
	var keys = ["partsKeys", "PsizeMult", "plotNmax", "decimate", "stereoSepMax", "friction", "Pcolors", "showParts", "showVel", "velopts", "velType", "ckeys", "colormapVals", "colormapLims", "colormapVariable", "colormap", "showColormap", "fkeys", "filterVals", "filterLims"];
	var ready = true;
	keys.forEach(function(k,i){
		if (GUIParams[k] == null) ready = false;
	});
	return ready
}


//////////////
// sockets
//////////////
//https://blog.miguelgrinberg.com/post/easy-websockets-with-flask-and-gevent
//https://github.com/miguelgrinberg/Flask-SocketIO
function connectSocket(){
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
	GUIParams.camera.position.set(GUIParams.cameraPosition.x, GUIParams.cameraPosition.y, GUIParams.cameraPosition.z);
	GUIParams.camera.rotation.set(GUIParams.cameraRotation.x, GUIParams.cameraRotation.y, GUIParams.cameraRotation.z);
	GUIParams.controls.target = new THREE.Vector3(GUIParams.controlsTarget.x, GUIParams.controlsTarget.y, GUIParams.controlsTarget.z);

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
	GUIParams.controls = new THREE.TrackballControls( GUIParams.camera, GUIParams.renderer.domElement );
	GUIParams.controls.addEventListener('change', sendCameraInfoToViewer);
}

//this is the animation loop
function animateGUI(time) {
	requestAnimationFrame( animateGUI );
	GUIParams.controls.update();
	GUIParams.renderer.render( GUIParams.scene, GUIParams.camera );

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

