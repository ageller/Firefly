//reset to the initial Options file
function resetToOptions()
{
	console.log("Resetting to Default");
	params.parts.options = params.parts.options0;

	params.reset = true;
	//reset all the parts specific values to the initial ones
	initPVals();

	//redo init, but only the camera bits (maybe could streamline this and init by using the functions below?)
	init();

	//resize the bottom of the UI if necessary
	var i = params.partsKeys.length-1;
	var pID = params.partsKeys[i];
	if (!params.gtoggle[pID]){
		var elm = document.getElementById(pID+'Dropbtn');
		showFunction(elm);
	}
	//destroy the particle portion of the UI and recreate it (simplest option, but not really destroying all elements...)
	d3.select('#particleUI').html("");
	createUI();

	drawScene();
	params.reset = false;

}

//to load in a new data set
function loadNewData(){

	d3.select('#particleUI').html("");
	d3.select('.UIcontainer').html("");
	d3.select("#splashdivLoader").selectAll('svg').remove();
	d3.select("#splashdiv5").text("Loading...");
	console.log('here', params.dir, Object.keys(params.dir).length)
	if (Object.keys(params.dir).length > 1){
		showLoadingButton('#selectStartupButton');
	} else {
		showLoadingButton('#loadDataButton');
	}
	d3.select("#loader").style("display","visible");
	params.loadfrac = 0.;
	showSplash();

	params.loaded = false;
	params.pauseAnimation = true;

	document.getElementById("inputFilenames").click();
}

//for loading, reading and resetting to a preset file
function loadPreset()
{
	document.getElementById("presetFile").click();
}
function readPreset(file)
{
	//get the new options JSON
	var preset = {};
	preset.loaded = false;

	var reader = new FileReader();
	reader.readAsText(file, 'UTF-8');
	reader.onload = function(){
		preset = JSON.parse(this.result);
		if (preset.loaded){
			resetToPreset(preset);
		}
	}
}
function resetToPreset(preset)
{
	console.log("Resetting to Preset");
	document.getElementById("presetFile").value = "";
	params.parts.options = preset;

	params.reset = true;
	//reset all the parts specific values to the initial ones
	initPVals();

	//redo init, but only the camera bits (maybe could streamline this and init by using the functions below?)
	init();

	//resize the bottom of the UI if necessary
	var i = params.partsKeys.length-1;
	var pID = params.partsKeys[i];
	if (!params.gtoggle[pID]){
		var elm = document.getElementById(pID+'Dropbtn');
		showFunction(elm);
	}	
	//destroy the particle portion of the UI and recreate it (simplest option, but not really destroying all elements...)
	d3.select('#particleUI').html("");
	createUI();

	drawScene();
	params.reset = false;

}

//check whether the center is locked or not
function checkCenterLock(box)
{

	params.controls.dispose();
	params.switchControls = true;
	if (box.checked) {
		params.useTrackball = true;
	} else {
		params.useTrackball = false;
	}
	initControls();

}

//reset the camera position to whatever is saved in the options parameters
//NOTE: if the cameraRotation is set, then the controls become fly controls
function resetCamera() 
{

	var screenWidth = window.innerWidth;
	var screenHeight = window.innerHeight;
	var aspect = screenWidth / screenHeight;
	params.camera = new THREE.PerspectiveCamera( params.fov, aspect, params.zmin, params.zmax);
	params.camera.up.set(0, -1, 0);
	params.scene.add(params.camera); 

	setCenter(params.parts[params.partsKeys[0]].Coordinates);
	params.camera.position.set(0,0,-10);
	params.camera.lookAt(params.scene.position);  

	//change the center?
	if (params.parts.options.hasOwnProperty('center')){
		if (params.parts.options.center != null){
			params.center = new THREE.Vector3(params.parts.options.center[0], params.parts.options.center[1], params.parts.options.center[2]);
			setBoxSize(params.parts[params.partsKeys[0]].Coordinates);
		}
	} 

	//change location of camera?
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


	params.controls.dispose();
	initControls();


}

//reset the camera center.  Can be useful when switching back and forth between trackball and fly controls
function recenterCamera() 
{
	initControls();
}

//replace the current camera settings in options with the current camera position and rotation (to return here upon clicking reset)
//NOTE: with a reset, this will set the controls to fly controls
function saveCamera() 
{

	if (params.parts.options.hasOwnProperty('camera')){
		if (params.parts.options.camera == null){
			params.parts.options.camera = [0,0,0];
		}
	} else {
		params.parts.options.camera = [0,0,0];
	}
	params.parts.options.camera[0] = params.camera.position.x;
	params.parts.options.camera[1] = params.camera.position.y;
	params.parts.options.camera[2] = params.camera.position.z;


	if (params.parts.options.hasOwnProperty('center')){
		if (params.parts.options.center == null){
			params.parts.options.center = [0,0,0];
		}
	} else {
		params.parts.options.center = [0,0,0];
	}

	if (params.useTrackball){
		params.parts.options.center[0] = params.controls.target.x;
		params.parts.options.center[1] = params.controls.target.y;
		params.parts.options.center[2] = params.controls.target.z;
	} 

	if (params.parts.options.hasOwnProperty('cameraRotation')){
		if (params.parts.options.cameraRotation != null){
			params.parts.options.cameraRotation[0] = params.camera.rotation.x;
			params.parts.options.cameraRotation[1] = params.camera.rotation.y;
			params.parts.options.cameraRotation[2] = params.camera.rotation.z;
		}
	}
}

function checkVelBox(box)
{
	var pID = box.id.slice(0, -11)
	params.showVel[pID] = false;
	if (box.checked){
		params.showVel[pID] = true;
	}

}

//functions to check color of particles
function checkColor(event, color)
{
	rgb = color.toRgb();
	var pID = event.id.slice(0,-11); // remove  "ColorPicker" from id
	params.Pcolors[pID] = [rgb.r/255., rgb.g/255., rgb.b/255., rgb.a];
}


/////////////////////////////////////////////
// Filter sliders
function setFSliderHandle(i, value, parent, reset=false) {

	// I need a better way to do this!
	var fpos = parent.id.indexOf('_FK_');
	var epos = parent.id.indexOf('_END_');
	var sl = parent.id.length;
	var p = parent.id.slice(0, fpos - sl);
	var fk = parent.id.slice(fpos + 4, epos - sl);
	params.filterVals[p][fk][i] = parseFloat(value);

	//reset the filter limits if there is a text entry
	if (reset){
		var check = []
		check.push(params.filterLims[p][fk][0]);
		check.push(params.filterLims[p][fk][1]);
		check[i] = parseFloat(value);
		var fmin = parseFloat(check[0]);
		var fmax = parseFloat(check[1]);
		var max = parseFloat(parent.noUiSlider.options.range.max[0]);
		var min = parseFloat(parent.noUiSlider.options.range.min[0]);

		var nf = parseFloat(value)/ (Math.round(1000.*params.filterLims[p][fk][i])/1000.);
		params.SliderFinputs[p][fk][i].value = value;
		params.filterLims[p][fk][i] = parseFloat(value);
		if (Math.abs(1. - nf) > 0.001 && ! params.reset){
			drawScene(pDraw = [p]);
		}

		if (i == 0){
			parent.noUiSlider.updateOptions({
				range: {
					'min': [parseFloat(value)],
					'max': [max]
				}
			});
		}
		if (i == 1){
			parent.noUiSlider.updateOptions({
				range: {
					'min': [min],
					'max': [parseFloat(value)]
				}
			});
		}
	}

	var r = parent.noUiSlider.get()
	r[i] = value;
	parent.noUiSlider.set(r);



	//because we are now redrawing each time, we do not need to do this
	params.updateFilter[p] = true;
	mouseDown = false; 
}

