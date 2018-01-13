//check whether the center is locked or not
function checkCenterLock(box)
{

	controls.dispose();

	if (box.checked) {
		xx = camera.getWorldDirection()
		rotatecamera = true;
		controls = new THREE.TrackballControls( camera, renderer.domElement );
		controls.target = new THREE.Vector3(camera.position.x + xx.x, camera.position.y + xx.y, camera.position.z + xx.z);
	} else {
		rotatecamera = false;
		controls = new THREE.FlyControls( camera , renderer.domElement);
	}
	updateUICenterText();
	updateUICameraText();
	updateUIRotText();

}

function checkVelBox(box)
{
	var pID = box.id.slice(0, -11)
	showVel[pID] = false;
	if (box.checked){
		showVel[pID] = true;
	}

}

//functions to check sizes of particles
function checkColor(event, color)
{
	rgb = color.toRgb();
	var pID = event.id.slice(0,-11); // remove  "ColorPicker" from id
	Pcolors[pID] = [rgb.r/255., rgb.g/255., rgb.b/255., rgb.a];

	redraw = true;	
}


/////////////////////////////////////////////
// Filter sliders
function setFSliderHandle(i, value, parent) {
	var r = [null,null];
	r[i] = value;
	parent.noUiSlider.set(r);
	// I need a better way to do this!
	var fpos = parent.id.indexOf('_FK_');
	var epos = parent.id.indexOf('_END_');
	var sl = parent.id.length;
	var p = parent.id.slice(0, fpos - sl);
	var fk = parent.id.slice(fpos + 4, epos - sl);


	filterLims[p][fk][i] = value;
	redraw = true;
	updateFilter[p] = true;
	mouseDown = false; 
}

// Listen to keydown events on the input field.
function handleFSliderText(input, handle) 
{
	input.addEventListener('change', function(){
		setFSliderHandle(handle, this.value, this.parent);
	});
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
				setFSliderHandle(handle, this.value, input.parent);
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
					setFSliderHandle(handle, value + position, input.parent);
				}
				break;
			case 40:
				position = step[0];
				if ( position === false ) {
					position = 1;
				}
				if ( position !== null ) {
					setFSliderHandle(handle, value - position, input.parent);
				}
				break;
		}
	});
};

