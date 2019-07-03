function initControls(){
	var forGUI = []
	forGUI.push({'setGUIParamByKey':[viewerParams.useTrackball, "useTrackball"]})

	if (viewerParams.useTrackball) {
		var xx = new THREE.Vector3(0,0,0);
		viewerParams.camera.getWorldDirection(xx);
		viewerParams.controls = new THREE.TrackballControls( viewerParams.camera, viewerParams.renderer.domElement );
		viewerParams.controls.target = new THREE.Vector3(viewerParams.camera.position.x + xx.x, viewerParams.camera.position.y + xx.y, viewerParams.camera.position.z + xx.z);
		if (viewerParams.parts.hasOwnProperty('options')){
			if (viewerParams.parts.options.hasOwnProperty('center') && !viewerParams.switchControls){
				if (viewerParams.parts.options.center != null){
					viewerParams.controls.target = new THREE.Vector3(viewerParams.parts.options.center[0], viewerParams.parts.options.center[1], viewerParams.parts.options.center[2]);

				}
			}
		} 

		viewerParams.controls.dynamicDampingFactor = viewerParams.friction;
		viewerParams.controls.addEventListener('change', sendCameraInfoToGUI);
	} else {
		viewerParams.controls = new THREE.FlyControls( viewerParams.camera , viewerParams.renderer.domElement);
		viewerParams.controls.movementSpeed = 1. - Math.pow(viewerParams.friction, viewerParams.flyffac);
	}

	if (viewerParams.haveUI){
		var evalString = 'elm = document.getElementById("CenterCheckBox"); elm.checked = '+viewerParams.useTrackball+'; elm.value = '+viewerParams.useTrackball+';'
		forGUI.push({'evalCommand':evalString});
	}

	viewerParams.switchControls = false;
	sendToGUI(forGUI);

}

function initScene() {
	var screenWidth = window.innerWidth;
	var screenHeight = window.innerHeight;
	var aspect = screenWidth / screenHeight;

	viewerParams.renderWidth = window.innerWidth;
	viewerParams.renderHeight = window.innerHeight;

	if (viewerParams.reset){
		viewerParams.scene = null;
		viewerParams.camera = null;
	} else{

		 //keyboard
		viewerParams.keyboard = new KeyboardState();

		// renderer
		if ( Detector.webgl ) {
			viewerParams.renderer = new THREE.WebGLRenderer( {
				antialias:true,
				//preserveDrawingBuffer: true , //so that we can save the image
			} );
		} else {
			viewerParams.renderer = new THREE.CanvasRenderer(); 
		}
		viewerParams.renderer.setSize(screenWidth, screenHeight);
		viewerParams.normalRenderer = viewerParams.renderer;

		d3.select('#WebGLContainer').selectAll("canvas").remove();

		viewerParams.container = document.getElementById('WebGLContainer');
		viewerParams.container.appendChild( viewerParams.renderer.domElement );

		//stereo
		viewerParams.effect = new THREE.StereoEffect( viewerParams.renderer );
		viewerParams.effect.setAspect(1.);
		viewerParams.effect.setEyeSeparation(viewerParams.stereoSep);
	}

	// scene
	viewerParams.scene = new THREE.Scene();     

	// camera
	viewerParams.camera = new THREE.PerspectiveCamera( viewerParams.fov, aspect, viewerParams.zmin, viewerParams.zmax);
	viewerParams.camera.up.set(0, -1, 0);
	viewerParams.scene.add(viewerParams.camera);  

	// events
	THREEx.WindowResize(viewerParams.renderer, viewerParams.camera);
	//THREEx.FullScreen.bindKey({ charCode : 'm'.charCodeAt(0) });

	viewerParams.useTrackball = true;

	//console.log(viewerParams.parts.options);
	setCenter(viewerParams.parts[viewerParams.partsKeys[0]].Coordinates);
	viewerParams.camera.position.set(viewerParams.center.x, viewerParams.center.y, viewerParams.center.z - viewerParams.boxSize/2.);
	viewerParams.camera.lookAt(viewerParams.scene.position);  


	//apply presets from the options file
	if (viewerParams.parts.hasOwnProperty('options')) applyOptions();

	// controls
	initControls();


	//investigating the minimum point size issue
	// console.log("context", viewerParams.renderer.context)
	// //maybe glDisable(GL_POINT_SMOOTH); would solve the point size issue?
	// //see also GL_POINT_SIZE_RANGE
	// var canvas = d3.select('canvas').node();
	// var gl = canvas.getContext('webgl');
	// console.log(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE), gl.getParameter(gl.POINT_SMOOTH));
}