// Listen to keydown events on the input field.
function handleFSliderText(input, handle) 
{
	// input.addEventListener('change', function(){
	// 	setFSliderHandle(handle, this.value, this.parent);
	// });
	input.addEventListener('keydown', function( e ) {
		var values = input.parent.noUiSlider.get();
		var value = Number(values[handle]);
		// [[handle0_down, handle0_up], [handle1_down, handle1_up]]
		var steps = input.parent.noUiSlider.options.steps;
		// [down, up]
		var step = steps[handle];
		var position;
		// 13 is enter,
		// 38 is key up,
		// 40 is key down.
		switch ( e.which ) {
			case 13:
				setFSliderHandle(handle, this.value, input.parent, reset=true);
				break;
			case 38:
				// Get step to go increase slider value (up)
				// false = no step is set
				position = step[1];
				if ( position === false ) {
					position = 1;
				}
				// null = edge of slider
				if ( position !== null ) {
					setFSliderHandle(handle, value + position, input.parent, reset=false);
				}
				break;
			case 40:
				position = step[0];
				if ( position === false ) {
					position = 1;
				}
				if ( position !== null ) {
					setFSliderHandle(handle, value - position, input.parent, reset=false);
				}
				break;
		}
	});
};

function createFilterSliders(){

	var i = 0;
	var j = 0;
	for (i=0; i<params.partsKeys.length; i++){
		p = params.partsKeys[i];
		if (params.parts.options.UIdropdown[p]){

			params.SliderF[p] = {};
			params.SliderFmin[p] = {};
			params.SliderFmax[p] = {};
			params.SliderFinputs[p] = {};

			for (j=0; j<params.fkeys[p].length; j++){
				var fk = params.fkeys[p][j]
				params.SliderF[p][fk] = document.getElementById(p+'_FK_'+fk+'_END_FilterSlider');
				params.SliderFmin[p][fk] = document.getElementById(p+'_FK_'+fk+'_END_FilterMinT');
				params.SliderFmax[p][fk] = document.getElementById(p+'_FK_'+fk+'_END_FilterMaxT');
				if (params.SliderF[p][fk] != null && params.SliderFmin[p][fk] != null && params.SliderFmax[p][fk] != null && params.filterLims[p][fk] != null){
					if (params.SliderF[p][fk].noUiSlider) {
						params.SliderF[p][fk].noUiSlider.destroy();
					}
					params.SliderFinputs[p][fk] = [params.SliderFmin[p][fk], params.SliderFmax[p][fk]];
					params.SliderFinputs[p][fk][0].parent = params.SliderF[p][fk];
					params.SliderFinputs[p][fk][1].parent = params.SliderF[p][fk];
					min = parseFloat(params.filterLims[p][fk][0]);
					max = parseFloat(params.filterLims[p][fk][1]);

					noUiSlider.create(params.SliderF[p][fk], {
						start: [min, max],
						connect: true,
						tooltips: [false, false],
						steps: [[0.001,0.001],[0.001,0.001]],
						range: {
							'min': [min],
							'max': [max]
						},
						format: wNumb({
							decimals: 3
						})
					});
					params.SliderF[p][fk].noUiSlider.on('mouseup', mouseDown=false); 
					params.SliderF[p][fk].noUiSlider.on('update', function(values, handle) {
						var fpos = this.target.id.indexOf('_FK_');
						var epos = this.target.id.indexOf('_END_');
						var sl = this.target.id.length;
						var pp = this.target.id.slice(0, fpos - sl);
						var ffk = this.target.id.slice(fpos + 4, epos - sl);


						var nf = parseFloat(values[handle])/ (Math.round(1000.*params.filterVals[pp][ffk][handle])/1000.);
						params.SliderFinputs[pp][ffk][handle].value = values[handle];
						params.filterVals[pp][ffk][handle] = parseFloat(values[handle]);
						if (Math.abs(1. - nf) > 0.001 && ! params.reset){
							drawScene(pDraw = [pp]);
						}


						//because we are now redrawing each time, we do not need to do this
						params.updateFilter[pp] = true;
						mouseDown = true;
					});

					params.SliderFinputs[p][fk].forEach(handleFSliderText);
				}
				var w = parseInt(d3.select('.FilterClass').style("width").slice(0,-2));
				d3.select('#'+p+'_FK_'+fk+'_END_FilterSlider').select('.noUi-base').style('width',w-10+"px");
				d3.select('#'+p+'_FK_'+fk+'_END_FilterSlider').select('.noUi-connect').style('border-radius','6px 0px 0px 6px');
				d3.select('#'+p+'_FK_'+fk+'_END_FilterSlider').select('.noUi-handle-lower').style('border-radius','6px 0px 0px 6px');

			}
		}
	}
}

/////////////////////////////////////////////
// N sliders
function setNSliderHandle(i, value, parent) {
	var r = [null];
	r[i] = value;
	parent.noUiSlider.set(value);
	var p = parent.id.slice(0, -8);
	params.plotNmax[p] = value;
	mouseDown = false; 
}

// Listen to keydown events on the input field.
// can I just use the same functions as for the filters?
function handleNSliderText(input, handle) 
{
	// input.addEventListener('change', function(){
	// 	setNSliderHandle(handle, this.value, this.parent);
	// });
	input.addEventListener('keydown', function( e ) {
		var value = Number(input.parent.noUiSlider.get());
		var steps = input.parent.noUiSlider.options.steps;
		var step = steps[handle];
		switch ( e.which ) {
			case 13:
				setNSliderHandle(handle, this.value, input.parent);
				break;
			case 38:
				setNSliderHandle(handle, value + step, input.parent);
				break;
			case 40:
				setNSliderHandle(handle, value - step, input.parent);
				break;
		}
	});
};

function createNsliders(){

	var i = 0;
	var j = 0;
	for (i=0; i<params.partsKeys.length; i++){

		p = params.partsKeys[i];

		if (params.parts.options.UIdropdown[p]){

			params.SliderN[p] = document.getElementById(p+'_NSlider');
			params.SliderNmax[p] = document.getElementById(p+'_NMaxT');
			if (params.SliderN[p] != null && params.SliderNmax[p] != null){
				params.SliderNInputs[p] = [params.SliderNmax[p]];
				params.SliderNInputs[p][0].parent = params.SliderN[p];
				min = 0;
				max = params.plotNmax[p]
				noUiSlider.create(params.SliderN[p], {
					start: [max],
					connect: [true, false],
					tooltips: [false],
					steps: [1],
					range: {
						'min': [min],
						'max': [max]
					},
					format: wNumb({
						decimals: 0
					})
				});
				params.SliderN[p].noUiSlider.on('mouseup', mouseDown=false); 
				params.SliderN[p].noUiSlider.on('update', function(values, handle) {



					var pp = this.target.id.slice(0, -8);
					params.SliderNInputs[pp][handle].value = values[handle];

					var nf = parseFloat(values[handle])/params.plotNmax[pp];
					params.plotNmax[pp] = parseInt(values[handle]);
					if (nf != 1 && ! params.reset){
						drawScene(pDraw = [pp]);

					}
					mouseDown = true;
				});

				params.SliderNInputs[p].forEach(handleNSliderText);
			}
			w = parseInt(d3.select('#'+p+'_NSlider').style('width').slice(0,-2));
			d3.select('#'+p+'_NSlider').select('.noUi-base').style('width',w-10+"px");
		}
	}
}

