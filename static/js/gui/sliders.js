/////////////////////////////////////////////
/////////////Generic  slider functions
/////////////////////////////////////////////

function updateSliderValues(i, value, varArgs, type){

	//these update the viewer parameters
	varToSetSend = [];
	varArgs.v.forEach(function(x){
		varToSetSend.push(x);
	})
	if (type == "double") varToSetSend.push(i); //adding this only for double sliders 
	varToSetSend[0] = parseFloat(value);
	toSend = {};
	toSend[varArgs.f]= varToSetSend;
	sendToViewer(toSend);

	if (varArgs.hasOwnProperty('f2')){
		toSend = {};
		toSend[varArgs.f2]= varArgs.v2;
		sendToViewer(toSend);
	}

	if (varArgs.hasOwnProperty('f3')){
		toSend = {};
		toSend[varArgs.f3]= varArgs.v3;
		sendToViewer(toSend);
	}

	//this can run a function in the GUI (can I improve on this method?)
	if (varArgs.hasOwnProperty('evalString')) eval(varArgs.evalString);
}

//Maybe there's a way to get rid of all these if statements? (in this and the following function)
function setSliderHandle(i, value, parent, varArgs, resetEnd, type) {
	//resetEnd : 0=don't reset; 1=reset if value > max; 2=reset always

	//reset the slider limits
	var min = parent.noUiSlider.options.range.min[0];
	var max = parent.noUiSlider.options.range.max[0];
	var minReset = min;
	var maxReset = max;
	if ((i == 0 && type == "double") && resetEnd[0] == 2 || (resetEnd[0] == 1 && value < min)) minReset = parseFloat(value);
	if ((i == 1 || type == "single") && resetEnd[1] == 2 || (resetEnd[1] == 1 && value > max)) maxReset = parseFloat(value);

	//reset the slider value
	var r = parent.noUiSlider.get()
	if (Array.isArray(r)) r[i] = value; else r = value; //this could also be type 'double' vs. 'single'
	parent.noUiSlider.set(r);

	//update the attached variables
	updateSliderValues(i, value, varArgs, type);

	parent.noUiSlider.updateOptions({
		range: {
			'min': [minReset],
			'max': [maxReset]
		}
	});
}


// Listen to keydown events on the input field.
function handleSliderText(input, handle, varArgs, resetEnd, type) {
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

		switch ( e.which ) {
			case 13:
				setSliderHandle(handle, this.value, input.parent, varArgs, resetEnd, type);
				break;
			case 38:
				setSliderHandle(handle, value + step, input.parent, varArgs, resetEnd, type);
				break;
			case 40:
				setSliderHandle(handle, value - step, input.parent, varArgs, resetEnd, type);
				break;
		}
	});
}

function createSlider(slider, text, sliderArgs, varArgs, resetEnd=[null, 2], type='single'){
	//resetEnd : 0=don't reset; 1=reset if value > max; 2=reset always
	//varArgs = {f:'setViewerParamByKey', v:varToSet, f2:, v2:}
	if (slider != null && text != null){

		if (slider.noUiSlider) {
			slider.noUiSlider.destroy();
		}

		var sliderInputs = text;
		sliderInputs.forEach(function(s){
			s.parent = slider;
		})

		noUiSlider.create(slider, sliderArgs);

		slider.noUiSlider.on('update', function(values, handle) {
			sliderInputs[handle].value = values[handle];
			updateSliderValues(handle, values[handle], varArgs, type);

		});

		sliderInputs.forEach(function(input, handle){
			handleSliderText(input, handle, varArgs, resetEnd, type);
		});
	}
}
/////////////////////////////////////////////
