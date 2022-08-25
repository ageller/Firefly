
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
		});


		socketParams.socket.on('update_GUIParams', function(msg) {
			//console.log('===have commands from viewer', msg)
			setParams(msg); 
		});

		socketParams.socket.on('reload_GUI', function(msg) {
			console.log('!!! reloading GUI');
			location.reload();
		});
	});
}

///////////////////////
// animate the cube for the detached GUI scene
///////////////////////
//this initializes everything needed for the scene
function initGUIScene(){

	var screenWidth = window.innerWidth;
	var screenHeight = window.innerHeight;
	var aspect = screenWidth / screenHeight;

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
	THREEx.WindowResize(GUIParams.renderer, GUIParams.camera);

	// initialize controls for GUI
	initGUIControls(initial=true)
}

function initGUIControls(initial=false){
	console.log("initializing controls", GUIParams.useTrackball)
	var forViewer = [];

	d3.select('#WebGLContainer').node().removeEventListener("keydown", sendCameraInfoToViewer,true);//for fly controls
	d3.select('#WebGLContainer').node().removeEventListener("keyup", sendCameraInfoToViewer,true);//for fly controls
	d3.select('#WebGLContainer').node().removeEventListener("mousedown", function(){GUIParams.mouseDown = true;},true);//for fly controls
	d3.select('#WebGLContainer').node().removeEventListener("mouseup", function(){GUIParams.mouseDown = false;},true);//for fly controls
	d3.select('#WebGLContainer').node().removeEventListener("mousemove", function(){if (GUIParams.mouseDown) sendCameraInfoToViewer()},true);//for fly controls


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
		
		setCubePosition(GUIParams.controls.target);

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
		d3.select('#WebGLContainer').node().addEventListener("mousedown", function(){GUIParams.mouseDown = true;},true);//for fly controls
		d3.select('#WebGLContainer').node().addEventListener("mouseup", function(){GUIParams.mouseDown = false;},true);//for fly controls
		d3.select('#WebGLContainer').node().addEventListener("mousemove", function(){if (GUIParams.mouseDown) sendCameraInfoToViewer()},true);//for fly controls
	}

	var elm = document.getElementById("CenterCheckBox")
	if (elm != null){
		elm.checked = GUIParams.useTrackball; 
		elm.value = GUIParams.useTrackball;
	}

	//GUIParams.switchControls = false;
	// send signal to viewer that we're done here, if there was information 
	// to transmit that'll get sent too.
	sendToViewer(forViewer);
}

// create a Cube object
function createCube(){
	var size = GUIParams.boxSize/100.;
	// CUBE
	var geometry = new THREE.BoxGeometry(size, size, size);
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
	setCubePosition(GUIParams.controls.target);

	GUIParams.scene.add( GUIParams.cube );
}


//this is the animation loop
function animateGUI(time) {
	GUIParams.animating = true;
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
	if (GUIParams.controls) GUIParams.controls.update();

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
		GUIParams.camera.position.set(GUIParams.cameraPosition.x, GUIParams.cameraPosition.y, GUIParams.cameraPosition.z);
		GUIParams.camera.rotation.set(GUIParams.cameraRotation.x, GUIParams.cameraRotation.y, GUIParams.cameraRotation.z);
		GUIParams.camera.up.set(GUIParams.cameraUp.x, GUIParams.cameraUp.y, GUIParams.cameraUp.z);
		GUIParams.controls.target = new THREE.Vector3(GUIParams.controlsTarget.x, GUIParams.controlsTarget.y, GUIParams.controlsTarget.z);
		setCubePosition(GUIParams.controls.target);
		GUIParams.cameraNeedsUpdate = false;
	}
}

// move the cube to a specific position
function setCubePosition(pos){
	if (GUIParams.cube) GUIParams.cube.position.set(pos.x, pos.y, pos.z);
}

function updateFriction(value){
	if (GUIParams.useTrackball){
		console.log(GUIParams)
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
	if (GUIParams.memoryUsage > 0 && GUIParams.showMemoryUsage) txt+= (Math.round(GUIParams.memoryUsage/1e9*100.)/100.).toFixed(2) + ' Gb'
	elm = document.getElementById("fps_container");
	if (elm) elm.innerHTML = txt;
	// hide the element if we're not showing anything
	if (!GUIParams.showFPS && !GUIParams.showMemoryUsage && elm) elm.style.display='none';
}

function updateOctreeLoadingBarUI(input){
	var id = '#' + input.p + 'octreeLoadingOutline';
	var selection = d3.select(id)
	// size checks if the selection caught anything
	if (selection.size() < 1) return
	var width = parseFloat(selection.attr('width'));
	if (input.denominator > 0){
		var frac = THREE.Math.clamp(input.parts_numerator/input.parts_denominator, 0, 1);
		//var frac = Math.max(viewerParams.octree.loadingCount[p][1]/viewerParams.octree.loadingCount[p][0], 0);
		//console.log('loading',p, width,viewerParams.octree.loadingCount[p], frac)
		d3.select('#' + input.p + 'octreeLoadingFill').transition().attr('width', (width*frac) + 'px');
		d3.select('#' + input.p + 'octreeLoadingText').text(input.p + ' (' + input.numerator + '/' + input.denominator + ')');
		//d3.select('#' + input.p + 'octreeLoadingText').text(input.p + ' (' + Math.round(frac*100) + '%)');
	}
}