function applyOptions(){

	//initialize center
	if (viewerParams.parts.options.hasOwnProperty('center')){
		if (viewerParams.parts.options.center != null){
			viewerParams.center = new THREE.Vector3(viewerParams.parts.options.center[0], viewerParams.parts.options.center[1], viewerParams.parts.options.center[2]);
			setBoxSize(viewerParams.parts[viewerParams.partsKeys[0]].Coordinates);
		} else {
			viewerParams.parts.options.center = [viewerParams.center.x, viewerParams.center.y, viewerParams.center.z];
		}
	} else {
		viewerParams.parts.options.center = [viewerParams.center.x, viewerParams.center.y, viewerParams.center.z];
	}

	//change location of camera
	if (viewerParams.parts.options.hasOwnProperty('camera')){
		if (viewerParams.parts.options.camera != null){
			viewerParams.camera.position.set(viewerParams.parts.options.camera[0], viewerParams.parts.options.camera[1], viewerParams.parts.options.camera[2]);
		}
	} 

	//change the rotation of the camera (which requires Fly controls)
	if (viewerParams.parts.options.hasOwnProperty('cameraRotation')){
		if (viewerParams.parts.options.cameraRotation != null){
			viewerParams.useTrackball = false;
			viewerParams.camera.rotation.set(viewerParams.parts.options.cameraRotation[0], viewerParams.parts.options.cameraRotation[1], viewerParams.parts.options.cameraRotation[2]);
		}
	}

	//check if we are starting in Fly controls
	if (viewerParams.parts.options.hasOwnProperty('startFly')){
		if (viewerParams.parts.options.startFly == true){
			viewerParams.useTrackball = false;
		}
	}

	//modify the initial friction
	if (viewerParams.parts.options.hasOwnProperty('friction')){
		if (viewerParams.parts.options.friction != null){
			viewerParams.friction = viewerParams.parts.options.friction;
		}
	}

	//check if we are starting in Stereo
	if (viewerParams.parts.options.hasOwnProperty('stereo')){
		if (viewerParams.parts.options.stereo == true){
			viewerParams.normalRenderer = viewerParams.renderer;
			viewerParams.renderer = viewerParams.effect;
			viewerParams.useStereo = true;
			if (viewerParams.haveUI){
				var evalString = 'elm = document.getElementById("StereoCheckBox"); elm.checked = true; elm.value = true;'
				var varArgs = {'evalString':evalString};
				sendToGUI([{'updateUIValues':[null, varArgs, null, null]}]);
			}
		}
	}

	//modify the initial stereo separation
	if (viewerParams.parts.options.hasOwnProperty('stereoSep')){
		if (viewerParams.parts.options.stereoSep != null){
			viewerParams.stereoSep = viewerParams.parts.options.stereoSep;
			viewerParams.effect.setEyeSeparation(viewerParams.stereoSep);

		}
	}

	//modify the initial decimation
	if (viewerParams.parts.options.hasOwnProperty('decimate')){
		if (viewerParams.parts.options.decimate != null){
			viewerParams.decimate = viewerParams.parts.options.decimate;
		}
	}

	//maximum range in calculating the length the velocity vectors
	if (viewerParams.parts.options.hasOwnProperty("maxVrange")){
		if (viewerParams.parts.options.maxVrange != null){
			viewerParams.maxVrange = viewerParams.parts.options.maxVrange; //maximum dynamic range for length of velocity vectors
			for (var i=0; i<viewerParams.partsKeys.length; i++){
				var p = viewerParams.partsKeys[i];
				if (viewerParams.parts[p].Velocities != null){
					calcVelVals(p);		
				}
			}
		}
	}
	//particle specific options
	for (var i=0; i<viewerParams.partsKeys.length; i++){
		var p = viewerParams.partsKeys[i];

		//on/off
		if (viewerParams.parts.options.hasOwnProperty("showParts")){
			if (viewerParams.parts.options.showParts != null){
				if (viewerParams.parts.options.showParts.hasOwnProperty(p)){
					if (viewerParams.parts.options.showParts[p] != null){
						viewerParams.showParts[p] = viewerParams.parts.options.showParts[p];
					}
				}
			}
		}

		//size
		if (viewerParams.parts.options.hasOwnProperty("sizeMult")){
			if (viewerParams.parts.options.sizeMult != null){
				if (viewerParams.parts.options.sizeMult.hasOwnProperty(p)){
					if (viewerParams.parts.options.sizeMult[p] != null){
						viewerParams.PsizeMult[p] = viewerParams.parts.options.sizeMult[p];
					}
				}
			}
		}

		//color
		if (viewerParams.parts.options.hasOwnProperty("color")){
			if (viewerParams.parts.options.color != null){
				if (viewerParams.parts.options.color.hasOwnProperty(p)){
					if (viewerParams.parts.options.color[p] != null){
						viewerParams.Pcolors[p] = viewerParams.parts.options.color[p];
					}
				}
			}
		}



		//maximum number of particles to plot
		if (viewerParams.parts.options.hasOwnProperty("plotNmax")){
			if (viewerParams.parts.options.plotNmax != null){
				if (viewerParams.parts.options.plotNmax.hasOwnProperty(p)){
					if (viewerParams.parts.options.plotNmax[p] != null){
						viewerParams.plotNmax[p] = viewerParams.parts.options.plotNmax[p];
					}
				}
			}
		}

		//start plotting the velocity vectors
		if (viewerParams.parts.options.hasOwnProperty("showVel")){
			if (viewerParams.parts.options.showVel != null){
				if (viewerParams.parts.options.showVel.hasOwnProperty(p)){
					if (viewerParams.parts.options.showVel[p] == true){
						viewerParams.showVel[p] = true;
						if (viewerParams.haveUI){
							var evalString = 'elm = document.getElementById("'+p+'velCheckBox"); elm.checked = true; elm.value = true;'
							var varArgs = {'evalString':evalString};
							sendToGUI([{'updateUIValues':[null, varArgs, null, null]}]);
						}
					}
				}
			}
		}

		//type of velocity vectors
		if (viewerParams.parts.options.hasOwnProperty("velType")){
			if (viewerParams.parts.options.velType != null){
				if (viewerParams.parts.options.velType.hasOwnProperty(p)){
					if (viewerParams.parts.options.velType[p] == 'line' || viewerParams.parts.options.velType[p] == 'arrow' || viewerParams.parts.options.velType[p] == 'triangle'){
						viewerParams.velType[p] = viewerParams.parts.options.velType[p];
					}
				}
			}
		}

		//filter limits
		if (viewerParams.parts.options.hasOwnProperty("filterLims")){
			if (viewerParams.parts.options.filterLims != null){
				if (viewerParams.parts.options.filterLims.hasOwnProperty(p)){
					if (viewerParams.parts.options.filterLims[p] != null){
						viewerParams.updateFilter[p] = true

						for (k=0; k<viewerParams.fkeys[p].length; k++){
							var fkey = viewerParams.fkeys[p][k]
							if (viewerParams.parts.options.filterLims[p].hasOwnProperty(fkey)){
								if (viewerParams.parts.options.filterLims[p][fkey] != null){
									viewerParams.filterLims[p][fkey] = []
									viewerParams.filterLims[p][fkey].push(viewerParams.parts.options.filterLims[p][fkey][0]);
									viewerParams.filterLims[p][fkey].push(viewerParams.parts.options.filterLims[p][fkey][1]);
								}
							}
						}

					}
				}
			}
		}

		//filter values
		if (viewerParams.parts.options.hasOwnProperty("filterVals")){
			if (viewerParams.parts.options.filterVals != null){
				if (viewerParams.parts.options.filterVals.hasOwnProperty(p)){
					if (viewerParams.parts.options.filterVals[p] != null){
						viewerParams.updateFilter[p] = true

						for (k=0; k<viewerParams.fkeys[p].length; k++){
							var fkey = viewerParams.fkeys[p][k]
							if (viewerParams.parts.options.filterVals[p].hasOwnProperty(fkey)){
								if (viewerParams.parts.options.filterVals[p][fkey] != null){
									viewerParams.filterVals[p][fkey] = []
									viewerParams.filterVals[p][fkey].push(viewerParams.parts.options.filterVals[p][fkey][0]);
									viewerParams.filterVals[p][fkey].push(viewerParams.parts.options.filterVals[p][fkey][1]);
								}
							}
						}

					}
				}
			}
		}


		//colormap limits
		if (viewerParams.parts.options.hasOwnProperty("colormapLims")){
			if (viewerParams.parts.options.colormapLims != null){
				if (viewerParams.parts.options.colormapLims.hasOwnProperty(p)){
					if (viewerParams.parts.options.colormapLims[p] != null){
						viewerParams.updateColormap[p] = true

						for (k=0; k<viewerParams.ckeys[p].length; k++){
							var ckey = viewerParams.ckeys[p][k]
							if (viewerParams.parts.options.colormapLims[p].hasOwnProperty(ckey)){
								if (viewerParams.parts.options.colormapLims[p][ckey] != null){
									viewerParams.colormapLims[p][ckey] = []
									viewerParams.colormapLims[p][ckey].push(viewerParams.parts.options.colormapLims[p][ckey][0]);
									viewerParams.colormapLims[p][ckey].push(viewerParams.parts.options.colormapLims[p][ckey][1]);
								}
							}
						}

					}
				}
			}
		}

		//colormap values
		if (viewerParams.parts.options.hasOwnProperty("colormapVals")){
			if (viewerParams.parts.options.colormapVals != null){
				if (viewerParams.parts.options.colormapVals.hasOwnProperty(p)){
					if (viewerParams.parts.options.colormapVals[p] != null){
						viewerParams.updateColormap[p] = true

						for (k=0; k<viewerParams.ckeys[p].length; k++){
							var fkey = viewerParams.ckeys[p][k]
							if (viewerParams.parts.options.colormapVals[p].hasOwnProperty(ckey)){
								if (viewerParams.parts.options.colormapVals[p][ckey] != null){
									viewerParams.colormapVals[p][ckey] = []
									viewerParams.colormapVals[p][ckey].push(viewerParams.parts.options.colormapVals[p][ckey][0]);
									viewerParams.colormapVals[p][ckey].push(viewerParams.parts.options.colormapVals[p][ckey][1]);
								}
							}
						}
					}
				}
			}
		}


	}
}