/////////////////////////////////////////////
// Psize sliders
function setPSliderHandle(i, value, parent) {
	var max = parent.noUiSlider.options.range.max[0];
	if (value > max){
		parent.noUiSlider.updateOptions({
			range: {
				'min': [0],
				'max': [parseFloat(value)]
			}
		});
	}
	var r = [null];
	r[i] = value;
	parent.noUiSlider.set(value);
	var p = parent.id.slice(0, -8);
	params.PsizeMult[p] = value;
	mouseDown = false; 

}

// Listen to keydown events on the input field.
// can I just use the same functions as for the filters?
function handlePSliderText(input, handle) 
{
	// input.addEventListener('change', function(){
	// 	setPSliderHandle(handle, this.value, this.parent);
	// });
	input.addEventListener('keydown', function( e ) {
		var value = Number(input.parent.noUiSlider.get());
		var steps = input.parent.noUiSlider.options.steps;
		var step = steps[handle];
		//var max = max = document.getElementById(pID+"PRange").max;

		switch ( e.which ) {
			case 13:
				setPSliderHandle(handle, this.value, input.parent);
				break;
			case 38:
				setPSliderHandle(handle, value + step, input.parent);
				break;
			case 40:
				setPSliderHandle(handle, value - step, input.parent);
				break;
		}
	});
};

//need to allow this to update at large numbers
function createPsliders(){



	var i = 0;
	var j = 0;
	for (i=0; i<params.partsKeys.length; i++){
		p = params.partsKeys[i];

		params.SliderP[p] = document.getElementById(p+'_PSlider');
		params.SliderPmax[p] = document.getElementById(p+'_PMaxT');
		if (params.SliderP[p] != null && params.SliderPmax[p] != null){

			if (params.SliderP[p].noUiSlider) {
				params.SliderP[p].noUiSlider.destroy();
			}

			params.SliderPInputs[p] = [params.SliderPmax[p]];
			params.SliderPInputs[p][0].parent = params.SliderP[p];
			min = 0.;
			max = params.PsizeMult[p];

			noUiSlider.create(params.SliderP[p], {
				start: [params.PsizeMult[p]],
				connect: [true, false],
				tooltips: false,
				steps: [0.0001],
				range: {
					'min': [min],
					'max': [max]
				},
				format: wNumb({
					decimals: 4
				})
			});

			params.SliderP[p].noUiSlider.on('mouseup', mouseDown=false); 
			params.SliderP[p].noUiSlider.on('update', function(values, handle) {
				var pp = this.target.id.slice(0, -8);
				params.SliderPInputs[pp][handle].value = values[handle];
				params.PsizeMult[pp] = parseFloat(values[handle]);
				mouseDown = true;

			});

			params.SliderPInputs[p].forEach(handlePSliderText);
		}
		w = parseInt(d3.select('#'+p+'_PSlider').style('width').slice(0,-2));
		d3.select('#'+p+'_PSlider').select('.noUi-base').style('width',w-10+"px");
	}
}

/////////////////////////////////////////////
// Decimation slider
function setDSliderHandle(i, value, parent) {
	value = Math.max(1, parseFloat(value));

	var max = parseFloat(parent.noUiSlider.options.range.max[i]);
	if (value > max){
		parent.noUiSlider.updateOptions({
			range: {
				'min': [1],
				'max': [parseFloat(value)]
			}
		});
	}

	var r = [null];
	r[i] = value;
	parent.noUiSlider.set(value);
	params.decimate = value;
	mouseDown = false; 

}

// Listen to keydown events on the input field.
// can I just use the same functions as for the filters?
function handleDSliderText(input, handle) 
{
	// input.addEventListener('change', function(){
	// 	setDSliderHandle(handle, this.value, this.parent);
	// });
	input.addEventListener('keydown', function( e ) {
		var value = Number(input.parent.noUiSlider.get());
		var steps = input.parent.noUiSlider.options.steps;
		var step = steps[handle];
		//var max = max = document.getElementById(pID+"PRange").max;

		switch ( e.which ) {
			case 13:
				setDSliderHandle(handle, this.value, input.parent);
				break;
			case 38:
				setDSliderHandle(handle, value + step, input.parent);
				break;
			case 40:
				setDSliderHandle(handle, value - step, input.parent);
				break;
		}
	});
};

//need to allow this to update at large numbers
function createDslider(){

	params.SliderD = document.getElementById('DSlider');
	params.SliderDmax = document.getElementById('DMaxT');
	if (params.SliderD != null && params.SliderDmax != null){
		if (params.SliderD.noUiSlider) {
			params.SliderD.noUiSlider.destroy();
		}
		params.SliderDInputs = [params.SliderDmax];
		params.SliderDInputs[0].parent = params.SliderD;
		min = 1.;
		max = 100.;

		noUiSlider.create(params.SliderD, {
			start: [params.decimate],
			connect: [true, false],
			tooltips: false,
			steps: [1],
			range: {
				'min': [min],
				'max': [max]
			},
			format: wNumb({
			decimals: 0
			})
		});

		params.SliderD.noUiSlider.on('mouseup', mouseDown=false); 
		params.SliderD.noUiSlider.on('update', function(values, handle) {

			params.SliderDInputs[handle].value = values[handle];

			var decf = params.decimate/parseFloat(values[handle]);
			if (decf != 1){
				params.decimate = parseFloat(values[handle]);
				//drawScene();
			}

			for (i=0; i<params.partsKeys.length; i++){
				var p = params.partsKeys[i];
				var max = Math.round(params.parts[p].Coordinates.length);
				if (params.parts.options.UIdropdown[p]){
					var val = parseFloat(params.SliderN[p].noUiSlider.get());

					params.SliderN[p].noUiSlider.updateOptions({
						range: {
							'min': [0],
							'max': [Math.round(max/parseFloat(values[handle]))]
						}
					});
					params.SliderN[p].noUiSlider.set(Math.min(max, val*decf));

				}

			}


			mouseDown = true;

		});

		params.SliderDInputs.forEach(handleDSliderText);
	}
	w = parseInt(d3.select("#DSlider").style("width").slice(0,-2));
	d3.select("#DSlider").select('.noUi-base').style('width',w-10+"px");
}


/////////////////////////////////////////////
// Friction slider
function setCFSliderHandle(i, value, parent) {
	value = Math.min(Math.max(0., parseFloat(value)),1.);

	parent.noUiSlider.set(value);
	if (params.useTrackball){
		params.controls.dynamicDampingFactor = value;
	} else {
		params.controls.movementSpeed = 1. - Math.pow(value, params.flyffac);

	}
	params.friction = value;
	mouseDown = false; 

}

// Listen to keydown events on the input field.
function handleCFSliderText(input, handle) 
{
	// input.addEventListener('change', function(){
	// 	setCFSliderHandle(handle, this.value, this.parent);
	// });
	input.addEventListener('keydown', function( e ) {
		var value = Number(input.parent.noUiSlider.get());
		var steps = input.parent.noUiSlider.options.steps;
		var step = steps[handle];
		//var max = max = document.getElementById(pID+"PRange").max;

		switch ( e.which ) {
			case 13:
				setCFSliderHandle(handle, this.value, input.parent);
				break;
			case 38:
				setCFSliderHandle(handle, value + step, input.parent);
				break;
			case 40:
				setCFSliderHandle(handle, value - step, input.parent);
				break;
		}
	});
};

