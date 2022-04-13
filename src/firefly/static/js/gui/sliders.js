/////////////////////////////////////////////
/////////////Generic  slider functions
/////////////////////////////////////////////

// write a wrapper function that the viewer can call
function updateSliderHandles(args){
    i = args[0]
    value = args[1]
    key = args[2]
    resetEnd = args[3]
    type = args[4]
    
    var this_parent = document.getElementById(key)

    setSliderHandle(i,value,this_parent,null,resetEnd,type);
}

//Maybe there's a way to get rid of all these if statements? (in this and the following function)
function setSliderHandle(i, value, parent, varArgs, resetEnd, type, varVals=null, varLims=null) {
	//resetEnd : 0=don't reset; 1=reset if value > max; 2=reset always
    //console.log(i, value, parent, varArgs, resetEnd, type)

	//reset the slider limits
	var min = parent.noUiSlider.options.range.min[0];
	var max = parent.noUiSlider.options.range.max[0];
	if (typeof parseFloat(min) === "number" && typeof parseFloat(max) === "number" && !isNaN(min) && !isNaN(max)){
		var minReset = min;
		var maxReset = max;
		if ((i == 0 && type == "double") && resetEnd[0] == 2 || (resetEnd[0] == 1 && value < min)) minReset = parseFloat(value);
		if ((i == 1 || type == "single") && resetEnd[1] == 2 || (resetEnd[1] == 1 && value > max)) maxReset = parseFloat(value);

		maxReset = Math.max(minReset + 0.0001*Math.abs(minReset), maxReset); //in case user makes a mistake
		parent.noUiSlider.updateOptions({
			range: {
				'min': [minReset],
				'max': [maxReset]
			}
		});

		if (varVals) varVals[i] = parseFloat(value);	
		if (varLims) varLims[i] = parseFloat(value);

		//reset the slider value
		var r = parent.noUiSlider.get()
		if (Array.isArray(r)) r[i] = value; else r = value; //this could also be type 'double' vs. 'single'

		unsafe_slider = !['plotNmaxSlider','PSlider','VelWidthSlider'].every(
			function(id){
				return !parent.id.includes(id);});
		// don't automatically update the size, make people slide it so it's safer
		if (!GUIParams.safePSizeSliders || 
			value < max || 
			!unsafe_slider){
			parent.noUiSlider.set(r);
			//update the attached variables (already taken care of when we change the slider value)
			updateUIValues(parseFloat(value), varArgs, i, type);
		}
	}

}


// Listen to keydown events on the input field.
function handleSliderText(input, handle, varArgs, resetEnd, type, varVals=null, varLims=null) {
	input.addEventListener('keydown', function( e ) {
		var values = input.parent.noUiSlider.get();
		var value;
		if (Array.isArray(values)) {
			value = parseFloat(values[handle]);
		} else {
			value = parseFloat(values);
		}
		var steps = input.parent.noUiSlider.options.steps;
		var step = parseFloat(steps[handle]);

		if (typeof parseFloat(this.value) === 'number' && !isNaN(this.value)) {
			switch ( e.which ) {
				case 13:
					setSliderHandle(handle, parseFloat(this.value), input.parent, varArgs, resetEnd, type, varVals, varLims);
					break;
				case 38:
					setSliderHandle(handle, value + step, input.parent, varArgs, resetEnd, type, varVals, varLims);
					break;
				case 40:
					setSliderHandle(handle, value - step, input.parent, varArgs, resetEnd, type, varVals, varLims);
					break;
			}
		}
	});
}

function createSlider(slider, text, sliderArgs, varArgs, resetEnd=[null, 2], type='single', varVals=null, varLims=null){
	//resetEnd : 0=don't reset; 1=reset if value > max; 2=reset always
	//varArgs = {f:'setViewerParamByKey', v:varToSet, f2:, v2:}
	if (slider != null && text != null){

		if (slider.noUiSlider) {
			slider.noUiSlider.destroy();
		}

		text.forEach(function(s){
			s.parent = slider;
		})

		noUiSlider.create(slider, sliderArgs);

		slider.noUiSlider.on('update', function(values, handle) {
			text[handle].value = values[handle];

		});
		slider.noUiSlider.on('slide', function(values, handle) {
			if (varVals) varVals[handle] = parseFloat(values[handle]);
			updateUIValues(values[handle], varArgs, handle, type); //update when sliding the slider
		});

		text.forEach(function(input, handle){
			handleSliderText(input, handle, varArgs, resetEnd, type, varVals, varLims); //updates are in setSliderHandle
		});
	}
}
/////////////////////////////////////////////