function calcMinMax(p,key, addFac = true){
	var i=0;
	min = viewerParams.parts[p][key][i];
	max = viewerParams.parts[p][key][i];
	for (i=0; i< viewerParams.parts[p][key].length; i++){
		min = Math.min(min, viewerParams.parts[p][key][i]);
		max = Math.max(max, viewerParams.parts[p][key][i]);
	}
	if (addFac){
		//need to add a small factor here because of the precision of noUIslider
		min -= 0.001;
		max += 0.001;
	}
	return {"min":min, "max":max}
}


function initColumnDensity(){
	//following this example: https://threejs.org/examples/webgl_rtt.html
	var screenWidth = window.innerWidth;
	var screenHeight = window.innerHeight;
	var aspect = screenWidth / screenHeight;

	//render texture
	viewerParams.textureCD = new THREE.WebGLRenderTarget( screenWidth, screenHeight, {
		minFilter: THREE.LinearFilter, 
		magFilter: THREE.NearestFilter, 
		format: THREE.RGBAFormat 
	} );

	//for now, just use the first colormap
	var p = viewerParams.partsKeys[0];
	viewerParams.materialCD = new THREE.ShaderMaterial( {
		uniforms: { 
			tex: { value: viewerParams.textureCD.texture }, 
			cmap: { type:'t', value: viewerParams.cmap },
			colormap: {value: viewerParams.colormap[p]},
		},
		vertexShader: myVertexShader,
		fragmentShader: myFragmentShader_pass2,
		depthWrite: false
	} );
	var plane = new THREE.PlaneBufferGeometry( screenWidth, screenHeight );
	viewerParams.quadCD = new THREE.Mesh( plane, viewerParams.materialCD );
	viewerParams.quadCD.position.z = -100;
	viewerParams.sceneCD = new THREE.Scene();
	viewerParams.sceneCD.add( viewerParams.quadCD );

	// camera
	viewerParams.cameraCD = new THREE.OrthographicCamera( screenWidth/-2, screenWidth/2, screenHeight/2, screenHeight/-2, -10000, 10000 );
	//viewerParams.cameraCD = new THREE.PerspectiveCamera( viewerParams.fov, aspect, viewerParams.zmin, viewerParams.zmax);
	viewerParams.cameraCD.position.z = 100;
	viewerParams.cameraCD.up.set(0, -1, 0);
	viewerParams.sceneCD.add(viewerParams.cameraCD);  
}