function createFilterSliders(){

	var i = 0;
	var j = 0;
	for (i=0; i<partsKeys.length; i++){
		p = partsKeys[i];
		if (parts.options.UIdropdown[p] == 1){

			SliderF[p] = {};
			SliderFmin[p] = {};
			SliderFmax[p] = {};
			SliderFinputs[p] = {};

			for (j=0; j<fkeys[p].length; j++){
				var fk = fkeys[p][j]
				SliderF[p][fk] = document.getElementById(p+'_FK_'+fk+'_END_FilterSlider');
				SliderFmin[p][fk] = document.getElementById(p+'_FK_'+fk+'_END_FilterMinT');
				SliderFmax[p][fk] = document.getElementById(p+'_FK_'+fk+'_END_FilterMaxT');
				if (SliderF[p][fk] != null && SliderFmin[p][fk] != null && SliderFmax[p][fk] != null && filterLims[p][fk] != null){
					SliderFinputs[p][fk] = [SliderFmin[p][fk], SliderFmax[p][fk]];
					SliderFinputs[p][fk][0].parent = SliderF[p][fk];
					SliderFinputs[p][fk][1].parent = SliderF[p][fk];
					min = filterLims[p][fk][0];
					max = filterLims[p][fk][1];

					noUiSlider.create(SliderF[p][fk], {
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
					SliderF[p][fk].noUiSlider.on('mouseup', mouseDown=false); 
					SliderF[p][fk].noUiSlider.on('update', function(values, handle) {
						var fpos = this.target.id.indexOf('_FK_');
						var epos = this.target.id.indexOf('_END_');
						var sl = this.target.id.length;
						var pp = this.target.id.slice(0, fpos - sl);
						var ffk = this.target.id.slice(fpos + 4, epos - sl);
						SliderFinputs[pp][ffk][handle].value = values[handle];
						filterLims[pp][ffk][handle] = values[handle];
						updateFilter[pp] = true;
						redraw = true;
						mouseDown = true;
						//keepAlpha = true;
					});

					SliderFinputs[p][fk].forEach(handleFSliderText);
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
	plotNmax[p] = value;
	redraw = true;
	mouseDown = false; 
}

// Listen to keydown events on the input field.
// can I just use the same functions as for the filters?
function handleNSliderText(input, handle) 
{
	input.addEventListener('change', function(){
		setNSliderHandle(handle, this.value, this.parent);
	});
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
	for (i=0; i<partsKeys.length; i++){

		p = partsKeys[i];

		if (parts.options.UIdropdown[p] == 1){

			SliderN[p] = document.getElementById(p+'_NSlider');
			SliderNmax[p] = document.getElementById(p+'_NMaxT');
			if (SliderN[p] != null && SliderNmax[p] != null){
				SliderNInputs[p] = [SliderNmax[p]];
				SliderNInputs[p][0].parent = SliderN[p];
				min = 0;
				max = Math.round(parts[p].Coordinates.length/Decimate);

				noUiSlider.create(SliderN[p], {
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
				SliderN[p].noUiSlider.on('mouseup', mouseDown=false); 
				SliderN[p].noUiSlider.on('update', function(values, handle) {
					var pp = this.target.id.slice(0, -8);
					SliderNInputs[pp][handle].value = values[handle];
					plotNmax[pp] = parseInt(values[handle]);
					redraw = true;
					mouseDown = true;
				});

				SliderNInputs[p].forEach(handleNSliderText);
			}
			w = parseInt(d3.select('#'+p+'_NSlider').style('width').slice(0,-2));
			d3.select('#'+p+'_NSlider').select('.noUi-base').style('width',w-10+"px");
		}
	}
}

/////////////////////////////////////////////
// Psize sliders
function setPSliderHandle(i, value, parent) {
	var max = parent.noUiSlider.options.range.max[i];
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
	PsizeMult[p] = value;
	redraw = true;
	mouseDown = false; 

}

// Listen to keydown events on the input field.
// can I just use the same functions as for the filters?
function handlePSliderText(input, handle) 
{
	input.addEventListener('change', function(){
		setPSliderHandle(handle, this.value, this.parent);
	});
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
	for (i=0; i<partsKeys.length; i++){
		p = partsKeys[i];

		SliderP[p] = document.getElementById(p+'_PSlider');
		SliderPmax[p] = document.getElementById(p+'_PMaxT');
		if (SliderP[p] != null && SliderPmax[p] != null){
			SliderPInputs[p] = [SliderPmax[p]];
			SliderPInputs[p][0].parent = SliderP[p];
			min = 0.;
			max = 5.;

			noUiSlider.create(SliderP[p], {
				start: [PsizeMult[p]],
				connect: [true, false],
				tooltips: false,
				steps: [0.1],
				range: {
					'min': [min],
					'max': [max]
				},
				format: wNumb({
				decimals: 1
				})
			});

			SliderP[p].noUiSlider.on('mouseup', mouseDown=false); 
			SliderP[p].noUiSlider.on('update', function(values, handle) {
				var pp = this.target.id.slice(0, -8);
				SliderPInputs[pp][handle].value = values[handle];
				PsizeMult[pp] = parseFloat(values[handle]);
				redraw = true;
				mouseDown = true;
				//keepAlpha = true;

			});

			SliderPInputs[p].forEach(handlePSliderText);
		}
		w = parseInt(d3.select('#'+p+'_PSlider').style('width').slice(0,-2));
		d3.select('#'+p+'_PSlider').select('.noUi-base').style('width',w-10+"px");
	}
}

/////////////////////////////////////////////
// Decimation slider
function setDSliderHandle(i, value, parent) {
	value = Math.max(1, parseFloat(value));

	var max = parent.noUiSlider.options.range.max[i];
	if (value > max){
		parent.noUiSlider.updateOptions({
			range: {
				'min': [1],
				'max': [value]
			}
		});
	}
	var val;
	for (i=0; i<partsKeys.length; i++){
		var p = partsKeys[i];
		max = Math.round(parts[p].Coordinates.length);
	 	val = parseFloat(SliderN[p].noUiSlider.get());
		SliderN[p].noUiSlider.updateOptions({
			range: {
				'min': [0],
				'max': [Math.round(max/value)]
			},
		});
		SliderN[p].noUiSlider.set(Math.min(max, val*Decimate/parseFloat(value)));
	}
	var r = [null];
	r[i] = value;
	parent.noUiSlider.set(value);
	Decimate = value;
	redraw = true;
	mouseDown = false; 

}

// Listen to keydown events on the input field.
// can I just use the same functions as for the filters?
function handleDSliderText(input, handle) 
{
	input.addEventListener('change', function(){
		setDSliderHandle(handle, this.value, this.parent);
	});
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

	SliderD = document.getElementById('DSlider');
	SliderDmax = document.getElementById('DMaxT');
	if (SliderD != null && SliderDmax != null){
		SliderDInputs = [SliderDmax];
		SliderDInputs[0].parent = SliderD;
		min = 1.;
		max = 100.;

		noUiSlider.create(SliderD, {
			start: [1],
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

		SliderD.noUiSlider.on('mouseup', mouseDown=false); 
		SliderD.noUiSlider.on('update', function(values, handle) {
			for (i=0; i<partsKeys.length; i++){
				var p = partsKeys[i];
				var max = Math.round(parts[p].Coordinates.length);
				if (parts.options.UIdropdown[p] == 1){
					var val = parseFloat(SliderN[p].noUiSlider.get());
					SliderN[p].noUiSlider.updateOptions({
						range: {
							'min': [0],
							'max': [Math.round(max/parseFloat(values[handle]))]
						}
					});
					SliderN[p].noUiSlider.set(Math.min(max, val*Decimate/parseFloat(values[handle])));
				}

			}

			SliderDInputs[handle].value = values[handle];
			Decimate = parseFloat(values[handle]);
			redraw = true;
			mouseDown = true;
			//keepAlpha = true;
		});

		SliderDInputs.forEach(handleDSliderText);
	}
	w = parseInt(d3.select("#DSlider").style("width").slice(0,-2));
	d3.select("#DSlider").select('.noUi-base').style('width',w-10+"px");
}


/////////////////////////////////////////////
// Friction slider
function setCFSliderHandle(i, value, parent) {
	value = Math.min(Math.max(0., parseFloat(value)),1.);

	parent.noUiSlider.set(value);
	if (rotatecamera){
		controls.dynamicDampingFactor = value;
	}
	mouseDown = false; 

}

// Listen to keydown events on the input field.
function handleCFSliderText(input, handle) 
{
	input.addEventListener('change', function(){
		setCFSliderHandle(handle, this.value, this.parent);
	});
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

	SliderCF = document.getElementById('CFSlider');
	SliderCFmax = document.getElementById('CFMaxT');
	if (SliderCF != null && SliderCFmax != null){
		SliderCFInputs = [SliderCFmax];
		SliderCFInputs[0].parent = SliderCF;
		min = 0.;
		max = 1.;

		noUiSlider.create(SliderCF, {
			start: [controls.dynamicDampingFactor],
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

		SliderCF.noUiSlider.on('mouseup', mouseDown=false); 
		SliderCF.noUiSlider.on('update', function(values, handle) {

			SliderCFInputs[handle].value = values[handle];
			var value = Math.min(Math.max(0., parseFloat(values[handle])),1.);
			if (rotatecamera){
				controls.dynamicDampingFactor = value;
			}
			mouseDown = true;
		});

		SliderCFInputs.forEach(handleCFSliderText);
	}
	w = parseInt(d3.select("#CFSlider").style("width").slice(0,-2));
	d3.select("#CFSlider").select('.noUi-base').style('width',w-10+"px");
}

function updateUICenterText()
{
	if (rotatecamera){
		document.getElementById("CenterXText").value = controls.target.x + center.x;
		document.getElementById("CenterYText").value = controls.target.y + center.y;
		document.getElementById("CenterZText").value = controls.target.z + center.z;
	} else {
		document.getElementById("CenterXText").value = 0;
		document.getElementById("CenterYText").value = 0;
		document.getElementById("CenterZText").value = 0;		
	}
}

/////////////////////////////////////////////
// Stereo Separation slider
function checkStereoLock(box)
{
	if (box.checked) {
		normalRenderer = renderer;
		renderer = effect;
		useStereo = true;
	} else {
		renderer = normalRenderer;
		renderer.setSize(window.innerWidth, window.innerHeight);
		useStereo = false;
	}
}
function setSSSliderHandle(i, value, parent) {
	var max = parent.noUiSlider.options.range.max[i];
	if (value > max){
		stereoSepMax = parseFloat(value);
		parent.noUiSlider.updateOptions({
			range: {
				'min': [0],
				'max': [parseFloat(value)]
			}
		});
	}
	value = Math.min(Math.max(0., parseFloat(value)),stereoSepMax);

	parent.noUiSlider.set(value);
	effect.setEyeSeparation(value);
	
	mouseDown = false; 

}

// Listen to keydown events on the input field.
function handleSSSliderText(input, handle) 
{
	input.addEventListener('change', function(){
		setSSSliderHandle(handle, this.value, this.parent);
	});
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

	SliderSS = document.getElementById('SSSlider');
	SliderSSmax = document.getElementById('SSMaxT');
	if (SliderSS != null && SliderSSmax != null){
		SliderSSInputs = [SliderSSmax];
		SliderSSInputs[0].parent = SliderSS;
		min = 0.;
		max = stereoSepMax;

		noUiSlider.create(SliderSS, {
			start: [stereoSep],
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

		SliderSS.noUiSlider.on('mouseup', mouseDown=false); 
		SliderSS.noUiSlider.on('update', function(values, handle) {

			SliderSSInputs[handle].value = values[handle];

			var value = Math.min(Math.max(0., parseFloat(values[handle])),stereoSepMax);
			effect.setEyeSeparation(value);
			mouseDown = true;
		});

		SliderSSInputs.forEach(handleSSSliderText);
	}
	w = parseInt(d3.select("#SSSlider").style("width").slice(0,-2));
	d3.select("#SSSlider").select('.noUi-base').style('width',w-10+"px");
}

function updateUICameraText()
{
    document.getElementById("CameraXText").value = camera.position.x + center.x;
    document.getElementById("CameraYText").value = camera.position.y + center.y;
    document.getElementById("CameraZText").value = camera.position.z + center.z;
}

function updateUIRotText()
{
    document.getElementById("RotXText").value = camera.rotation.x;
    document.getElementById("RotYText").value = camera.rotation.y;
    document.getElementById("RotZText").value = camera.rotation.z;

}


function checkText(input, event)
{

	var key=event.keyCode || event.which;
  	if (key==13){
  		tickN = 1;
		redraw = true;


        if (input.id == "CenterXText"){
        	center.x = parseFloat(input.value);
		}
        if (input.id == "CenterYText"){
        	center.y = parseFloat(input.value);
 		}
        if (input.id == "CenterZText"){
        	center.z = parseFloat(input.value);
 		}

        if (input.id == "CameraXText"){
        	camera.position.x = parseFloat(input.value) - center.x;
 		}
        if (input.id == "CameraYText"){
         	camera.position.y = parseFloat(input.value) - center.xy
 		}
        if (input.id == "CameraZText"){
         	camera.position.z = parseFloat(input.value) - center.z;
 		}


        if (input.id == "RotXText"){
        	camera.rotation.x = parseFloat(input.value)
 		}
        if (input.id == "RotYText"){
        	camera.rotation.y = parseFloat(input.value)
 		}
        if (input.id == "RotZText"){
        	camera.rotation.z = parseFloat(input.value)
 		}
		if (input.id == "RenderXText"){
			renderWidth = parseInt(input.value);
		}
		if (input.id == "RenderYText"){
			renderHeight = parseInt(input.value);
		}
	}

}

//function to check which types to plot
function checkPlotParts(checkbox)
{
	var type = checkbox.id.slice(-5); 
	if (type == 'Check'){	
		var pID = checkbox.id.slice(0,-5); // remove  "Check" from id
    	plotParts[pID] = false;
    	if (checkbox.checked){
       		plotParts[pID] = true;
    	}
    } 
    redraw = true;
}


var UIhidden = false;
function hideUI(x){
	x.classList.toggle("change");

	var UI = document.getElementById("UIhider");
	var UIc = document.getElementsByClassName("UIcontainer")[0];
	if (UIhidden){
		UI.setAttribute("style","visibility: visible;");
		UIc.setAttribute("style","border-style: solid;");
		UIhidden = false;
	} else {
		UI.setAttribute("style","visibility: hidden;");	
		UIc.setAttribute("style","border-style: none; margin-left:2px; margin-top:2px");
		UIhidden = true;	
	}
}



function getPi(pID){
	var i=0;
	for (i=0; i<partsKeys.length; i++){
		if (pID == partsKeys[i]){
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

    if (i < partsKeys.length-1){
	    pdiv = document.getElementsByClassName(partsKeys[i+1]+'Div')[0];
		if (gtoggle[pID]){
	    	pdiv.setAttribute("style","margin-top: "+ht + "px; ");
	    	gtoggle[pID] = false;	
	 	} else {
	 		pdiv.setAttribute("style","margin-top: 0 px; ");	
			gtoggle[pID] = true;
		}
	} else { // a bit clunky, but works with the current setup
		if (pID == "Camera"){
	    	c = document.getElementById("DecimationDiv");
	    	pb = 5;
			if (gtoggle[pID]){
				c.setAttribute('style','margin-top:'+(pb+ht-5)+'px');
				gtoggle[pID] = false;	

			} else {
				c.setAttribute('style','margin-top:'+pb+'px');	
				gtoggle[pID] = true;	
			}	
		} else { //for the last particle (to move the bottom of the container)
			c = document.getElementsByClassName("UIcontainer")[0];

			if (gtoggle[pID]){
				c.setAttribute('style','padding-bottom:'+(pb+ht-5)+'px');
				gtoggle[pID] = false;	

			} else {
				c.setAttribute('style','padding-bottom:'+pb+'px');	
				gtoggle[pID] = true;		
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
	for (var i=0; i<fkeys[p].length; i+=1){
		//console.log('hiding','#'+p+'_FK_'+fkeys[p][i]+'_END_Filter')
		d3.selectAll('#'+p+'_FK_'+fkeys[p][i]+'_END_Filter')
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
	velType[p] = selectValue;
	redraw = true;
};

function createUI(){
	console.log("Creating UI");

//change the hamburger to the X to start
 	var hamburger = document.getElementById('UItopbar');
 	//hide the UI
	hideUI(hamburger);
 	hamburger.classList.toggle("change");



	console.log(partsKeys)
	var UI = d3.select('#particleUI')
	    .selectAll('div')
		.data(partsKeys).enter()
		.append('div')
		.attr('class', function (d) { return "particleDiv "+d+"Div" }) //+ dropdown


	var i=0;
	var j=0;
	for (i=0; i<partsKeys.length; i++){
		d = partsKeys[i];

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
			.attr('onchange','checkPlotParts(this)');

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

		if (parts.options.UIdropdown[d] == 1){
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

			if (parts[d].Velocities != null){
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

				var selectVType = dVcontent.append('select')
					.attr('class','selectVelType')
					.attr('id',d+'_SelectVelType')
					.on('change',selectVelType)

				var options = selectVType.selectAll('option')
					.data(velopts).enter()
					.append('option')
					.text(function (d) { return d; });

				dheight += 30;
			}

	//this is dynamic, depending on what is in the data
	//create the filters
	//first count the available filters
			showfilts = [];
			for (j=0; j<fkeys[d].length; j++){
				var fk = fkeys[d][j]
				if (parts[d][fk] != null){
					showfilts.push(fk);
				}
			}
			nfilt = showfilts.length;

			if (nfilt > 0){
				dheight += 70;

				dropdown.append('hr')
					.style('margin','0')
					.style('border','1px solid #909090')

				var selectF = dropdown.append('div')
					.attr('style','margin:0px;  padding:5px; height:20px')
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
				for (j=0; j<fkeys[d].length; j++){
					var fk = fkeys[d][j]
					if (parts[d][fk] != null){


						dfilters = dropdown.append('div')
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
			dropdown.style('margin-top','-20px');

		}

/* for color pickers*/
//can I write this in d3? I don't think so.  It needs a jquery object
		$("#"+d+"ColorPicker").spectrum({
		    color: "rgba("+(Pcolors[d][0]*255)+","+(Pcolors[d][1]*255)+","+(Pcolors[d][2]*255)+","+Pcolors[d][3]+")",
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

		if (parts.options.UIcolorPicker[d] != 1){
			$("#"+d+"ColorPicker").spectrum({
			    color: "rgba("+(Pcolors[d][0]*255)+","+(Pcolors[d][1]*255)+","+(Pcolors[d][2]*255)+","+Pcolors[d][3]+")",
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


};