function createCFslider(){

	params.SliderCF = document.getElementById('CFSlider');
	params.SliderCFmax = document.getElementById('CFMaxT');
	if (params.SliderCF != null && params.SliderCFmax != null){
		if (params.SliderCF.noUiSlider) {
			params.SliderCF.noUiSlider.destroy();
		}
		params.SliderCFInputs = [params.SliderCFmax];
		params.SliderCFInputs[0].parent = params.SliderCF;
		min = 0.;
		max = 1.;

		noUiSlider.create(params.SliderCF, {
			start: [params.friction],
			connect: [true, false],
			tooltips: false,
			steps: [0.01],
			range: {
				'min': [min],
				'max': [max]
			},
			format: wNumb({
				decimals: 2
			})
		});

		params.SliderCF.noUiSlider.on('mouseup', mouseDown=false); 
		params.SliderCF.noUiSlider.on('update', function(values, handle) {
			params.SliderCFInputs[handle].value = values[handle];
			var value = Math.min(Math.max(0., parseFloat(values[handle])),1.);
			if (params.useTrackball){
				params.controls.dynamicDampingFactor = value;
			} else {
				params.controls.movementSpeed = 1. - Math.pow(value, params.flyffac);
			}
			params.friction = value;
			mouseDown = true;
		});

		params.SliderCFInputs.forEach(handleCFSliderText);
	}
	w = parseInt(d3.select("#CFSlider").style("width").slice(0,-2));
	d3.select("#CFSlider").select('.noUi-base').style('width',w-10+"px");
}



/////////////////////////////////////////////
// Stereo Separation slider
function checkStereoLock(box)
{
	if (box.checked) {
		params.normalRenderer = params.renderer;
		params.renderer = params.effect;
		params.useStereo = true;
	} else {
		params.renderer = params.normalRenderer;
		params.renderer.setSize(window.innerWidth, window.innerHeight);
		params.useStereo = false;
	}
}
function setSSSliderHandle(i, value, parent) {
	var max = parent.noUiSlider.options.range.max[i];
	if (value > max){
		params.stereoSepMax = parseFloat(value);
		parent.noUiSlider.updateOptions({
			range: {
				'min': [0],
				'max': [parseFloat(value)]
			}
		});
	}
	value = Math.min(Math.max(0., parseFloat(value)),params.stereoSepMax);

	parent.noUiSlider.set(value);
	params.effect.setEyeSeparation(value);
	params.stereoSep = value;

	mouseDown = false; 

}

// Listen to keydown events on the input field.
function handleSSSliderText(input, handle) 
{
	// input.addEventListener('change', function(){
	// 	setSSSliderHandle(handle, this.value, this.parent);
	// });
	input.addEventListener('keydown', function( e ) {
		var value = Number(input.parent.noUiSlider.get());
		var steps = input.parent.noUiSlider.options.steps;
		var step = steps[handle];
		//var max = max = document.getElementById(pID+"PRange").max;

		switch ( e.which ) {
			case 13:
				setSSSliderHandle(handle, this.value, input.parent);
				break;
			case 38:
				setSSSliderHandle(handle, value + step, input.parent);
				break;
			case 40:
				setSSSliderHandle(handle, value - step, input.parent);
				break;
		}
	});
};

function createSSslider(){

	params.sliderSS = document.getElementById('SSSlider');
	params.sliderSSmax = document.getElementById('SSMaxT');
	if (params.sliderSS != null && params.sliderSSmax != null){
		if (params.sliderSS.noUiSlider) {
			params.sliderSS.noUiSlider.destroy();
		}
		params.sliderSSInputs = [params.sliderSSmax];
		params.sliderSSInputs[0].parent = params.sliderSS;
		min = 0.;
		max = parseFloat(params.stereoSepMax);

		noUiSlider.create(params.sliderSS, {
			start: [params.stereoSep],
			connect: [true, false],
			tooltips: false,
			steps: [0.001],
			range: {
				'min': [min],
				'max': [max]
			},
			format: wNumb({
				decimals: 3
			})
		});

		params.sliderSS.noUiSlider.on('mouseup', mouseDown=false); 
		params.sliderSS.noUiSlider.on('update', function(values, handle) {

			params.sliderSSInputs[handle].value = values[handle];

			var value = Math.min(Math.max(0., parseFloat(values[handle])),params.stereoSepMax);
			params.effect.setEyeSeparation(value);
			params.stereoSep = value;
			mouseDown = true;
		});

		params.sliderSSInputs.forEach(handleSSSliderText);
	}
	w = parseInt(d3.select("#SSSlider").style("width").slice(0,-2));
	d3.select("#SSSlider").select('.noUi-base').style('width',w-10+"px");
}

function updateUICenterText()
{
	if (params.useTrackball){
		document.getElementById("CenterXText").value = params.controls.target.x;// + params.center.x;
		document.getElementById("CenterYText").value = params.controls.target.y;// + params.center.y;
		document.getElementById("CenterZText").value = params.controls.target.z;// + params.center.z;
	} else {
		xx = params.camera.getWorldDirection();
		document.getElementById("CenterXText").value = xx.x + params.camera.position.x;
		document.getElementById("CenterYText").value = xx.y + params.camera.position.y;
		document.getElementById("CenterZText").value = xx.z + params.camera.position.z;		
	}
}
function updateUICameraText()
{

	document.getElementById("CameraXText").value = params.camera.position.x;// + params.center.x;
	document.getElementById("CameraYText").value = params.camera.position.y;// + params.center.y;
	document.getElementById("CameraZText").value = params.camera.position.z;// + params.center.z;
}

function updateUIRotText()
{
	document.getElementById("RotXText").value = params.camera.rotation.x;
	document.getElementById("RotYText").value = params.camera.rotation.y;
	document.getElementById("RotZText").value = params.camera.rotation.z;

}


function checkText(input, event)
{

	var key=event.keyCode || event.which;
	if (key==13){

		if (input.id == "CenterXText"){
			params.center.x = parseFloat(input.value);
		}
		if (input.id == "CenterYText"){
			params.center.y = parseFloat(input.value);
		}
		if (input.id == "CenterZText"){
			params.center.z = parseFloat(input.value);
		}

		if (input.id == "CameraXText"){
			params.camera.position.x = parseFloat(input.value) - params.center.x;
		}
		if (input.id == "CameraYText"){
			params.camera.position.y = parseFloat(input.value) - params.center.y
		}
		if (input.id == "CameraZText"){
			params.camera.position.z = parseFloat(input.value) - params.center.z;
		}


		if (input.id == "RotXText"){
			params.camera.rotation.x = parseFloat(input.value)
		}
		if (input.id == "RotYText"){
			params.camera.rotation.y = parseFloat(input.value)
		}
		if (input.id == "RotZText"){
			params.camera.rotation.z = parseFloat(input.value)
		}
		if (input.id == "RenderXText"){
			params.renderWidth = parseInt(input.value);
		}
		if (input.id == "RenderYText"){
			params.renderHeight = parseInt(input.value);
		}
	}

}

//function to check which types to plot
function checkshowParts(checkbox)
{
	var type = checkbox.id.slice(-5); 
	if (type == 'Check'){	
		var pID = checkbox.id.slice(0,-5); // remove  "Check" from id
		params.showParts[pID] = false;
		if (checkbox.checked){
			params.showParts[pID] = true;
		}
	} 
}