///////////////////////////////
///// create the single sliders
///////////////////////////////

// create the individual sliders
function createPsizeSlider(p){

	var initialValue = parseFloat(GUIParams.PsizeMult[p]); //I don't *think* I need to update this in GUI; it's just the initial value that matters, right?

	var sliderArgs = {
		start: [initialValue], 
		connect: [true, false],
		tooltips: false,
		steps: [0.0001],
		range: { //reset below
			'min': [0],
			'max': [initialValue]
		},
		format: wNumb({
			decimals: 4
		})
	}

	var slider = document.getElementById(p+'_PSlider');
	var text = [document.getElementById(p+'_PMaxT')];
	var varToSet = [initialValue, "PsizeMult",p];
	var varArgs = {'f':'setViewerParamByKey','v':varToSet};

	createSlider(slider, text, sliderArgs, varArgs);

	//reformat
	w = parseInt(d3.select('#'+p+'_PSlider').style('width').slice(0,-2));
	d3.select('#'+p+'_PSlider').select('.noUi-base').style('width',w-10+"px");

}

function createNpartsSlider(p){
	var initialValue = parseFloat(GUIParams.plotNmax[p]); //I don't *think* I need to update this in GUI; it's just the initial value that matters, right?

	var sliderArgs = {
		start: [initialValue], 
		connect: [true, false],
		tooltips: false,
		steps: [1],
		range: { 
			'min': [0],
			'max': [initialValue]
		},
		format: wNumb({
			decimals: 0
		})
	}

	var slider = document.getElementById(p+'_plotNmaxSlider');
	var text = [document.getElementById(p+'_NMaxT')];
	var varToSet = [initialValue, "plotNmax",p]
	var varArgs = {'f':'setViewerParamByKey','v':varToSet};

	createSlider(slider, text, sliderArgs, varArgs, [null, 1]);

	//reformat
	w = parseInt(d3.select('#'+p+'_plotNmaxSlider').style('width').slice(0,-2));
	d3.select('#'+p+'_plotNmaxSlider').select('.noUi-base').style('width',w-10+"px");
}


function createCamNormSlider(p){
	if (GUIParams.haveOctree[p]){
		var initialValue = parseFloat(GUIParams.octreeNormCameraDistance[p]); 

		var sliderArgs = {
			start: [initialValue], 
			connect: [true, false],
			tooltips: false,
			steps: [1],
			range: { 
				'min': [0],
				'max': [initialValue]
			},
			format: wNumb({
				decimals: 0
			})
		}

		var slider = document.getElementById(p+'_CamSlider');
		var text = [document.getElementById(p+'_CamMaxT')];
		var varToSet = [initialValue, p];
		var varArgs = {'f':'updateNormCameraDistance','v':varToSet};

		createSlider(slider, text, sliderArgs, varArgs, [null, 1]);

		//reformat
		w = parseInt(d3.select('#'+p+'_CamSlider').style('width').slice(0,-2));
		d3.select('#'+p+'_CamSlider').select('.noUi-base').style('width',w-10+"px");
	}
}

