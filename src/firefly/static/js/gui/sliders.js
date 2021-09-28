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
		parent.noUiSlider.set(r);


		//update the attached variables (already taken care of when we change the slider value)
		updateUIValues(parseFloat(value), varArgs, i, type);
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
function createPsizeSliders(){

	GUIParams.partsKeys.forEach(function(p,i){
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
	});

}

function createNpartsSliders(){
	GUIParams.partsKeys.forEach(function(p,i){
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

		var slider = document.getElementById(p+'_NSlider');
		var text = [document.getElementById(p+'_NMaxT')];
		var varToSet = [initialValue, "plotNmax",p]
		var varArgs = {'f':'setViewerParamByKey','v':varToSet};

		createSlider(slider, text, sliderArgs, varArgs, [null, 0]);

		//reformat
		w = parseInt(d3.select('#'+p+'_NSlider').style('width').slice(0,-2));
		d3.select('#'+p+'_NSlider').select('.noUi-base').style('width',w-10+"px");
	});
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
			GUIParams.decimate = values[handle];
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
				sliderInput.parent.noUiSlider.set(Math.min(max, val*decf));
			}

		});
	});

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