function hideUI(x){
	if (!params.movingUI){

		x.classList.toggle("change");

		var UI = document.getElementById("UIhider");
		var UIc = document.getElementsByClassName("UIcontainer")[0];
		if (params.UIhidden){
			UI.style.display = 'inline';
			//UI.style.visibility = 'visible';
			UIc.style.borderStyle = 'solid';
			UIc.style.marginLeft = '0';
			UIc.style.marginTop = '0';
			params.UIhidden = false;
		} else {
			UI.style.display = 'none';
			//UI.style.visibility = 'hidden';
			UIc.style.borderStyle = 'none';
			UIc.style.marginLeft = '2px';
			UIc.style.marginTop = '2px';
			params.UIhidden = true;	
		}
		var UIt = document.getElementById("UItopbar");
		//UIt.style.display = 'inline';
	}
}



function getPi(pID){
	var i=0;
	for (i=0; i<params.partsKeys.length; i++){
		if (pID == params.partsKeys[i]){
			break;
		}
	}
	return i
}

function showFunction(handle) {
	var offset = 5;

//find the position in the partsKeys list
	var pID = handle.id.slice(0,-7); // remove  "Dropbtn" from id
	i = getPi(pID);
	document.getElementById(pID+"Dropdown").classList.toggle("show");

	var pdiv;
	var ddiv = document.getElementById(pID+'Dropdown');
	var ht = parseFloat(ddiv.style.height.slice(0,-2)) + offset; //to take of "px"
	var pb = 0.;

	if (i < params.partsKeys.length-1){
		pdiv = document.getElementsByClassName(params.partsKeys[i+1]+'Div')[0];
		if (params.gtoggle[pID]){
			pdiv.style.marginTop = ht + "px";
			params.gtoggle[pID] = false;	
		} else {
			pdiv.style.marginTop = "0px";
			params.gtoggle[pID] = true;
		}
	} else { // a bit clunky, but works with the current setup
		if (pID == "Camera"){
			c = document.getElementById("decimationDiv");
			pb = 5;
			if (params.gtoggle[pID]){
				c.style.marginTop = (pb+ht-5)+'px';
				params.gtoggle[pID] = false;	

			} else {
				c.style.marginTop = pb+'px';	
				params.gtoggle[pID] = true;	
			}	
		} else { //for the last particle (to move the bottom of the container)
			c = document.getElementsByClassName("UIcontainer")[0];

			if (params.gtoggle[pID]){
				c.style.paddingBottom = (pb+ht-5)+'px';
				params.gtoggle[pID] = false;	

			} else {
				c.style.paddingBottom = pb+'px';	
				params.gtoggle[pID] = true;		
			}
		}
	}
}

function selectFilter() {
	var option = d3.select(this)
		.selectAll("option")
		.filter(function (d, i) { 
			return this.selected; 
	});
	selectValue = option.property('value');

	var p = this.id.slice(0,-13)

	//console.log("in selectFilter", selectValue, this.id, p)
	for (var i=0; i<params.fkeys[p].length; i+=1){
		//console.log('hiding','#'+p+'_FK_'+params.fkeys[p][i]+'_END_Filter')
		d3.selectAll('#'+p+'_FK_'+params.fkeys[p][i]+'_END_Filter')
			.style('display','none');
	}
	//console.log('showing', '#'+p+'_FK_'+selectValue+'_END_Filter')
	d3.selectAll('#'+p+'_FK_'+selectValue+'_END_Filter')
		.style('display','inline');


};

function selectVelType() {
	var option = d3.select(this)
		.selectAll("option")
		.filter(function (d, i) { 
			return this.selected; 
	});
	selectValue = option.property('value');

	var p = this.id.slice(0,-14)
	params.velType[p] = selectValue;
};


