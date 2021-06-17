//wait for all the input before loading
function makeUI(local=false){
	//if (local) GUIParams.usingSocket = false;
	console.log('making UI', local)
	if (!local){
		initGUIScene();
		if (!GUIParams.animating) animateGUI();
	}
	
	console.log("waiting for GUI init...")
	clearInterval(GUIParams.waitForInit);
	GUIParams.waitForInit = setInterval(function(){ 
		var ready = confirmGUIInit();
		if (ready){
			console.log("GUI ready.")
			clearInterval(GUIParams.waitForInit);
			if (!local) {
				showSplash(false);
				drawCube();
			}
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
function clearGUIinterval(){
	clearInterval(GUIParams.waitForInit);
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
			socketParams.socket.emit('connection_test', {data: 'GUI connected!'});
		});
		socketParams.socket.on('connection_response', function(msg) {
			console.log('connection response', msg);
		});
		// Event handler for server sent data.
		// The callback function is invoked whenever the server emits data
		// to the client. The data is then displayed in the "Received"
		// section of the page.
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
	var key1 = args[1];

	if (args.length == 2) {
		GUIParams[key1] = JSON.parse(JSON.stringify(value));
	} else if (args.length == 3) {
		var key2 = args[2];
		GUIParams[key1][key2] = JSON.parse(JSON.stringify(value));
	} else if (args.length == 4) {
		var key2 = args[2];
		var key3 = args[3];
		GUIParams[key1][key2][key3] = JSON.parse(JSON.stringify(value));
	} else if (args.length == 5) {
		var key2 = args[2];
		var key3 = args[3];
		var key4 = args[4];
		GUIParams[key1][key2][key3][key4] = JSON.parse(JSON.stringify(value));
	} else {
		console.log('!!!! WRONG NUMBER OF ARGUMENTS TO PASS', args.length, args)
	}
	//console.log(args)
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
function setCubePosition(pos){
	if (GUIParams.cube) GUIParams.cube.position.set(pos.x, pos.y, pos.z);
}
function drawCube(){
	var size = GUIParams.boxSize/100.;
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
	GUIParams.cube = new THREE.Mesh(geometry, cubeMaterial);
	setCubePosition(GUIParams.controls.target);

	GUIParams.scene.add( GUIParams.cube );
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

	} else {
		GUIParams.controlsName = "FlyControls";
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

		if (GUIParams.keyboard.down("space")){
			GUIParams.useTrackball = !GUIParams.useTrackball;
			//GUIParams.switchControls = true;
			GUIParams.controls.dispose();
			initGUIControls();
		}

		if (GUIParams.keyboard.down("T")) {
			if (GUIParams.inTween){
				GUIParams.updateTween = false;
				GUIParams.inTween = false;
				var forViewer = [];
				forViewer.push({'setViewerParamByKey':[GUIParams.updateTween, "updateTween"]});
				forViewer.push({'setViewerParamByKey':[GUIParams.inTween, "inTween"]});
				sendToViewer(forViewer);
			} else {
				console.log("tweening")
				GUIParams.inTween = true;
				GUIParams.updateTween = true;	
				var forViewer = [];
				forViewer.push({'setViewerParamByKey':[GUIParams.updateTween, "updateTween"]});
				forViewer.push({'setTweenviewerParams':['static/']});
				sendToViewer(forViewer);
			}
		}

		if (GUIParams.keyboard.down("P")){
			GUIParams.columnDensity = !GUIParams.columnDensity;
			sendToViewer([{'setViewerParamByKey':[GUIParams.columnDensity, "columnDensity"]}]);
		}
	}

	if (GUIParams.renderer) GUIParams.renderer.render( GUIParams.scene, GUIParams.camera );

}

//show the button on the splash screen
function showLoadingButton(id){
	var screenWidth = parseFloat(window.innerWidth);
	var width = parseFloat(d3.select(id).style('width'));
	d3.select(id)
		.style('display','inline')
		.style('margin-left',(screenWidth - width)/2);
}

//for loading and reading a startup file with multiple entries
function selectFromStartup(prefix=""){
	var screenWidth = parseFloat(window.innerWidth);

	var dirs = [];
	Object.keys(GUIParams.dir).forEach(function(d, i) {
		dirs.push(GUIParams.dir[i]);
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
		var f = prefix + selection.value+'/filenames.json';
		d3.json(f,  function(files) {
			if (files != null){
				console.log('==loading data', files, prefix)
				sendToViewer([{'callLoadData':[files, prefix]}])
			} else {
				alert("Cannot load data. Please select another directory.");
			}
		});

	});

}
/////////////////////
//this is an input file that will fire if there is no startup.json in the data directory
d3.select('#loadDataButton').on('click', function(){
	document.getElementById("inputFilenames").click();
});


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
			if (this.files[i].name == "filenames.json" && !foundFile){
				foundFile = true;
				var file = this.files[i];
				var reader = new FileReader();
				reader.readAsText(file, 'UTF-8');
				reader.onload = function(){
					var foo = JSON.parse(this.result);
					if (foo != null){
						sendToViewer([{'callLoadData':[foo, 'static/']}])
					} else {
						alert("Cannot load data. Please select another directory.");
					}
				}
			}
			if ((this.files[i].name.includes('.hdf5') || this.files[i].name.includes('.csv')) && !foundFile){
				console.log('here', GUIParams.usingSocket)
				if (GUIParams.usingSocket){
					foundFile = true;
					var dir = this.files[i].webkitRelativePath.replace(this.files[i].name,'');
					console.log('have hdf5 or csv file', dir);
					socketParams.socket.emit('input_otherType', dir);
				}
			}
		}
		if (i == this.files.length && !foundFile){
			alert("Cannot load data. Please select another directory.");
		}
	})
	.style('display','None');