function createVelWidthSlider(p){
	if (GUIParams.haveVelocities[p]){
		var initialValue = parseFloat(GUIParams.velVectorWidth[p]); 
		//console.log('check', initialValue, p, GUIParams.velVectorWidth)

		var sliderArgs = {
			start: [initialValue], 
			connect: [true, false],
			tooltips: false,
			steps: [0.01],
			range: { 
				'min': [0],
				'max': [initialValue]
			},
			format: wNumb({
				decimals: 2
			})
		}

		var slider = document.getElementById(p+'_VelWidthSlider');
		var text = [document.getElementById(p+'_VelWidthMaxT')];
		var varToSet = [initialValue, p];
		var varArgs = {'f':'updateVelocityVectorWidth','v':varToSet};

		createSlider(slider, text, sliderArgs, varArgs, [null, 1]);

		//reformat
		w = parseInt(d3.select('#'+p+'_VelWidthSlider').style('width').slice(0,-2));
		d3.select('#'+p+'_VelWidthSlider').select('.noUi-base').style('width',w-10+"px");
	}
}
//This one requires a bit of a special handling to talk to the N slider
function createDecimationSlider(){

	var initialValue = parseFloat(GUIParams.decimate); //I don't *think* I need to update this in GUI; it's just the initial value that matters, right?

	var sliderArgs = {
		start: [initialValue], 
		connect: [true, false],
		tooltips: false,
		steps: [0.1],
		range: { 
			'min': [initialValue],
			'max': [20]
		},
		format: wNumb({
			decimals: 1
		})
	}

	var slider = document.getElementById('DSlider');
	var text = [document.getElementById('DMaxT')];
	var varToSet = [initialValue, "decimate"]
	var varArgs = {'f':'setViewerParamByKey','v':varToSet};

	createSlider(slider, text, sliderArgs, varArgs, [null, 1]);

	//reformat
	w = parseInt(d3.select("#DSlider").style("width").slice(0,-2));
	d3.select("#DSlider").select('.noUi-base').style('width',w-10+"px");


	//redefine the update function -- special case because it needs to talk to the Nslider as well
	slider.noUiSlider.on('update', function(values, handle) {
		var decf = GUIParams.decimate/parseFloat(values[handle]);
		//if (decf != 1){ //is this if statement really necessary?
			text.value = values[handle];
			varToSet[0] = values[handle];
			sendToViewer([{'setViewerParamByKey':varToSet}])
			GUIParams.decimate = parseFloat(values[handle]);
		//}

		GUIParams.partsKeys.forEach(function(p){
			var max = Math.round(GUIParams.plotNmax[p]);
			var sliderInput = document.getElementById(p+'_NMaxT');
			if (sliderInput != null){
				var val = parseFloat(sliderInput.parent.noUiSlider.get());

				sliderInput.parent.noUiSlider.updateOptions({
					range: {
						'min': [0],
						'max': [Math.round(max/parseFloat(values[handle]))]
					}
				});
				//Note: this is not perfect... if you increase decimation then decrease, it will not always place the N slider at the correct value
				sliderInput.parent.noUiSlider.set(Math.round(Math.min(max, val*decf)));
			}

		});
	});

}

function createMemorySlider(){

	var initialValue = parseFloat(GUIParams.octreeMemoryLimit/1e9); 

	var sliderArgs = {
		start: [initialValue], 
		connect: [true, false],
		tooltips: false,
		steps: [0.01],
		range: { 
			'min': [0],
			'max': [initialValue]
		},
		format: wNumb({
			decimals: 2
		})
	}

	var slider = document.getElementById('MSlider');
	var text = [document.getElementById('MMaxT')];
	var varToSet = [initialValue];
	var varArgs = {'f':'updateMemoryLimit','v':varToSet};

	createSlider(slider, text, sliderArgs, varArgs, [null, 1]);

	//reformat
	w = parseInt(d3.select("#MSlider").style("width").slice(0,-2));
	d3.select("#MSlider").select('.noUi-base').style('width',w-10+"px");

}

function createStereoSlider(){

	var initialValue = parseFloat(GUIParams.stereoSepMax); //I don't *think* I need to update this in GUI; it's just the initial value that matters, right?

	var sliderArgs = {
		start: [initialValue], 
		connect: [true, false],
		tooltips: false,
		steps: [0.001],
		range: { 
			'min': [0],
			'max': [initialValue]
		},
		format: wNumb({
			decimals: 3
		})
	}

	var slider = document.getElementById('SSSlider');
	var text = [document.getElementById('SSMaxT')];
	var varToSet = [initialValue];
	var varArgs = {'f':'updateStereoSep','v':varToSet};

	createSlider(slider, text, sliderArgs, varArgs, [null, 1]);

	//reformat
	w = parseInt(d3.select("#SSSlider").style("width").slice(0,-2));
	d3.select("#SSSlider").select('.noUi-base').style('width',w-10+"px");

}

function createFrictionSlider(){

	var initialValue = parseFloat(GUIParams.friction); //I don't *think* I need to update this in GUI; it's just the initial value that matters, right?

	var sliderArgs = {
		start: [initialValue], 
		connect: [true, false],
		tooltips: false,
		steps: [0.001],
		range: { 
			'min': [0],
			'max': [initialValue]
		},
		format: wNumb({
			decimals: 3
		})
	}

	var slider = document.getElementById('CFSlider');
	var text = [document.getElementById('CFMaxT')];
	var varToSet = [initialValue];
	var varArgs = {'f':'updateFriction','v':varToSet};

	createSlider(slider, text, sliderArgs, varArgs,[null, 1]);

	//reformat
	w = parseInt(d3.select("#CFSlider").style("width").slice(0,-2));
	d3.select("#CFSlider").select('.noUi-base').style('width',w-10+"px");

	//redefine here so that I can set the friction in the GUI controls
	slider.noUiSlider.on('update', function(values, handle) {
		text[handle].value = values[handle];
		updateUIValues(values[handle], varArgs, handle, "single");
		updateFriction(parseFloat(values[handle]));
	});

	//do I need to do something here?
	// text.forEach(function(input, handle){
	// 	handleSliderText(input, handle, varArgs, resetEnd, type);
	// });
}