function createUI(){
	console.log("Creating UI");



//change the hamburger to the X to start
	if (! params.reset){

		var UIcontainer = d3.select('.UIcontainer');

		UIcontainer.attr('style','position:absolute; top:10px; left:10px; width:300px');

		var UIt = UIcontainer.append('div')
			.attr('class','UItopbar')
			.attr('id','UItopbar')
			.attr('onmouseup','hideUI(this);')
			.attr('onmousedown','dragElement(this, event);');

		UIt.append('table');
		var UIr1 = UIt.append('tr');
		var UIc1 = UIr1.append('td')
			.style('padding-left','5px')
			.attr('id','Hamburger')
		UIc1.append('div').attr('class','bar1');
		UIc1.append('div').attr('class','bar2');
		UIc1.append('div').attr('class','bar3');
		var UIc2 = UIr1.append('td').append('div')
			.attr('id','ControlsText')
			.style('font-size','16pt')
			.style('padding-left','5px')
			.style('top','6px')
			.style('position','absolute')
			.append('b').text('Controls');

		var hider = UIcontainer.append('div').attr('id','UIhider');
		hider.append('div').attr('id','particleUI');

		var hamburger = document.getElementById('UItopbar');
		//hide the UI
		hideUI(hamburger);
		hamburger.classList.toggle("change");

	 }

	console.log(params.partsKeys)

	d3.select('body').append('input')
		.attr('type','file')
		.attr('id','presetFile')
		.on('change', function(e){
			file = this.files[0];
			if (file != null){
				readPreset(file);
			}})
		.style('display','None');


	var UI = d3.select('#particleUI')
	var UIparts = UI.selectAll('div');


	//fullscreen button
	UI.append('div').attr('id','fullScreenDiv')
		.append('button')
		.attr('id','fullScreenButton')
		.attr('class','button')
		.attr('onclick','fullscreen();')
		.append('span')
			.text('Fullscreen');

	//snapshots
	var snap = UI.append('div')
		.attr('id','snapshotDiv')
		.attr('class', 'button-div');
	snap.append('button')
		.attr('class','button')
		.attr('onclick','renderImage();')
		.style('width','150px')
		.style('padding','5px')
		.style('margin',0)
		.append('span')
			.text('Take Snapshot');
	snap.append('input')
		.attr('id','RenderXText')
		.attr('type', 'text')
		.attr('value', '1920')
		.attr('autocomplete','off')
		.attr('onkeypress','checkText(this, event)')
		.attr('class','pTextInput')
		.style('width','50px')
		.style('margin-top','5px')
		.style('margin-right','5px')
	snap.append('input')
		.attr('id','RenderYText')
		.attr('type', 'text')
		.attr('value', '1200')
		.attr('autocomplete','off')
		.attr('onkeypress','checkText(this, event)')
		.attr('class','pTextInput')
		.style('width','50px')
		.style('margin-top','5px');

	//save preset button
	UI.append('div').attr('id','savePresetDiv')
		.append('button')
		.attr('id','savePresetButton')
		.attr('class','button')
		.attr('onclick','savePreset();')
		.append('span')
			.text('Save Preset');

	//reset to default button
	UI.append('div').attr('id','resetDiv')
		.append('button')
		.attr('id','resetButton')
		.attr('class','button')
		.style('width','142px')
		.attr('onclick','resetToOptions();')
		.append('span')
			.text('Reset to Default');
	//reset to preset button
	d3.select('#resetDiv')
		.append('button')
		.attr('id','resetPButton')
		.attr('class','button')
		.style('width','143px')
		.style('left','147px')
		.style('margin-left','0px')
		.attr('onclick','loadPreset();')
		.append('span')
			.text('Reset to Preset');

	//load new data button
	UI.append('div').attr('id','loadNewDataDiv')
		.append('button')
		.attr('id','loadNewDataButton')
		.attr('class','button')
		.attr('onclick','loadNewData();')
		.append('span')
			.text('Load New Data');

	//camera
	params.gtoggle.Camera = true;
	var c1 = UI.append('div')
		.attr('id','cameraControlsDiv')
		.attr('class','particleDiv');
	c1.append('div')
		.attr('class','pLabelDiv')
		.style('width', '215px')
		.text('Camera Controls')
	c1.append('button')
		.attr('class','dropbtn')
		.attr('id','CameraDropbtn')
		.attr('onclick','showFunction(this);')
		.html('&#x25BC');
	var c2 = c1.append('div')
		.attr('class','dropdown-content')
		.attr('id','CameraDropdown')
		.style('height','190px');
	//center text boxes
	var c3 = c2.append('div')
		.attr('class','pLabelDiv')
		.style('width','280px')
		.style('margin-top','5px') 
	c3.append('div')
		.style('width','60px')
		.style('display','inline-block')
		.text('Center');
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','CenterXText')
		.attr('value','1')
		.attr('autocomplete','off')
		.attr('onkeypress','checkText(this, event);')
		.style('width','40px')
		.style('margin-right','8px');
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','CenterYText')
		.attr('value','1')
		.attr('autocomplete','off')
		.attr('onkeypress','checkText(this, event);')
		.style('width','40px')
		.style('margin-right','8px');
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','CenterZText')
		.attr('value','1')
		.attr('autocomplete','off')
		.attr('onkeypress','checkText(this, event);')
		.style('width','40px')
	//center lock checkbox
	var c4 = c3.append('span')
		.attr('id','CenterCheckDiv')
		.style('width','45px')
		.style('margin',0)
		.style('margin-left','10px')
		.style('padding',0);
	c4.append('input')
		.attr('id','CenterCheckBox')
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.attr('onchange','checkCenterLock(this);');
	if (params.useTrackball){
		elm = document.getElementById("CenterCheckBox");
		elm.value = true
		elm.checked = true;
	} else {
		elm = document.getElementById("CenterCheckBox");
		elm.value = false
		elm.checked = false;
	}
	c4.append('label')
		.attr('for','CenterCheckBox')
		.attr('id','CenterCheckLabel')
		.style('font-size','10pt')
		.text('Lock');
	//camera text boxes
	c3 = c2.append('div')
		.attr('class','pLabelDiv')
		.style('width','280px')
		.style('margin-top','5px') 
	c3.append('div')
		.style('width','60px')
		.style('display','inline-block')
		.text('Camera');
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','CameraXText')
		.attr('value','1')
		.attr('autocomplete','off')
		.attr('onkeypress','checkText(this, event);')
		.style('width','40px')
		.style('margin-right','8px');
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','CameraYText')
		.attr('value','1')
		.attr('autocomplete','off')
		.attr('onkeypress','checkText(this, event);')
		.style('width','40px')
		.style('margin-right','8px');
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','CameraZText')
		.attr('value','1')
		.attr('autocomplete','off')
		.attr('onkeypress','checkText(this, event);')
		.style('width','40px');
	//rotation text boxes
	c3 = c2.append('div')
		.attr('class','pLabelDiv')
		.style('width','280px')
		.style('margin-top','5px') 
	c3.append('div')
		.style('width','60px')
		.style('display','inline-block')
		.text('Rotation');
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','RotXText')
		.attr('value','1')
		.attr('autocomplete','off')
		.attr('onkeypress','checkText(this, event);')
		.style('width','40px')
		.style('margin-right','8px');
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','RotYText')
		.attr('value','1')
		.attr('autocomplete','off')
		.attr('onkeypress','checkText(this, event);')
		.style('width','40px')
		.style('margin-right','8px');
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','RotZText')
		.attr('value','1')
		.attr('autocomplete','off')
		.attr('onkeypress','checkText(this, event);')
		.style('width','40px');
	//buttons
	c3 = c2.append('div')
		.attr('class','pLabelDiv')
		.style('width','280px');
	c3.append('button')
		.attr('id','CameraSave')
		.attr('class','button centerButton')
		.attr('onclick','saveCamera();')
		.style('margin',0)
		.style('margin-right','8px')
		.style('padding','2px')
		.append('span')
			.text('Save');
	c3.append('button')
		.attr('id','CameraReset')
		.attr('class','button centerButton')
		.attr('onclick','resetCamera();')
		.style('margin',0)
		.style('margin-right','8px')
		.style('padding','2px')
		.append('span')
			.text('Reset');
		c3.append('button')
		.attr('id','CameraRecenter')
		.attr('class','button centerButton')
		.attr('onclick','recenterCamera();')
		.style('margin',0)
		.style('padding','2px')
		.append('span')
			.text('Recenter');
	//camera friction
	c3 = c2.append('div')
		.attr('class','pLabelDiv')
		.attr('id','FrictionDiv')
		.style('background-color','#808080')
		.style('width','280px')
		.style('padding-top','10px');
	c3.append('div')
		.style('width','55px')
		.style('display','inline-block')
		.text('Friction');
	c3.append('div')
		.attr('class','NSliderClass')
		.attr('id','CFSlider')
		.style('margin-left','10px')
		.style('width','170px');
	c3.append('input')
		.attr('class','NMaxTClass')
		.attr('id','CFMaxT')
		.attr('type','text')
		.style('margin-top','-4px');
	//camera stereo separation
	c3 = c2.append('div')
		.attr('class','pLabelDiv')
		.attr('id','StereoSepDiv')
		.style('background-color','#808080')
		.style('width','280px')
		.style('padding-top','10px');
	c3.append('div')
		.style('width','55px')
		.style('display','inline-block')
		.text('Stereo');
	c3.append('input')
		.attr('id','StereoCheckBox')
		.attr('type','checkbox')
		.attr('onchange','checkStereoLock(this);')
		.attr('autocomplete','false');
	if (params.useStereo){
		elm = document.getElementById("StereoCheckBox");
		elm.value = true
		elm.checked = true;
	} else {
		elm = document.getElementById("StereoCheckBox");
		elm.value = false
		elm.checked = false;
	}
	c3.append('div')
		.attr('class','NSliderClass')
		.attr('id','SSSlider')
		.style('margin-left','40px')
		.style('width','140px');
	c3.append('input')
		.attr('class','NMaxTClass')
		.attr('id','SSMaxT')
		.attr('type','text')
		.style('margin-top','-4px');

	//decimation
	var dec = UI.append('div')
		.attr('class','particleDiv')
		.attr('id', 'decimationDiv');
	dec.append('div')
		.attr('class','pLabelDiv')
		.style('width','85px')
		.text('Decimation');
	dec.append('div')
		.attr('class','PSliderClass')
		.attr('id','DSlider')
		.style('margin-top','-22px')
		.style('width','145px');
	dec.append('input')
		.attr('class','PMaxTClass')
		.attr('id','DMaxT')
		.attr('type','text')
		.style('left','245px')
		.style('width','40px');


	//setup for all the particle UI bits 
	UIparts.data(params.partsKeys).enter()
		.append('div')
		.attr('class', function (d) { return "particleDiv "+d+"Div" }) //+ dropdown


	var i=0;
	var j=0;
	for (i=0; i<params.partsKeys.length; i++){
		d = params.partsKeys[i];
		params.gtoggle[d] = true;

		var controls = d3.selectAll('div.'+d+'Div');

		controls.append('div')
			.attr('class','pLabelDiv')
			.text(function (d) { return d})
			
		var onoff = controls.append('label')
			.attr('class','switch');

		onoff.append('input')
			.attr('id',d+'Check')
			.attr('type','checkbox')
			.attr('autocomplete','off')
			.attr('checked','true')
			.attr('onchange','checkshowParts(this)');
		if (!params.showParts[d]){
			elm = document.getElementById(d+'Check');
			elm.checked = false;
			elm.value = false;
		} 
		onoff.append('span')
			.attr('class','slideroo');


		controls.append('div')
			.attr('id',d+'_PSlider')
			.attr('class','PSliderClass');

		controls.append('input')
			.attr('id',d+'_PMaxT')
			.attr('class', 'PMaxTClass')
			.attr('type','text');

		controls.append('input')
			.attr('id',d+'ColorPicker');

		if (params.parts.options.UIdropdown[d]){
			controls.append('button')
				.attr('id', d+'Dropbtn')
				.attr('class', 'dropbtn')
				.attr('onclick','showFunction(this)')
				.html('&#x25BC');

			dropdown = controls.append('div')
				.attr('id',d+'Dropdown')
				.attr('class','dropdown-content');

			dNcontent = dropdown.append('div')
				.attr('class','NdDiv');

			dNcontent.append('span')
				.attr('class','pLabelDiv')
				.attr('style','width:20px')
				.text('N');

			dNcontent.append('div')
				.attr('id',d+'_NSlider')
				.attr('class','NSliderClass');

			dNcontent.append('input')
				.attr('id',d+'_NMaxT')
				.attr('class', 'NMaxTClass')
				.attr('type','text');

			var dheight = 30;

	//for velocity vectors

			if (params.parts[d].Velocities != null){
				dropdown.append('hr')
					.style('margin','0')
					.style('border','1px solid #909090')

				dVcontent = dropdown.append('div')
					.attr('class','NdDiv');

				dVcontent.append('label')
					.attr('for',d+'velCheckBox')
					.text('Plot Velocity Vectors');

				dVcontent.append('input')
					.attr('id',d+'velCheckBox')
					.attr('value','false')
					.attr('type','checkbox')
					.attr('autocomplete','off')
					.attr('onchange','checkVelBox(this)');
				if (params.showVel[d]){
					elm = document.getElementById(d+'velCheckBox');
					elm.checked = true;
					elm.value = true;
				} 
				var selectVType = dVcontent.append('select')
					.attr('class','selectVelType')
					.attr('id',d+'_SelectVelType')
					.on('change',selectVelType)

				var options = selectVType.selectAll('option')
					.data(Object.keys(params.velopts)).enter()
					.append('option')
						.text(function (d) { return d; });
				elm = document.getElementById(d+'_SelectVelType');
				elm.value = params.velType[d];

				dheight += 30;
			}

	//this is dynamic, depending on what is in the data
	//create the filters
	//first count the available filters
			showfilts = [];
			for (j=0; j<params.fkeys[d].length; j++){
				var fk = params.fkeys[d][j]
				if (params.parts[d][fk] != null){
					showfilts.push(fk);
				}
			}
			nfilt = showfilts.length;

			if (nfilt > 0){
				dheight += 70;

				dropdown.append('hr')
					.style('margin','0')
					.style('border','1px solid #909090')

				var filterDiv = dropdown.append('div')
					.attr('style','margin:0px; padding:5px; height:40px');

				var selectF = filterDiv.append('div')
					.attr('style','height:20px')
					.html('Filters &nbsp')	

					.append('select')
					.attr('class','selectFilter')
					.attr('id',d+'_SelectFilter')
					.on('change',selectFilter)

				var options = selectF.selectAll('option')
					.data(showfilts).enter()
					.append('option')
					.text(function (d) { return d; });


				var filtn = 0;
				for (j=0; j<params.fkeys[d].length; j++){
					var fk = params.fkeys[d][j]
					if (params.parts[d][fk] != null){


						dfilters = filterDiv.append('div')
							.attr('id',d+'_FK_'+fk+'_END_Filter')
							.attr('class','FilterClass')

						dfilters.append('div')
							.attr('class','FilterClassLabel')

						dfilters.append('div')
							.attr('id',d+'_FK_'+fk+'_END_FilterSlider')
							.style("margin-top","-1px")

						dfilters.append('input')
							.attr('id',d+'_FK_'+fk+'_END_FilterMinT')
							.attr('class','FilterMinTClass')
							.attr('type','text');

						dfilters.append('input')
							.attr('id',d+'_FK_'+fk+'_END_FilterMaxT')
							.attr('class','FilterMaxTClass')
							.attr('type','text');

						filtn += 1;
					}
					if (filtn > 1){
						d3.selectAll('#'+d+'_FK_'+fk+'_END_Filter')
							.style('display','none');
					}
				}

			} 
			dropdown.style('height',dheight+'px');

		}

/* for color pickers*/
//can I write this in d3? I don't think so.  It needs a jquery object
		$("#"+d+"ColorPicker").spectrum({
			color: "rgba("+(params.Pcolors[d][0]*255)+","+(params.Pcolors[d][1]*255)+","+(params.Pcolors[d][2]*255)+","+params.Pcolors[d][3]+")",
			flat: false,
			showInput: true,
			showInitial: false,
			showAlpha: true,
			showPalette: false,
			showSelectionPalette: true,
			clickoutFiresChange: false,
			maxSelectionSize: 10,
			preferredFormat: "rgb",
			change: function(color) {
				checkColor(this, color);
			},
		});

		if (!params.parts.options.UIcolorPicker[d]){
			$("#"+d+"ColorPicker").spectrum({
				color: "rgba("+(params.Pcolors[d][0]*255)+","+(params.Pcolors[d][1]*255)+","+(params.Pcolors[d][2]*255)+","+params.Pcolors[d][3]+")",
				disabled: true,
			});		
		}

	}

// create all the noUISliders
	createPsliders();
	createNsliders();
	createDslider();
	createCFslider();
	createSSslider();
	createFilterSliders();

	updateUICenterText();
	updateUICameraText();
	updateUIRotText();

	applyUIoptions();

	params.haveUI = true;
}

