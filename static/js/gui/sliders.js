/////////////////////////////////////////////
/////////////Generic  slider functions
/////////////////////////////////////////////

function updateSingleSliderValues(value, varArgs){
	funcName = varArgs.f;
	varToSet = varArgs.v;
	varToSet[0] = parseFloat(value);
	toSend = {};
	toSend[funcName]= varToSet;
	sendToViewer(toSend);
}

function setSingleSliderHandle(i, value, parent, varArgs, resetEnd ) {
	//resetEnd : 0=don't reset; 1=reset if value > max; 2=reset always
	//always reset the limits?
	var max = parent.noUiSlider.options.range.max[0];
	if ( resetEnd == 2 || (resetEnd == 1 && value > max)){
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

	updateSingleSliderValues(value, varArgs);
}


// Listen to keydown events on the input field.
function handleSingleSliderText(input, handle, varArgs, resetEnd) {
	input.addEventListener('keydown', function( e ) {
		var value = Number(input.parent.noUiSlider.get());
		var steps = input.parent.noUiSlider.options.steps;
		var step = steps[handle];

		switch ( e.which ) {
			case 13:
				setSingleSliderHandle(handle, this.value, input.parent, varArgs, resetEnd);

				break;
			case 38:
				setSingleSliderHandle(handle, value + step, input.parent, varArgs, resetEnd);
				break;
			case 40:
				setSingleSliderHandle(handle, value - step, input.parent, varArgs, resetEnd);
				break;
		}
	});
}

function updateDoubleSliderValues(value, i, varArgs){
	varToSetSend = [];
	varArgs.v.forEach(function(x){
		varToSetSend.push(x);
	})
	varToSetSend.push(i);
	varToSetSend[0] = parseFloat(value);
	toSend = {};
	toSend[varArgs.f]= varToSetSend;
	sendToViewer(toSend);

	if (varArgs.hasOwnProperty('f2')){
		toSend = {};
		toSend[varArgs.f2]= varArgs.v2;
		sendToViewer(toSend);
	}

}

function setDoubleSliderHandle(i, value, parent, varArgs, resetEnd, varToSet2 = null, funcName2 = null) {
	//resetEnd : 0=don't reset; 1=reset if value > max; 2=reset always
	//always reset the limits?
	var min = parent.noUiSlider.options.range.min[0];
	var max = parent.noUiSlider.options.range.max[0];
	var minReset = min;
	var maxReset = max;
	if (i == 0 && resetEnd[0] == 2 || (resetEnd[0] == 1 && value < min)) minReset = parseFloat(value);
	if (i == 1 && resetEnd[1] == 2 || (resetEnd[1] == 1 && value > max)) maxReset = parseFloat(value);
	
	parent.noUiSlider.updateOptions({
		range: {
			'min': [minReset],
			'max': [maxReset]
		}
	});

	var r = parent.noUiSlider.get()
	r[i] = value;
	parent.noUiSlider.set(r);

	updateDoubleSliderValues(value, i, varArgs);
}


// Listen to keydown events on the input field.
function handleDoubleSliderText(input, handle, varArgs, resetEnd) {
	input.addEventListener('keydown', function( e ) {
		var values = input.parent.noUiSlider.get();
		var value = Number(values[handle]);
		var steps = input.parent.noUiSlider.options.steps;
		var step = steps[handle];

		switch ( e.which ) {
			case 13:
				setDoubleSliderHandle(handle, this.value, input.parent, varArgs, resetEnd);
				break;
			case 38:
				setDoubleSliderHandle(handle, value + step, input.parent, varArgs, resetEnd);
				break;
			case 40:
				setDoubleliderHandle(handle, value - step, input.parent, varArgs, resetEnd);
				break;
		}
	});
}
//need to allow this to update at large numbers
function createSlider(slider, text, args, varArgs, resetEnd=2, type='single'){
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

		noUiSlider.create(slider, args);

		slider.noUiSlider.on('update', function(values, handle) {
			sliderInputs[handle].value = values[handle];
			if (type == 'single') updateSingleSliderValues(values[handle], varArgs);
			if (type == 'double') updateDoubleSliderValues(values[handle], handle, varArgs); //is this correct??


		});

		sliderInputs.forEach(function(input, handle){
			if (type == 'single') handleSingleSliderText(input, handle, varArgs,resetEnd, type);
			if (type == 'double') handleDoubleSliderText(input, handle, varArgs, resetEnd, type);
		});
	}
}
/////////////////////////////////////////////
