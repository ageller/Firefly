function initControls(){

	var forGUI = []
	forGUI.push({'setGUIParamByKey':[viewerParams.useTrackball, "useTrackball"]})

	if (viewerParams.useTrackball) {
		var xx = new THREE.Vector3(0,0,0);
		viewerParams.camera.getWorldDirection(xx);
		viewerParams.controls = new THREE.TrackballControls( viewerParams.camera, viewerParams.renderer.domElement );
		viewerParams.controls.target = new THREE.Vector3(viewerParams.camera.position.x + xx.x, viewerParams.camera.position.y + xx.y, viewerParams.camera.position.z + xx.z);
		if (viewerParams.parts.hasOwnProperty('options') && !viewerParams.switchControls){
			if (viewerParams.parts.options.hasOwnProperty('center') ){
				if (viewerParams.parts.options.center != null){
					viewerParams.controls.target = new THREE.Vector3(viewerParams.parts.options.center[0], viewerParams.parts.options.center[1], viewerParams.parts.options.center[2]);

				}
			}
			if (viewerParams.parts.options.hasOwnProperty('cameraUp') ){
				if (viewerParams.parts.options.cameraUp != null){
					viewerParams.camera.up.set(viewerParams.parts.options.cameraUp[0], viewerParams.parts.options.cameraUp[1], viewerParams.parts.options.cameraUp[2]);
				}
			}
			//this does not work (a bug/feature of trackballControls)
			if (viewerParams.parts.options.hasOwnProperty('cameraRotation') ){
				if (viewerParams.parts.options.cameraRotation != null){
					viewerParams.camera.rotation.set(viewerParams.parts.options.cameraRotation[0], viewerParams.parts.options.cameraRotation[1], viewerParams.parts.options.cameraRotation[2]);
				}
			}

		} 

		viewerParams.controls.dynamicDampingFactor = viewerParams.friction;
		viewerParams.controls.addEventListener('change', sendCameraInfoToGUI);
	} else if (viewerParams.useOrientationControls) {
		viewerParams.controls = new THREE.DeviceOrientationControls(viewerParams.camera);
		viewerParams.controls.updateAlphaOffsetAngle(THREE.Math.degToRad(-90));
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
			//Canvas Renderer has been removed, and I can't get the old version to work now
			//viewerParams.renderer = new THREE.CanvasRenderer(); 
			alert("Your browser does not support WebGL.  Therefore Firefly cannot run.  Please use a different browser.");

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

		if (viewerParams.useStereo){
			viewerParams.normalRenderer = viewerParams.renderer;
			viewerParams.renderer = viewerParams.effect;
		}
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

	//viewerParams.useTrackball = true;

	//console.log(viewerParams.parts.options);
	setCenter(viewerParams.parts[viewerParams.partsKeys[0]].Coordinates);
	viewerParams.camera.position.set(viewerParams.center.x, viewerParams.center.y, viewerParams.center.z - viewerParams.boxSize/2.);
	viewerParams.camera.lookAt(viewerParams.scene.position);  


	//apply presets from the options file
	if (viewerParams.parts.hasOwnProperty('options')) applyOptions();

	//octree
	//viewerParams.octree = new THREE.Octree();//{scene:viewerParams.scene}); //add the scene if it should be visualized

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

	//change the rotation of the camera 
	if (viewerParams.parts.options.hasOwnProperty('cameraRotation')){
		if (viewerParams.parts.options.cameraRotation != null){
			viewerParams.camera.rotation.set(viewerParams.parts.options.cameraRotation[0], viewerParams.parts.options.cameraRotation[1], viewerParams.parts.options.cameraRotation[2]);
		}
	}

	//change the up vector of the camera (required to get the rotation correct)
	if (viewerParams.parts.options.hasOwnProperty('cameraUp')){
		if (viewerParams.parts.options.cameraUp != null){
			viewerParams.camera.up.set(viewerParams.parts.options.cameraUp[0], viewerParams.parts.options.cameraUp[1], viewerParams.parts.options.cameraUp[2]);
		}
	}

	//check if we are starting in Fly controls
	if (viewerParams.parts.options.hasOwnProperty('startFly')){
		if (viewerParams.parts.options.startFly == true){
			viewerParams.useTrackball = false;
			viewerParams.useOrientation = false;
		}
	}

	//check if we are starting in Orientation controls
	if (viewerParams.parts.options.hasOwnProperty('startOrientation')){
		if (viewerParams.parts.options.startOrientation == true){
			viewerParams.useTrackball = false;
			viewerParams.useOrientation = true;
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
				sendToGUI([{'evalCommand':[evalString]}]);
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

    // add an annotation to the top if necessary
	if (viewerParams.parts.options.hasOwnProperty('annotation')){
            if (viewerParams.parts.options.annotation != null){
                elm = document.getElementById('annotate_container');
                elm.innerHTML=viewerParams.parts.options.annotation;
                elm.style.display='block';
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
							sendToGUI([{'evalCommand':[evalString]}]);
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

		//filter invert
		if (viewerParams.parts.options.hasOwnProperty("invertFilter")){
			if (viewerParams.parts.options.invertFilter != null){
				if (viewerParams.parts.options.invertFilter.hasOwnProperty(p)){
					if (viewerParams.parts.options.invertFilter[p] != null){

						for (k=0; k<viewerParams.fkeys[p].length; k++){
							var fkey = viewerParams.fkeys[p][k]
							if (viewerParams.parts.options.invertFilter[p].hasOwnProperty(fkey)){
								if (viewerParams.parts.options.invertFilter[p][fkey] != null){
									viewerParams.invertFilter[p][fkey] = viewerParams.parts.options.invertFilter[p][fkey];

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
		}//colormap limits

		//colormap values
		if (viewerParams.parts.options.hasOwnProperty("colormapVals")){
			if (viewerParams.parts.options.colormapVals != null){
				if (viewerParams.parts.options.colormapVals.hasOwnProperty(p)){
					if (viewerParams.parts.options.colormapVals[p] != null){
						viewerParams.updateColormap[p] = true

						for (k=0; k<viewerParams.ckeys[p].length; k++){
							var ckey = viewerParams.ckeys[p][k]
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
		}// colormap vals

		//start plotting with a colormap
		if (viewerParams.parts.options.hasOwnProperty("showColormap") &&
			viewerParams.parts.options.showColormap != null &&
			viewerParams.parts.options.showColormap.hasOwnProperty(p) &&
			viewerParams.parts.options.showColormap[p] == true){
			viewerParams.updateColormap[p] = true
			viewerParams.showColormap[p] = true;
			if (viewerParams.haveUI){
				console.log(p+'colorCheckBox')
				var evalString = 'elm = document.getElementById("'+p+'colorCheckBox"); elm.checked = true; elm.value = true;'
				sendToGUI([{'evalCommand':[evalString]}]);
			}
		}

		//choose which colormap to use
		if (viewerParams.parts.options.hasOwnProperty("colormap") && 
			viewerParams.parts.options.colormap != null &&
			viewerParams.parts.options.colormap.hasOwnProperty(p) && 
			viewerParams.parts.options.colormap[p] != null){

			viewerParams.colormap[p] = copyValue(viewerParams.parts.options.colormap[p]);

		}
		//select the colormap variable to color by
		if (viewerParams.parts.options.hasOwnProperty("colormapVariable") && 
			viewerParams.parts.options.colormapVariable != null &&
			viewerParams.parts.options.colormapVariable.hasOwnProperty(p) && 
			viewerParams.parts.options.colormapVariable[p] != null){

			viewerParams.colormapVariable[p] = copyValue(viewerParams.parts.options.colormapVariable[p]);


		}
	}// particle specific options

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
		//in case there are no filter possibilities (but will be overwritten below)
		viewerParams.fkeys[p] = ["None"];
		viewerParams.filterLims[p]["None"] = [0,1];
		viewerParams.filterVals[p]["None"] = [0,1]; 
		var haveCurrentFilter = true;
		if (viewerParams.parts[p].currentlyShownFilter == undefined) {
			viewerParams.parts[p].currentlyShownFilter = ["None"];
			haveCurrentFilter = false;
		}
		if (viewerParams.parts[p].hasOwnProperty("filterKeys")){
			viewerParams.fkeys[p] = viewerParams.parts[p].filterKeys;
			viewerParams.parts[p]['playbackTicks'] = 0;
			viewerParams.parts[p]['playbackTickRate'] = 10;   
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
					// set the currently shown filter for each part type at startup
					// so the first click isn't broken
					if (!haveCurrentFilter) {
						viewerParams.parts[p].currentlyShownFilter = fkey;
						haveCurrentFilter = true;
					}
				}
			}
		}
		//colormap
		//in case there are no colormap possibilities (but will be overwritten below)
		viewerParams.ckeys[p] = ["None"];
		viewerParams.colormapLims[p]["None"] = [0,1];
		viewerParams.colormapVals[p]["None"] = [0,1];
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
	viewerParams.counting = true;
	viewerParams.partsKeys.forEach( function(p, i) {
		if (viewerParams.parts.hasOwnProperty(p)){
			if (viewerParams.parts[p].hasOwnProperty('Coordinates')){
				num += viewerParams.parts[p].Coordinates.length;
			}
		}
		if (i == viewerParams.partsKeys.length - 1) viewerParams.counting = false;
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
				var forGUI = [];
				forGUI.push({'setGUIParamByKey':[viewerParams.dir, "dir"]});
				forGUI.push({'showLoadingButton':'#selectStartupButton'});
				forGUI.push({'selectFromStartup':prefix});
				sendToGUI(forGUI);
			} 
			if (i != null && i < Object.keys(viewerParams.dir).length){
				d3.json(prefix+viewerParams.dir[i] + "/filenames.json",  function(files) {
					if (files != null){
						callLoadData([files, prefix]);
					} else {
						sendToGUI([{'showLoadingButton':'#loadDataButton'}]);
						alert("Cannot load data. Please select another directory.");
					}
				});
			}
		} else {
			sendToGUI([{'showLoadingButton':'#loadDataButton'}]);
		}
	});
}



//once a data directory is identified, this will define the parameters, draw the loading bar and, load in the data
function callLoadData(args){
	var files = args[0];
	var prefix = "";
	if (args.length > 0) prefix = args[1];

	var dir = {};
	if (viewerParams.hasOwnProperty('dir')){
		dir = viewerParams.dir;
	}
	viewerParams.dir = dir;
	sendToGUI([{'setGUIParamByKey':[viewerParams.dir, "dir"]}]);

	drawLoadingBar();
	viewerParams.filenames = files;
	console.log("loading new data", files)
	loadData(WebGLStart, prefix);
}
function compileData(data, p, callback, initialLoadFrac=0){
	//console.log('in compile data', p, data)
	Object.keys(data).forEach(function(k, jj) {
		//console.log("k = ", k, jj)
		if (viewerParams.parts[p].hasOwnProperty(k)){
			viewerParams.parts[p][k] = viewerParams.parts[p][k].concat(data[k]);
			//console.log('appending', k, p, viewerParams.parts[p])

		} else {
			viewerParams.parts[p][k] = data[k];
			//console.log('creating', k, p, viewerParams.parts[p], data[k])
		}
	});


	var num = 0;
	if (!viewerParams.counting){
		var num = countParts()
		var loadfrac = (num/viewerParams.parts.totalSize)*(1. - initialLoadFrac) + initialLoadFrac;
		//some if statment like this seems necessary.  Otherwise the loading bar doesn't update (I suppose from too many calls)
		if (loadfrac - viewerParams.loadfrac > 0.5 || loadfrac == 1){
			viewerParams.loadfrac = loadfrac;
			updateLoadingBar();
		}
	}
	if ('options' in viewerParams.parts){
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
	}
}
function loadData(callback, prefix="", internalData=null, initialLoadFrac=0){

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
			//console.log("f = ", f)
			if (internalData){
				console.log('==== compiling internal data', f)
				Object.keys(internalData).forEach(function(key,k){
					//if I was sent a prefix, this could be simplified
					if (key.includes(f[0])) compileData(internalData[key], p, callback, initialLoadFrac=initialLoadFrac)
				})
			} else {
				var readf = null;
				if (f.constructor == Array){
					readf = "data/"+f[0];
				} else if (j == 0){
					readf = "data/"+f
				}
				//console.log(readf)
				if (readf != null){
					d3.json(prefix+readf,  function(foo) {
						compileData(foo, p, callback, initialLoadFrac=initialLoadFrac);
					});
				}
			}
		});
		if (internalData && i == viewerParams.partsKeys.length - 1 && j == viewerParams.filenames[p].length - 1){
			viewerParams.newInternalData = {};
		}
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
		.attr('stroke','var(--logo-color1)')
		.attr('stroke-width', '3')

	viewerParams.svgContainer.append("rect")
		.attr('id','loadingRect')
		.attr("x", (screenWidth - viewerParams.loadingSizeX)/2)
		.attr("y", 0)//(screenHeight - sizeY)/2)
		.attr("height",viewerParams.loadingSizeY)
		.attr('fill','var(--logo-color1)')
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
	if (viewerParams.local){
		d3.select("#splashdiv5").text("Click to begin.");
	} else {
		showSplash(false);
	}

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
	Promise.all([
		drawScene(),
	]).then(function(){
		//searchOctree();
		
		//begin the animation
		// keep track of runtime for crashing the app rather than the computer
		var currentTime = new Date();
		var seconds = currentTime.getTime()/1000;
		viewerParams.currentTime = seconds;

		viewerParams.pauseAnimation = false;
		animate();

	})



}

//wait for all the input before loading
function makeViewer(pSize=null, prepend=[], append=[]){
	viewerParams.haveUI = false;
	viewerParams.ready = false; 
	console.log("Waiting for viewer init ...")
	clearInterval(viewerParams.waitForInit);
	viewerParams.waitForInit = setInterval(function(){ 
		var ready = confirmViewerInit();
		if (ready){
			console.log("Viewer ready.")
			clearInterval(viewerParams.waitForInit);
			viewerParams.ready = true;
			viewerParams.pauseAnimation = false;
			viewerParams.parts.options0 = createPreset(); //this might break things if the presets don't work...
			console.log("initial options", viewerParams.parts.options)

			//to test
			if (pSize) {
				viewerParams.PsizeMult.Gas = pSize;
				console.log('new Psize', pSize)
			}
			sendInitGUI(prepend=prepend, append=append);
		}
	}, 100);
}

function confirmViewerInit(){
	var keys = ["partsKeys", "PsizeMult", "plotNmax", "decimate", "stereoSepMax", "friction", "Pcolors", "showParts", "showVel", "velopts", "velType", "ckeys", "colormapVals", "colormapLims", "colormapVariable", "colormap", "showColormap", "fkeys", "filterVals", "filterLims", "renderer", "scene", "controls","camera","parts"];

	var ready = true;
	keys.forEach(function(k,i){
		if (viewerParams[k] == null) ready = false;
	});

	if (viewerParams.parts == null){
		ready = false;
	} else {
		var partsVals = ["Coordinates"]
		if (viewerParams.hasOwnProperty('partsKeys')){
			viewerParams.partsKeys.forEach(function(p){
				partsVals.forEach(function(k,i){
					if (viewerParams.parts[p][k] == null) ready = false;
				});
			})
		}
	}

	return ready;
}

function updateViewerCamera(){
	if (viewerParams.useTrackball) viewerParams.controls.target = new THREE.Vector3(viewerParams.controlsTarget.x, viewerParams.controlsTarget.y, viewerParams.controlsTarget.z);

	if (viewerParams.camera){
		viewerParams.camera.position.set(viewerParams.cameraPosition.x, viewerParams.cameraPosition.y, viewerParams.cameraPosition.z);
		viewerParams.camera.rotation.set(viewerParams.cameraRotation._x, viewerParams.cameraRotation._y, viewerParams.cameraRotation._z);
		viewerParams.camera.up.set(viewerParams.cameraUp.x, viewerParams.cameraUp.y, viewerParams.cameraUp.z);
	}
	//console.log(viewerParams.camera.position, viewerParams.camera.rotation, viewerParams.camera.up);
}

function sendInitGUI(prepend=[], append=[]){
	//general particle settings
	console.log('Sending init to GUI', viewerParams);

	var forGUI = prepend;
	forGUI.push({'setGUIParamByKey':[false,"GUIready"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.partsKeys, "partsKeys"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.PsizeMult, "PsizeMult"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.plotNmax, "plotNmax"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.decimate, "decimate"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.Pcolors, "Pcolors"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.showParts, "showParts"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.parts.options.UIdropdown, "useDropdown"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.parts.options.UIcolorPicker, "useColorPicker"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.boxSize, "boxSize"]});

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
	forGUI.push({'setGUIParamByKey':[viewerParams.invertFilter,"invertFilter"]});
	var haveFilter = {};
	var haveFilterSlider = {};
	viewerParams.partsKeys.forEach(function(p){
		haveFilter[p] = false;
		haveFilterSlider[p] = {};
		forGUI.push({'setGUIParamByKey':[viewerParams.parts[p].currentlyShownFilter,"currentlyShownFilter",p]});
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
	forGUI.push({'setGUIParamByKey':[viewerParams.camera.up, "cameraUp"]});
	var xx = new THREE.Vector3(0,0,0);
	viewerParams.camera.getWorldDirection(xx);
	forGUI.push({'setGUIParamByKey':[xx, "cameraDirection"]});
	if (viewerParams.useTrackball) forGUI.push({'setGUIParamByKey':[viewerParams.controls.target, "controlsTarget"]});

	forGUI.push({'updateUICenterText':null});
	forGUI.push({'updateUICameraText':null});
	forGUI.push({'updateUIRotText':null});

	//if (viewerParams.usingSocket && !viewerParams.local) forGUI.push({'updateGUICamera':null});
	if (viewerParams.usingSocket && !viewerParams.local) forGUI.push({'setGUIParamByKey':[true, "cameraNeedsUpdate"]});

	append.forEach(function(x,i){
		forGUI.push(x);
	})

	forGUI.push({'setGUIParamByKey':[true,"GUIready"]});

	sendToGUI(forGUI);

	//ready to create GUI
	console.log("sent all inits to GUI", forGUI)

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
function runLocal(useSockets=true, showGUI=true, useOrientationControls=false, startStereo=false, pSize=null){
	viewerParams.local = true;
	viewerParams.usingSocket = useSockets;
	forGUI = [];
	forGUI.push({'setGUIParamByKey':[viewerParams.usingSocket, "usingSocket"]});
	forGUI.push({'setGUIParamByKey':[viewerParams.local, "local"]});
	sendToGUI(forGUI);

	viewerParams.useStereo = startStereo;
	viewerParams.useOrientationControls = useOrientationControls;
	viewerParams.useTrackball = !useOrientationControls;
	
	//both of these start setIntervals to wait for the proper variables to be set
	makeViewer(pSize);
	if (showGUI) {
		makeUI(local=true);
	} else {
		d3.selectAll('.UIcontainer').classed('hidden', true)
	}
	
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
			socketParams.socket.emit('connection_test', {data: 'Viewer connected!'});
		});
		socketParams.socket.on('connection_response', function(msg) {
			console.log('connection response', msg);
		});     
		// Event handler for server sent data.
		// The callback function is invoked whenever the server emits data
		// to the client. The data is then displayed in the "Received"
		// section of the page.
		//updates from GUI
		socketParams.socket.on('update_viewerParams', function(msg) {
			setParams(msg);
		});

		socketParams.socket.on('show_loader', function(msg) {
			d3.select("#splashdivLoader").selectAll('svg').remove();
			d3.select("#splashdiv5").text("Loading...");
			d3.select("#loader").style("display","visible");
			viewerParams.loaded = false;
			viewerParams.pauseAnimation = true;

			viewerParams.loadfrac = 0.;
			drawLoadingBar();

			showSplash();
		});

		socketParams.socket.on('input_data', function(msg) {
			//only tested for local (GUI + viewer in one window)
			console.log("======== have new data : ", Object.keys(msg));


			//first compile the data from multiple calls
			if ('status' in msg){
				if (msg.status == 'start') {
					var socketCheck = viewerParams.usingSocket;
					var localCheck = viewerParams.local;
					//in case it's already waiting, which will happen if loading an hdf5 file from the gui
					clearInterval(viewerParams.waitForInit);
					defineViewerParams();
					viewerParams.pauseAnimation = true;
					viewerParams.usingSocket = socketCheck; 
					viewerParams.local = localCheck; 

					viewerParams.newInternalData.data = {};
					viewerParams.newInternalData.len = msg.length;
					viewerParams.newInternalData.count = 0;
				}
				if (msg.status == 'data') {
					viewerParams.newInternalData.count += 1;
					//I will update the loading bar here, but I'm not sure what fraction of the time this should take (using 0.8 for now)
					viewerParams.loadfrac = (viewerParams.newInternalData.count/viewerParams.newInternalData.len)*0.8; 
					updateLoadingBar();
					Object.keys(msg).forEach(function(key,i){
						if (key != 'status'){
							viewerParams.newInternalData.data[key] = JSON.parse(msg[key]);
							if (key.includes('filenames.json')){
								viewerParams.filenames = JSON.parse(msg[key]);
							}
						}
					})
				}
				if (msg.status == 'done'){
					console.log('======== have all data', viewerParams.newInternalData, viewerParams.filenames);
					loadData(initInputData, prefix='', internalData=viewerParams.newInternalData.data, initialLoadFrac=viewerParams.loadfrac)
				}
			}

		});

		socketParams.socket.on('update_streamer', function(msg) {
			viewerParams.streamReady = true;
		});
		socketParams.socket.on('reload_viewer', function(msg) {
			console.log('!!! reloading viewer');
			location.reload();
		});
	});
}

function initInputData(){
	console.log('======== remaking gui and viewer')
	var forGUIprepend = [];
	forGUIprepend.push({'clearGUIinterval':null});
	forGUIprepend.push({'defineGUIParams':null});

	var forGUIappend = [];
	forGUIappend.push({'setGUIParamByKey':[viewerParams.usingSocket, "usingSocket"]});
	forGUIappend.push({'setGUIParamByKey':[viewerParams.local, "local"]});
	forGUIappend.push({'makeUI':viewerParams.local});

	//I think I need to wait a moment because sometimes this doesn't fire (?)
	setTimeout(function(){
		makeViewer(null, forGUIprepend, forGUIappend);
		WebGLStart();
	}, 1000);



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
	//console.log(args)
}

//for fly controls
document.addEventListener("keydown", sendCameraInfoToGUI);


function changeSnapSizes(){
	//size of the snapshot (from text input)
	var oldW = 0+viewerParams.renderWidth;
	var oldH = 0+viewerParams.renderHeight;

	viewerParams.renderWidth = window.innerWidth;
	viewerParams.renderHeight = window.innerHeight;

	if (oldW != viewerParams.renderWidth || oldH != viewerParams.renderHeight){
		var forGUI = [];
		forGUI.push({'setGUIParamByKey':[viewerParams.renderWidth, 'renderWidth']});
		forGUI.push({'setGUIParamByKey':[viewerParams.renderHeight, 'renderHeight'] });

		forGUI.push({'changeUISnapSizes':null});

		sendToGUI(forGUI);
	}
}
window.addEventListener('resize', changeSnapSizes);