function applyUIoptions(){
// now check if we need to hide any of this
	if (params.parts.options.hasOwnProperty('UI')){
		if (!params.parts.options.UI){
			d3.select('.UIcontainer').style('display','none');
		}
	}
	if (params.parts.options.hasOwnProperty('UIfullscreen')){
		if (!params.parts.options.UIfullscreen){
			d3.select('#fullScreenDiv').style('display','none');
		}
	}
	if (params.parts.options.hasOwnProperty('UIsnapshot')){
		if (!params.parts.options.UIsnapshot){
			d3.select('#snapshotDiv').style('display','none');
		}
	}
	if (params.parts.options.hasOwnProperty('UIreset')){
		if (!params.parts.options.UIreset){
			d3.select('#resetDiv').style('display','none');
		}
	}
	if (params.parts.options.hasOwnProperty('UIsavePreset')){
		if (!params.parts.options.UIsavePreset){
			d3.select('#savePresetDiv').style('display','none');
		}
	}
	if (params.parts.options.hasOwnProperty('UIloadNewData')){
		if (!params.parts.options.UIloadNewData){
			d3.select('#loadNewDataDiv').style('display','none');
		}
	}
	if (params.parts.options.hasOwnProperty('UIcameraControls')){
		if (!params.parts.options.UIcameraControls){
			d3.select('#cameraControlsDiv').style('display','none');
		}
	}
	if (params.parts.options.hasOwnProperty('UIdecimation')){
		if (!params.parts.options.UIdecimation){
			d3.select('#decimationDiv').style('display','none');
		}
	}	
	if (params.parts.options.hasOwnProperty('UIparticle')){
		for (i=0; i<params.partsKeys.length; i++){
			d = params.partsKeys[i];    	
			if (params.parts.options.UIparticle.hasOwnProperty(d)){
				if (!params.parts.options.UIparticle[d]){
					d3.selectAll('div.'+d+'Div').style('display','none');
				}
			}
		}
	}


	//particle specific options
	for (var i=0; i<params.partsKeys.length; i++){
		var p = params.partsKeys[i];

		//filter values
		if (params.parts.options.hasOwnProperty("filterVals")){
			if (params.parts.options.filterVals != null){
				if (params.parts.options.filterVals.hasOwnProperty(p)){
					if (params.parts.options.filterVals[p] != null){
						//because we are now redrawing each time, we do not need to do this
						params.updateFilter[p] = true

						for (k=0; k<params.fkeys[p].length; k++){
							var fkey = params.fkeys[p][k]
							if (params.parts.options.filterVals[p].hasOwnProperty(fkey)){
								if (params.parts.options.filterVals[p][fkey] != null){
									params.SliderF[p][fkey].noUiSlider.set(params.parts.options.filterVals[p][fkey]);
								}
							}
						}

					}
				}
			}
		}
	}
};