function calcVelVals(p){
	viewerParams.parts[p].VelVals = [];
	viewerParams.parts[p].magVelocities = [];
	viewerParams.parts[p].NormVel = [];
	var mag, angx, angy, v;
	var max = -1.;
	var min = 1.e20;
	var vdif = 1.;
	for (var i=0; i<viewerParams.parts[p].Velocities.length; i++){
		v = viewerParams.parts[p].Velocities[i];
		mag = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
		angx = Math.atan2(v[1],v[0]);
		angy = Math.acos(v[2]/mag);
		if (mag > max){
			max = mag;
		}
		if (mag < min){
			min = mag;
		}
		viewerParams.parts[p].VelVals.push([v[0],v[1],v[2]]);
		viewerParams.parts[p].magVelocities.push(mag);
	}
	vdif = Math.min(max - min, viewerParams.maxVrange);
	for (var i=0; i<viewerParams.parts[p].Velocities.length; i++){
		viewerParams.parts[p].NormVel.push( THREE.Math.clamp((viewerParams.parts[p].magVelocities[i] - min) / vdif, 0., 1.));
	}
}


//initialize various values for the parts dict from the input data file, 
function initPVals(){

	for (var i=0; i<viewerParams.partsKeys.length; i++){
		var p = viewerParams.partsKeys[i];
		if (! viewerParams.reset){
			viewerParams.partsMesh[p] = [];
		}

		//misc
		viewerParams.plotNmax[p] = viewerParams.parts[p].Coordinates.length;
		viewerParams.PsizeMult[p] = 1.;
		viewerParams.showParts[p] = true;
		viewerParams.updateOnOff[p] = false;

		//filter
		viewerParams.updateFilter[p] = false;
		viewerParams.filterLims[p] = {};
		viewerParams.filterVals[p] = {};
		viewerParams.invertFilter[p] = {};
		viewerParams.fkeys[p] = [];

		//colormap
		viewerParams.ckeys[p] = [];
		viewerParams.colormapVariable[p] = 0;
		viewerParams.colormap[p] = 4/256;
		viewerParams.showColormap[p] = false;
		viewerParams.updateColormap[p] = false;
		viewerParams.colormapVals[p] = {};
		viewerParams.colormapLims[p] = {};

		//velocities
		viewerParams.showVel[p] = false;
		if (viewerParams.parts[p].Velocities != null){
			if (!viewerParams.reset){
				calcVelVals(p);
				if(!viewerParams.parts[p].hasOwnProperty("filterKeys")){
					viewerParams.parts[p].filterKeys = [];
				}
			 
			}
			viewerParams.velType[p] = 'line';
			//console.log(p, viewerParams.parts[p].VelVals, viewerParams.parts[p].Velocities)
		}
		
		//filters
		if (viewerParams.parts[p].hasOwnProperty("filterKeys")){
			viewerParams.fkeys[p] = viewerParams.parts[p].filterKeys;
			for (var k=0; k<viewerParams.fkeys[p].length; k++){
				if (viewerParams.fkeys[p][k] == "Velocities"){
					viewerParams.fkeys[p][k] = "magVelocities";
				}
				var fkey = viewerParams.fkeys[p][k];
				//calculate limits for the filters
				if (viewerParams.parts[p][fkey] != null){
					var m = calcMinMax(p,fkey)
					viewerParams.filterLims[p][fkey] = [m.min, m.max];
					viewerParams.filterVals[p][fkey] = [m.min, m.max];
					viewerParams.invertFilter[p][fkey] = false;
					//TODO this should not be here!!
					// set the currently shown filter for each part type at startup
					// so the first click isn't broken
					if (viewerParams.parts[p]['currentlyShownFilter'] == undefined){
						viewerParams.parts[p]['currentlyShownFilter']=fkey;
						viewerParams.parts[p]['playbackTicks']=0;
						viewerParams.parts[p]['playbackTickRate']=10;	
					}
				}
			}
		}
		//colormap
		//in case there are no colormap possibilities (but will be overwritten below)
		viewerParams.ckeys[p] = ["foo"];
		viewerParams.colormapLims[p]["foo"] = [0,1];
		viewerParams.colormapVals[p]["foo"] = [0,1];
		if (viewerParams.parts[p].hasOwnProperty("colormapKeys")){
			if (viewerParams.parts[p].colormapKeys.length > 0){
				viewerParams.ckeys[p] = viewerParams.parts[p].colormapKeys;
				for (var k=0; k<viewerParams.ckeys[p].length; k++){
					if (viewerParams.ckeys[p][k] == "Velocities"){
						viewerParams.ckeys[p][k] = "magVelocities";
					}
					var ckey = viewerParams.ckeys[p][k];
					viewerParams.colormapLims[p][ckey] = [0,1];
					viewerParams.colormapVals[p][ckey] = [0,1];
					if (viewerParams.parts[p][ckey] != null){
						//could probably take results from filter to save time, but will do this again to be safe
						var m = calcMinMax(p,ckey)
						viewerParams.colormapLims[p][ckey] = [m.min, m.max];
						viewerParams.colormapVals[p][ckey] = [m.min, m.max];
					}
////////////////////////////////////////////////////////////////////////					
////////////// I am not sure where to put this
////////////////////////////////////////////////////////////////////////					
					if (i == viewerParams.partsKeys.length - 1 && k == viewerParams.ckeys[p].length -1) viewerParams.ready = true;
////////////////////////////////////////////////////////////////////////					
////////////////////////////////////////////////////////////////////////					
				}
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
	viewerParams.center = new THREE.Vector3(sum[0]/coords.length, sum[1]/coords.length, sum[2]/coords.length);

	setBoxSize(coords);

}

function setBoxSize(coords){
	var fee, foo;
	for( var i = 0; i < coords.length; i++ ){
		foo = new THREE.Vector3(coords[i][0], coords[i][0], coords[i][0]);
		fee = viewerParams.center.distanceTo(foo)
		if (fee > viewerParams.boxSize){
			viewerParams.boxSize = fee;
		}
	}
}

function countParts(){
	var num = 0.;
	viewerParams.partsKeys.forEach( function(p, i) {
		if (viewerParams.parts.hasOwnProperty(p)){
			if (viewerParams.parts[p].hasOwnProperty('Coordinates')){
				num += viewerParams.parts[p].Coordinates.length;
			}
		}
	})
	return num;
}

//if startup.json exists, this is called first
function getFilenames(prefix=""){
	d3.json(prefix+viewerParams.startup,  function(dir) {
		console.log(prefix, dir, viewerParams.startup, viewerParams)
		if (dir != null){
			var i = 0;
			viewerParams.dir = dir;
			if (Object.keys(viewerParams.dir).length > 1){
				i = null
				console.log("multiple file options in startup:", Object.keys(viewerParams.dir).length, viewerParams.dir);
				showLoadingButton('#selectStartupButton');
				selectFromStartup(prefix);

			} 
			if (i != null && i < Object.keys(viewerParams.dir).length){
				d3.json(prefix+viewerParams.dir[i] + "/filenames.json",  function(files) {
					if (files != null){
						callLoadData(files, prefix);
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
function selectFromStartup(prefix=""){
	var screenWidth = parseFloat(window.innerWidth);

	var dirs = [];
	Object.keys(viewerParams.dir).forEach(function(d, i) {
		dirs.push(viewerParams.dir[i]);
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
		var f = prefix+selection.value+'/filenames.json';
		d3.json(f,  function(files) {
			if (files != null){
				callLoadData(files, prefix);
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
function callLoadData(files, prefix=""){
	var dir = {};
	if (viewerParams.hasOwnProperty('dir')){
		dir = viewerParams.dir;

	}
	viewerParams.dir = dir;

	drawLoadingBar();
	viewerParams.filenames = files;
	loadData(WebGLStart, prefix);
}
function loadData(callback, prefix=""){

	document.getElementById("inputFilenames").value = "";

	viewerParams.parts = {};
	viewerParams.parts.totalSize = 0.;


	//console.log(files)
	viewerParams.partsKeys = Object.keys(viewerParams.filenames);
	viewerParams.partsKeys.forEach( function(p, i) {
		viewerParams.filenames[p].forEach( function(f, j) {
			if (f.constructor == Array){ 
				viewerParams.parts.totalSize += parseFloat(f[1]);
			} else if (j == 1){
				viewerParams.parts.totalSize += parseFloat(f);
			}
		});
	});

	viewerParams.partsKeys.forEach( function(p, i) {
		viewerParams.parts[p] = {};


		viewerParams.filenames[p].forEach( function(f, j) {
			var readf = null;
			if (f.constructor == Array){
				readf = "data/"+f[0];
			} else if (j == 0){
				readf = "data/"+f
			}
			//console.log(readf)
			if (readf != null){
				//console.log("f = ", f)
				d3.json(prefix+readf,  function(foo) {
					//console.log("keys", Object.keys(foo), f[0])
					Object.keys(foo).forEach(function(k, jj) {
						//console.log("k = ", k, jj)
						if (viewerParams.parts[p].hasOwnProperty(k)){
							viewerParams.parts[p][k] = viewerParams.parts[p][k].concat(foo[k]);
							//console.log('appending', k, p, viewerParams.parts[p])

						} else {
							viewerParams.parts[p][k] = foo[k];
							//console.log('creating', k, p, viewerParams.parts[p], foo[k])
						}
					});


					viewerParams.loadfrac = countParts()/viewerParams.parts.totalSize;
					//console.log("loading", viewerParams.loadfrac)
					if (10. * viewerParams.loadfrac % 1 < 0.1 || viewerParams.loadfrac == 1){
						updateLoadingBar();
					}
					//console.log(d3.selectAll('#loadingRect').node().getBoundingClientRect().width)
					//console.log("counting", countParts(), viewerParams.parts.totalSize, viewerParams.loadfrac)
					if (countParts() ==  viewerParams.parts.totalSize && viewerParams.parts.options.loaded){
						//console.log("here")

						var index = viewerParams.partsKeys.indexOf('options');
						if (index > -1) {
							viewerParams.partsKeys.splice(index, 1);
							viewerParams.parts.options0 = JSON.parse(JSON.stringify(viewerParams.parts.options));
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
		.attr("height", viewerParams.loadingSizeY);

	viewerParams.svgContainer = svg.append("g")


	viewerParams.svgContainer.append("rect")
		.attr('id','loadingRectOutline')
		.attr("x", (screenWidth - viewerParams.loadingSizeX)/2)
		.attr("y", 0)
		.attr("width",viewerParams.loadingSizeX)
		.attr("height",viewerParams.loadingSizeY)
		.attr('fill','rgba(0,0,0,0)')
		.attr('stroke','#4E2A84')
		.attr('stroke-width', '3')

	viewerParams.svgContainer.append("rect")
		.attr('id','loadingRect')
		.attr("x", (screenWidth - viewerParams.loadingSizeX)/2)
		.attr("y", 0)//(screenHeight - sizeY)/2)
		.attr("height",viewerParams.loadingSizeY)
		.attr('fill','#4E2A84')
		.attr("width",viewerParams.loadingSizeX*viewerParams.loadfrac);


	window.addEventListener('resize', moveLoadingBar);

}
function updateLoadingBar(){

	//console.log(viewerParams.loadfrac, viewerParams.loadingSizeX*viewerParams.loadfrac)
	d3.selectAll('#loadingRect').transition().attr("width", viewerParams.loadingSizeX*viewerParams.loadfrac);

}

function moveLoadingBar(){
	var screenWidth = parseFloat(window.innerWidth);
	d3.selectAll('#loadingRectOutline').attr('x', (screenWidth - viewerParams.loadingSizeX)/2);
	d3.selectAll('#loadingRect').attr('x', (screenWidth - viewerParams.loadingSizeX)/2);
}

//check if the data is loaded
function clearloading(){
	viewerParams.loaded = true;
	viewerParams.reset = false;

	//show the rest of the page
	d3.select("#ContentContainer").style("visibility","visible")

	console.log("loaded")
	d3.select("#loader").style("display","none")
	d3.select("#splashdiv5").text("Click to begin.");

}

function WebGLStart(){

//reset the window title
	if (viewerParams.parts.hasOwnProperty('options')){
		if (viewerParams.parts.options.hasOwnProperty('title')){
			window.document.title = viewerParams.parts.options.title
		}
	}

	document.addEventListener('mousedown', handleMouseDown);

	initPVals();

	initScene();
	
	initColumnDensity();
	
	//draw everything
	drawScene();


	//begin the animation
	// keep track of runtime for crashing the app rather than the computer
	var currentTime = new Date();
	var seconds = currentTime.getTime()/1000;
	viewerParams.currentTime = seconds;

	viewerParams.pauseAnimation = false;
	animate();

}

//wait for all the input before loading
function makeViewer(){
	viewerParams.haveUI = false;
	viewerParams.ready = false;	
	viewerParams.waitForInit = setInterval(function(){ 
		console.log("Waiting for viewer init", viewerParams.ready)
		if (viewerParams.ready){
			clearInterval(viewerParams.waitForInit);
			viewerParams.pauseAnimation = false;
			viewerParams.parts.options0 = createPreset(); //this might break things if the presets don't work...
			console.log("initial options", viewerParams.parts.options)
			sendInitGUI();
		}
	}, 100);
}

function updateViewerCamera(){
	viewerParams.camera.position.set(viewerParams.cameraPosition.x, viewerParams.cameraPosition.y, viewerParams.cameraPosition.z);
	viewerParams.camera.rotation.set(viewerParams.cameraRotation.x, viewerParams.cameraRotation.y, viewerParams.cameraRotation.z);
	viewerParams.controls.target = new THREE.Vector3(viewerParams.controlsTarget.x, viewerParams.controlsTarget.y, viewerParams.controlsTarget.z);

}

function sendInitGUI(){
	//general particle settings
	var forGUI = [];
	forGUI.push({'setGUIParamByKey':[viewerParams.partsKeys, "partsKeys"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.PsizeMult, "PsizeMult"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.plotNmax, "plotNmax"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.decimate, "decimate"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.Pcolors, "Pcolors"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.showParts, "showParts"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.parts.options.UIdropdown, "useDropdown"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.parts.options.UIcolorPicker, "useColorPicker"]});

	//for velocities
	forGUI.push({'setGUIParamByKey':[viewerParams.showVel, "showVel"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.velopts, "velopts"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.velType, "velType"]});
	var haveVelocities = {};
	viewerParams.partsKeys.forEach(function(p){
		haveVelocities[p] = false;
		if (viewerParams.parts[p].Velocities != null){
			haveVelocities[p] = true;
		}
	});
	forGUI.push({'setGUIParamByKey':[haveVelocities,"haveVelocities"]});

	//for colormap
	forGUI.push({'setGUIParamByKey':[viewerParams.ckeys,"ckeys"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.colormapVals, "colormapVals"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.colormapLims, "colormapLims"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.colormapVariable, "colormapVariable"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.colormap, "colormap"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.showColormap, "showColormap"]});
	var haveColormap = {};
	var haveColormapSlider = {};
	viewerParams.partsKeys.forEach(function(p){
		haveColormap[p] = false;
		haveColormapSlider[p] = {};
		viewerParams.ckeys[p].forEach(function(ck){
			haveColormapSlider[p][ck] = false;
			if (viewerParams.parts[p][ck] != null){
				haveColormap[p] = true;
				haveColormapSlider[p][ck] = true;
			}
		});
	});
	forGUI.push({'setGUIParamByKey':[haveColormap,"haveColormap"]});
	forGUI.push({'setGUIParamByKey':[haveColormapSlider,"haveColormapSlider"]});

	//for filters
	forGUI.push({'setGUIParamByKey':[viewerParams.fkeys,"fkeys"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.filterVals,"filterVals"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.filterLims,"filterLims"]});
	var haveFilter = {};
	var haveFilterSlider = {};
	viewerParams.partsKeys.forEach(function(p){
		haveFilter[p] = false;
		haveFilterSlider[p] = {};
		viewerParams.fkeys[p].forEach(function(fk){
			haveFilterSlider[p][fk] = false;
			if (viewerParams.parts[p][fk] != null){
				haveFilter[p] = true;
				haveFilterSlider[p][fk] = true;
			}
		});
	});
	forGUI.push({'setGUIParamByKey':[haveFilter,"haveFilter"]});
	forGUI.push({'setGUIParamByKey':[haveFilterSlider,"haveFilterSlider"]});

	//for camera
	forGUI.push({'setGUIParamByKey':[viewerParams.stereoSepMax, "stereoSepMax"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.friction, "friction"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.useTrackball, "useTrackball"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.useStereo, "useStereo"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.renderWidth,"renderWidth"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.renderHeight,"renderHeight"]});

	forGUI.push({'setGUIParamByKey':[viewerParams.reset,"reset"]});

	forGUI.push({'setGUIParamByKey':[viewerParams.camera.position, "cameraPosition"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.camera.rotation, "cameraRotation"]});
	var xx = new THREE.Vector3(0,0,0);
	viewerParams.camera.getWorldDirection(xx);
	forGUI.push({'setGUIParamByKey':[xx, "cameraDirection"]});
	if (viewerParams.useTrackball) forGUI.push({'setGUIParamByKey':[viewerParams.controls.target, "controlsTarget"]});

	forGUI.push({'updateUICenterText':null});
	forGUI.push({'updateUICameraText':null});
	forGUI.push({'updateUIRotText':null});

	if (viewerParams.usingSocket && !viewerParams.local) forGUI.push({'updateGUICamera':null});

	sendToGUI(forGUI);

	//ready to create GUI
	console.log("sent all inits to GUI")

}

function sendCameraInfoToGUI(foo, updateCam=false){

	var xx = new THREE.Vector3(0,0,0);
	viewerParams.camera.getWorldDirection(xx);

	var forGUI = [];
	forGUI.push({'setGUIParamByKey':[viewerParams.camera.position, "cameraPosition"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.camera.rotation, "cameraRotation"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.camera.up, "cameraUp"]});
	forGUI.push({'setGUIParamByKey':[xx, "cameraDirection"]});
	if (viewerParams.useTrackball) forGUI.push({'setGUIParamByKey':[viewerParams.controls.target, "controlsTarget"]});

	forGUI.push({'updateUICenterText':null});
	forGUI.push({'updateUICameraText':null});
	forGUI.push({'updateUIRotText':null});

	if (updateCam) forGUI.push({'updateGUICamera':null});

	sendToGUI(forGUI);
}
//so that it can run locally also without using Flask
function runLocal(){
	viewerParams.usingSocket = false;
	GUIParams.usingSocket = false;

	//both of these start setIntervals to wait for the proper variables to be set
	makeViewer();
	makeUI(local=true);
	
	//This will  load the data, and then start the WebGL rendering
	getFilenames(prefix = "static/");
}

/////////////////////
//// for sockets
/////////////////////
//https://blog.miguelgrinberg.com/post/easy-websockets-with-flask-and-gevent
//https://github.com/miguelgrinberg/Flask-SocketIO
function connectViewerSocket(){
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
		//updates from GUI
		socketParams.socket.on('update_viewerParams', function(msg) {
			setParams(msg);
		});
		socketParams.socket.on('input_data', function(msg) {
			//only tested for local (GUI + viewer in one window)
			console.log("have data : ", msg);
			var socketCheck = viewerParams.usingSocket;
			defineViewerParams();
			viewerParams.pauseAnimation = true;
			viewerParams.partsKeys = Object.keys(msg.parts);
			viewerParams.parts = JSON.parse(JSON.stringify(msg.parts));
			viewerParams.parts.options = JSON.parse(JSON.stringify(msg.options));
			console.log("parts", viewerParams.parts, viewerParams.partsKeys)

			viewerParams.usingSocket = socketCheck; 

			makeViewer();
			WebGLStart();

			var forGUI = [];
			forGUI.push({'defineGUIParams':null});
			forGUI.push({'setGUIParamByKey':[viewerParams.usingSocket, "usingSocket"]});
			forGUI.push({'makeUI':!viewerParams.usingSocket});
			sendToGUI(forGUI);

		});
	});
}


//function to send events to the GUI
function sendToGUI(GUIInput){
	if (viewerParams.usingSocket){
		socketParams.socket.emit('gui_input',GUIInput);
	} else {
		setParams(GUIInput);
	}
}

//a bit clunky...
function setViewerParamByKey(args){
	//first argument is always the value of the variable that you want to set
	//the remaining values in args are how to reference the variable, going in order for object keys as they would be written to access the variable (see below)
	var value = args[0];
	var key1 = args[1];
	if (args.length == 2) {
		viewerParams[key1] = JSON.parse(JSON.stringify(value));
	} else if (args.length == 3) {
		var key2 = args[2];
		viewerParams[key1][key2] = JSON.parse(JSON.stringify(value));
	} else if (args.length == 4) {
		var key2 = args[2];
		var key3 = args[3];
		viewerParams[key1][key2][key3] = JSON.parse(JSON.stringify(value));
	} else if (args.length == 5) {
		var key2 = args[2];
		var key3 = args[3];
		var key4 = args[4];
		viewerParams[key1][key2][key3][key4] = JSON.parse(JSON.stringify(value));
	} else {
		console.log('!!!! WRONG NUMBER OF ARGUMENTS TO PASS', args.length, args)
	}
}

//for fly controls
document.addEventListener("keydown", sendCameraInfoToGUI);


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
						var prefix = null;
						if (viewerParams.usingSocket) prefix = 'static/'
						callLoadData(foo, prefix);
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