// create the individual sliders
function createColormapSliders(p){

	GUIParams.ckeys[p].forEach(function(ck, j){
		createColormapSlider(p,ck)	
		
	});

}

function createColormapSlider(p,ck){
	var sliderArgs = {
		start: GUIParams.colormapVals[p][ck], 
		connect: true,
		tooltips: [false, false],
		steps: [[0.001,0.001],[0.001,0.001]],
		range: { 
			'min': [GUIParams.colormapLims[p][ck][0]],
			'max': [GUIParams.colormapLims[p][ck][1]]
		},
		format: wNumb({
			decimals: 3
		})
	}

	var slider = document.getElementById(p+'_CK_'+ck+'_END_CMapSlider');
	var textMin = document.getElementById(p+'_CK_'+ck+'_END_CMapMinT');
	var textMax = document.getElementById(p+'_CK_'+ck+'_END_CMapMaxT');


	text = [textMin, textMax];
	//not sure this is the best way to handle this.
	var evalString = 'GUIParams.colormapVals.'+p+'.'+ck+'[i] = parseFloat(value); if (GUIParams.showColormap.'+p+') populateColormapAxis("'+p+'"); ';
	var varArgs = {//'f':'setViewerParamByKey','v':[initialValueMin, 'colormapVals',p, ck],
					'f1':'setViewerParamByKey','v1':[GUIParams.colormapVals[p][ck], 'colormapVals',p, ck],
					'f2':'setViewerParamByKey','v2':[GUIParams.colormapLims[p][ck], 'colormapLims',p, ck],
					'evalString':evalString};

	createSlider(slider, text, sliderArgs, varArgs, [2,2], 'double', GUIParams.colormapVals[p][ck], GUIParams.colormapLims[p][ck]);

	//reformat
	var w = parseInt(d3.select('.CMapClass').style('width').slice(0,-2));
	d3.select('#'+p+'_CK_'+ck+'_END_CMapSlider').select('.noUi-base').style('width',w-10+'px');
	d3.select('#'+p+'_CK_'+ck+'_END_CMapSlider').select('.noUi-connect').style('border-radius','6px 0px 0px 6px');
	d3.select('#'+p+'_CK_'+ck+'_END_CMapSlider').select('.noUi-handle-lower').style('border-radius','6px 0px 0px 6px');

}


// create the individual sliders
function createFilterSliders(p){

	GUIParams.fkeys[p].forEach(function(fk, j){
		if (fk != "None"){

			var sliderArgs = {
				start: GUIParams.filterVals[p][fk], 
				connect: true,
				tooltips: [false, false],
				steps: [[0.001,0.001],[0.001,0.001]],
				range: { 
					'min': [GUIParams.filterLims[p][fk][0]],
					'max': [GUIParams.filterLims[p][fk][1]]
				},
				format: wNumb({
					decimals: 3
				})
			}

			var slider = document.getElementById(p+'_FK_'+fk+'_END_FilterSlider');
			var textMin = document.getElementById(p+'_FK_'+fk+'_END_FilterMinT');
			var textMax = document.getElementById(p+'_FK_'+fk+'_END_FilterMaxT');
			text = [textMin, textMax];
			var varArgs = {//'f':'setViewerParamByKey','v':[GUIParams.filterVals[p][fk], "filterVals",p, fk],
						  'f1':'setViewerParamByKey','v1':[GUIParams.filterVals[p][fk], "filterVals",p, fk],
						  'f2':'setViewerParamByKey','v2':[GUIParams.filterLims[p][fk], "filterLims",p, fk],
						  'f3':'setViewerParamByKey','v3':[true,'updateFilter',p]};

			createSlider(slider, text, sliderArgs, varArgs, [2,2], 'double', GUIParams.filterVals[p][fk], GUIParams.filterLims[p][fk]);

			//reformat
			var w = parseInt(d3.select('.FilterClass').style("width").slice(0,-2));
			d3.select('#'+p+'_FK_'+fk+'_END_FilterSlider').select('.noUi-base').style('width',w-10+"px");
			d3.select('#'+p+'_FK_'+fk+'_END_FilterSlider').select('.noUi-connect').style('border-radius','6px 0px 0px 6px');
			d3.select('#'+p+'_FK_'+fk+'_END_FilterSlider').select('.noUi-handle-lower').style('border-radius','6px 0px 0px 6px');
		}
	});

}