//hide the splash screen
function hideSplash(){
	if (params.loaded){
		params.helpMessage = 0;
		var fdur = 700.;

		var splash = d3.select("#splash");

		splash.transition()
			.ease(d3.easeLinear)
			.duration(fdur)
			.style("opacity", 0)

			.on("end", function(d){
				splash.style("display","none");
			})
	}
}

	//hide the splash screen
function showSplash(){
	if (params.loaded){
		params.helpMessage = 1;
		var fdur = 700.;

		var splash = d3.select("#splash");
		splash.style("display","block");

		splash.transition()
			.ease(d3.easeLinear)
			.duration(fdur)
			.style("opacity", 0.8);
		}

}


function saveFile(strData, filename) {
	var link = document.createElement('a');
	if (typeof link.download === 'string') {
		document.body.appendChild(link); //Firefox requires the link to be in the body
		link.download = filename;
		link.href = strData;
		link.click();
		document.body.removeChild(link); //remove the link when done
	} else {
		console.log("can't save file");
		return;
		//location.replace(uri);
	}

}

function renderImage() {  
//https://stackoverflow.com/questions/26193702/three-js-how-can-i-make-a-2d-snapshot-of-a-scene-as-a-jpg-image   
//this sometimes breaks in Chrome when rendering takes too long
//best to use Firefox to render images  
	var imgData, imgNode;
	var strDownloadMime = "image/octet-stream";
	var strMime = "image/png";
	var screenWidth = window.innerWidth;
	var screenHeight = window.innerHeight;
	var aspect = screenWidth / screenHeight;




	try {
		//resize
		params.renderer.setSize(params.renderWidth, params.renderHeight);
		params.camera.aspect = params.renderWidth / params.renderHeight;
		params.camera.updateProjectionMatrix();
		params.renderer.render( params.scene, params.camera );

		//save image
		imgData = params.renderer.domElement.toDataURL(strMime);

		saveFile(imgData.replace(strMime, strDownloadMime), "image.png");


		//back to original size
		params.renderer.setSize(screenWidth, screenHeight);
		params.camera.aspect = aspect;
		params.camera.updateProjectionMatrix();
		params.renderer.render( params.scene, params.camera );

	} catch (e) {
		console.log(e);
		return;
	}


}

function savePreset()
{
	var preset = {};
	if (params.useTrackball){
		preset.center = [params.controls.target.x, params.controls.target.y, params.controls.target.z];
	} else {
		xx = params.camera.getWorldDirection();
		preset.center = [xx.x + params.camera.position.x, xx.y + params.camera.position.y, xx.z + params.camera.position.z];
	}
	preset.camera = [params.camera.position.x, params.camera.position.y, params.camera.position.z];
	preset.startFly = !params.useTrackball;
	if (params.parts.options.hasOwnProperty('cameraRotation')){
		if (params.parts.options.cameraRotation != null){
			preset.cameraRotation = [params.camera.rotation.x, params.camera.rotation.y, params.camera.rotation.z];
		}
	}
	preset.friction = params.friction;
	preset.stereo = params.useStereo;
	preset.stereoSep = params.stereoSep;
	preset.decimate = params.decimate;
	preset.maxVrange = params.maxVrange;

	//for the UI
	preset.UI = params.parts.options.UI;
	preset.UIfullscreen = params.parts.options.UIfullscreen;
	preset.UIsnapshot = params.parts.options.UIsnapshot;
	preset.UIreset = params.parts.options.UIreset;
	preset.UIsavePreset = params.parts.options.UIsavePreset;
	preset.UIloadNewData = params.parts.options.UIloadNewData;
	preset.UIcameraControls = params.parts.options.UIcameraControls;
	preset.UIdecimation = params.parts.options.UIdecimation;


	//particle specific options
	preset.showParts = {};
	preset.sizeMult = {};
	preset.color = {};
	preset.plotNmax = {};
	preset.showVel = {};
	preset.velType = {};
	preset.filterLims = {};
	preset.filterVals = {};
	preset.UIparticle = {};
	preset.UIdropdown = {};
	preset.UIcolorPicker = {};
	for (var i=0; i<params.partsKeys.length; i++){
		var p = params.partsKeys[i];

		preset.showParts[p] = params.showParts[p];
		preset.sizeMult[p] = params.PsizeMult[p];
		preset.color[p] = params.Pcolors[p];
		preset.plotNmax[p] = params.plotNmax[p];
		preset.showVel[p] = params.showVel[p];
		preset.velType[p] = params.velType[p];

		preset.UIparticle[p] = params.parts.options.UIparticle[p];
		preset.UIdropdown[p] = params.parts.options.UIdropdown[p];
		preset.UIcolorPicker[p] = params.parts.options.UIcolorPicker[p];
		preset.filterLims[p] = {}
		preset.filterVals[p] = {}
		for (k=0; k<params.fkeys[p].length; k++){
			var fkey = params.fkeys[p][k]
			preset.filterLims[p][fkey] = params.filterLims[p][fkey];
			preset.filterVals[p][fkey] = params.filterVals[p][fkey];
		}
	}

	preset.loaded = true;

	//https://stackoverflow.com/questions/33780271/export-a-json-object-to-a-text-file
	var str = JSON.stringify(preset)
	//Save the file contents as a DataURI
	var dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(str);

	saveFile(dataUri,'preset.json');

}

//from https://www.w3schools.com/howto/howto_js_draggable.asp
function dragElement(elm, e) {
	var elmnt = document.getElementsByClassName("UIcontainer")[0];
	var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
	dragMouseDown(e);


	function dragMouseDown(e) {
		e = e || window.event;
		// get the mouse cursor position at startup:
		pos3 = e.clientX;
		pos4 = e.clientY;
		document.addEventListener('mouseup', closeDragElement);
		document.addEventListener('mousemove', elementDrag);

	}

	function elementDrag(e) {
		params.movingUI = true;
		e = e || window.event;
		// calculate the new cursor position:
		pos1 = pos3 - e.clientX;
		pos2 = pos4 - e.clientY;
		pos3 = e.clientX;
		pos4 = e.clientY;

		// set the element's new position:
		var top = parseInt(elmnt.style.top);
		var left = parseInt(elmnt.style.left);
		elmnt.style.top = (top - pos2) + "px";
		elmnt.style.left = (left - pos1) + "px";
	}

	function closeDragElement(e) {
		/* stop moving when mouse button is released:*/
		e.stopPropagation();
		params.movingUI = false;
		document.removeEventListener('mouseup', closeDragElement);
		document.removeEventListener('mousemove', elementDrag);

	}
}


