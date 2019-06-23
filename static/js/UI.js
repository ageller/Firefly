//wait for all the input before loading
GUIParams.waitForInit = setInterval(function(){ 
	if (GUIParams.ready){
		clearInterval(GUIParams.waitForInit);
		createUI();
	}
}, 100);

//////////////
// sockets

//function to send events to the viewer
function sendToViewer(GUIinput){
	if (GUIParams.usingSocket){
		console.log('sending to viewer', GUIinput)
		socketParams.socket.emit('GUIinput',GUIinput);
	} else {
		setParams(GUIinput);
	}
}

function setGUIParamByKey(args){
	var value = args[0];
	var keyName = args[1];
	GUIParams[keyName] = JSON.parse(JSON.stringify(value));
	// if (typeof value == "object") {
	// 	GUIParams[keyName] = $.extend({}, value);
	// } else {
	// 	GUIParams[keyName] = value;
	// }
}

/////////////
// for the UI
function hideUI(x){
	if (!GUIParams.movingUI){

		x.classList.toggle("change");
		var UI = document.getElementById("UIhider");
		var UIc = document.getElementsByClassName("UIcontainer")[0];
		var UIt = document.getElementById("ControlsText");
		//var UIp = document.getElementsByClassName("particleDiv");
		var UIp = d3.selectAll('.particleDiv');
		if (GUIParams.UIhidden){
			UI.style.display = 'inline';
			//UI.style.visibility = 'visible';
			UIc.style.borderStyle = 'solid';
			UIc.style.marginLeft = '0';
			UIc.style.marginTop = '0';
			UIc.style.width = '300px';
			//UIp.style('width', '280px');
			UIt.style.opacity = 1;
		} else {
			UI.style.display = 'none';
			//UI.style.visibility = 'hidden';
			UIc.style.borderStyle = 'none';
			UIc.style.marginLeft = '2px';
			UIc.style.marginTop = '2px';
			UIc.style.width = '35px';
			//UIp.style('width', '35px');
			UIt.style.opacity = 0;
		}
		var UIt = document.getElementById("UItopbar");
		//UIt.style.display = 'inline';
		GUIParams.UIhidden = !GUIParams.UIhidden
	}
}



function getPi(pID){
	var i=0;
	keys = Object.keys(GUIParams.gtoggle)
	for (i=0; i<keys.length; i++){
		if (pID == keys[i]){
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
	var ht = parseFloat(ddiv.style.height.slice(0,-2)) + offset; //to take off "px"
	var pb = 0.;

	keys = Object.keys(GUIParams.gtoggle)
	pdiv = document.getElementById(keys[i+1]+'Div');
	if (i < keys.length-1){
		if (GUIParams.gtoggle[pID]){
			pdiv.style.marginTop = ht + "px";
		} else {
			pdiv.style.marginTop = "0px";
		}
	} else {
		//handle the last one differently
		c = document.getElementsByClassName("UIcontainer")[0];
		if (GUIParams.gtoggle[pID]){
			c.style.paddingBottom = (pb+ht-5)+'px';
		} else {
			c.style.paddingBottom = pb+'px';	
		}
	}

	GUIParams.gtoggle[pID] =! GUIParams.gtoggle[pID];	

}

/////////////////////////////////////////////
/////////////Generic single sliders
function setSingleSliderHandle(i, value, parent, varToSet, resetEnd) {
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
	//var p = parent.id.slice(0, -8);
	//varToSet[p] = value;
	varToSet[0] = value;
	sendToViewer({'setViewerParamByKey':varToSet})
}

// Listen to keydown events on the input field.
function handleSingleSliderText(input, handle, varToSet, resetEnd) {
	input.addEventListener('keydown', function( e ) {
		var value = Number(input.parent.noUiSlider.get());
		var steps = input.parent.noUiSlider.options.steps;
		var step = steps[handle];

		switch ( e.which ) {
			case 13:
				setSingleSliderHandle(handle, this.value, input.parent, varToSet, resetEnd);
				break;
			case 38:
				setSingleSliderHandle(handle, value + step, input.parent, varToSet, resetEnd);
				break;
			case 40:
				setSingleSliderHandle(handle, value - step, input.parent, varToSet, resetEnd);
				break;
		}
	});
}

//need to allow this to update at large numbers
function createSingleSlider(slider, text, args, varToSet, resetEnd=2){
	//resetEnd : 0=don't reset; 1=reset if value > max; 2=reset always

	if (slider != null && text != null){

		if (slider.noUiSlider) {
			slider.noUiSlider.destroy();
		}

		var sliderInputs = [text];
		sliderInputs[0].parent = slider;
		min = 0.;
		max = varToSet;

		noUiSlider.create(slider, args);

		slider.noUiSlider.on('update', function(values, handle) {
			sliderInputs[handle].value = values[handle];
			varToSet[0] = values[handle];
			sendToViewer({'setViewerParamByKey':varToSet})

		});

		sliderInputs.forEach(function(input, handle){
			handleSingleSliderText(input, handle, varToSet, resetEnd)
		});
	}
}
/////////////////////////////////////////////

// create the individual sliders
function createPSliders(){

	GUIParams.partsKeys.forEach(function(p,i){
		var initialValue = GUIParams.PsizeMult[p]; //I don't *think* I need to update this in GUI; it's just the initial value that matters, right?

		var args = {
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
		var text = document.getElementById(p+'_PMaxT');
		var varToSet = [initialValue, "PsizeMult",p];

		createSingleSlider(slider, text, args, varToSet)

		//reformat
		w = parseInt(d3.select('#'+p+'_PSlider').style('width').slice(0,-2));
		d3.select('#'+p+'_PSlider').select('.noUi-base').style('width',w-10+"px");
	});

}

function createNSliders(){
	GUIParams.partsKeys.forEach(function(p,i){
		var initialValue = GUIParams.plotNmax[p]; //I don't *think* I need to update this in GUI; it's just the initial value that matters, right?

		var args = {
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
		var text = document.getElementById(p+'_NMaxT');
		var varToSet = [initialValue, "plotNmax",p]

		createSingleSlider(slider, text, args, varToSet, 0)

		//reformat
		w = parseInt(d3.select('#'+p+'_NSlider').style('width').slice(0,-2));
		d3.select('#'+p+'_NSlider').select('.noUi-base').style('width',w-10+"px");
	});
}

//need to allow this to update at large numbers
function createDSlider(){

	var initialValue = GUIParams.decimate; //I don't *think* I need to update this in GUI; it's just the initial value that matters, right?

	var args = {
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
	var text = document.getElementById('DMaxT');
	var varToSet = [initialValue, "decimate"]

	createSingleSlider(slider, text, args, varToSet, 0)

	//reformat
	w = parseInt(d3.select("#DSlider").style("width").slice(0,-2));
	d3.select("#DSlider").select('.noUi-base').style('width',w-10+"px");


	//redefine the update function -- special case because it needs to talk to the Nslider as well
	slider.noUiSlider.on('update', function(values, handle) {
		var decf = GUIParams.decimate/parseFloat(values[handle]);
		//if (decf != 1){ //is this if statement really necessary?
			text.value = values[handle];
			varToSet[0] = values[handle];
			sendToViewer({'setViewerParamByKey':varToSet})
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

//////////////////////

function selectVelType() {
	var option = d3.select(this)
		.selectAll("option")
		.filter(function (d, i) { 
			return this.selected; 
	});
	selectValue = option.property('value');

	var p = this.id.slice(0,-14)
	sendToViewer({'setViewerParamByKey':[selectValue, "velType",p]})
}

function changeSnapSizes(){
	sendToViewer({'setViewerParamByKey':[window.innerWidth, 'renderWidth']});
	sendToViewer({'setViewerParamByKey':[window.innerHeight, 'renderHeight'] });
	document.getElementById("RenderXText").value = window.innerWidth;
	document.getElementById("RenderYText").value = window.innerHeight;
}
window.addEventListener('resize', changeSnapSizes);



//to move the GUI around on the screen
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
		GUIParams.movingUI = true;
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
		GUIParams.movingUI = false;
		document.removeEventListener('mouseup', closeDragElement);
		document.removeEventListener('mousemove', elementDrag);

	}
}

/////////////////////////// COLOR SCALE
//from https://www.w3schools.com/howto/howto_js_draggable.asp
function dragColorbarElement(elm, e) {
	var elmnt = document.getElementById("colorbar_container");
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
		GUIParams.movingUI = true;
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
		GUIParams.movingUI = false;
		document.removeEventListener('mouseup', closeDragElement);
		document.removeEventListener('mousemove', elementDrag);

	}
}

function defineColorbarContainer(particle_group_UIname){
	var text_height = 40;
	var container_margin = {"top":10,"side":15}
	var container_width = 300 
	var container_height = 30
	var cbar_bounds = {'width':container_width,'height':container_height}

	//trying to position this next to the UI, but where do these numbers come from?? both depend on the container_width and container_height...
	var container_top = 138; 
	var container_left = 188;

	var minmax = GUIParams.colormapVals[particle_group_UIname][GUIParams.ckeys[particle_group_UIname][GUIParams.colormapVariable[particle_group_UIname]]]
	var xmin = minmax[0]
	var xmax = minmax[1]


	var colorbar_container = d3.select("#colorbar_container")
		.html("")
		.attr('class', 'colorbar')
		.style("height",cbar_bounds.height+container_margin.top*2+text_height+"px")
	// contianer_margin : +*2 for the margins themselves, +1 for the offset of the content...?
		.style("width",cbar_bounds.width+container_margin.side*2+container_margin.side+"px")
		.style("top",container_top+"px")
		.style("left",container_left+"px")
		.style('position','absolute')
		.style('transform','rotate(90deg)')
		.attr('onmousedown','dragColorbarElement(this, event);');

		// this is the box that contains the colorbar image node, which fills this div
	var colorbar_box = colorbar_container.append('div')
		.attr('id','colorbar_box')
		.style("position","relative")
		.style("width",cbar_bounds.width+container_margin.side)
		.style("height",cbar_bounds.height)
		.style("left",container_margin.side+"px")
		.style("top","10px")
		.style("overflow","hidden")

	var svg = colorbar_container.append("svg")
		.attr("width", parseFloat(colorbar_box.style("width"))+2*container_margin.side) 
		.attr("height",text_height)
		//.style("background-color","green") // debug background from the axis ticks
		.style("position","relative")
		.style("top",container_margin.top+"px")
		.style("left",container_margin.side+"px")
		.append("g")
		.attr("class","cbar_svg")


	// set the ranges
	var x = d3.scaleLinear().range([parseFloat(colorbar_container.style('margin-left')), parseFloat(colorbar_box.style("width"))+parseFloat(colorbar_container.style('margin-left'))]);

	// Scale the range of the data
	//x.domain([xmin,xmax]);
	x.domain([xmax,xmin]); //because I'm rotating

	// Add the X Axis
	svg.append("g")
		.attr("class", "axis")
		.call(d3.axisBottom(x).ticks(10))
		.selectAll("text")  
			.style("text-anchor", "end")
			.attr("transform", "translate("+container_margin.side+",0)")
			.attr("dx", "-.8em")
			.attr("dy", ".15em")
			.attr("transform", "rotate(-65)")

	colorbar_container.append('div')
		.style("text-align","center")
		.style("position",'relative')
		.style("height",text_height + "px")
		.attr('class','colorbar_label') // hardcode background color in index.css, why isn't this inherited??

	colorbar_container.classed('hidden', true)
}

function fillColorbarContainer( particle_group_UIname){
	var n_colormap = 31-(GUIParams.colormap[particle_group_UIname]*32-0.5)

	//change the image
	var colorbar_box = d3.select("#colorbar_box");
	colorbar_box.html("<img src=static/textures/colormap.png"+ 
		" height="+ parseFloat(colorbar_box.style("height"))*32 +
		" width="+ parseFloat(colorbar_box.style("width")) +
		' style="'+
		' position:relative;'+
		' top:'+'-'+n_colormap*parseFloat(colorbar_box.style("height"))+'px;'+
		' transform:scaleX(-1);'+ //because I'm rotating the whole div
		'pointer-events: none' + // literally why
		'"' + 
		'draggable="false"'+ // is it so hard
		+'onmousedown="if (event.preventDefault) event.preventDefault()"'+ // to make it not drag the image
		"></img>")


	//update the axes
	var colorbar_container = d3.select('#colorbar_container');
	var minmax = GUIParams.colormapVals[particle_group_UIname][GUIParams.ckeys[particle_group_UIname][GUIParams.colormapVariable[particle_group_UIname]]]
	var xmin = minmax[0]
	var xmax = minmax[1]
	// set the ranges
	var x = d3.scaleLinear().range([parseFloat(colorbar_container.style('margin-left')), parseFloat(colorbar_box.style("width"))+parseFloat(colorbar_container.style('margin-left'))]);

	// Scale the range of the data
	//x.domain([xmin,xmax]);
	x.domain([xmax,xmin]); //because I'm rotating

	d3.select('#colorbar_container').select('.axis')
		.call(d3.axisBottom(x).ticks(10))
		.selectAll("text")  
			.style("text-anchor", "end")
			.attr("transform", "translate("+parseFloat(colorbar_container.style('margin-left'))+",0)")
			.attr("dx", "-.8em")
			.attr("dy", ".15em")
			.attr("transform", "rotate(-65)")

	//change the label
	var colorbar_label = particle_group_UIname + ' ' +  GUIParams.ckeys[particle_group_UIname][GUIParams.colormapVariable[particle_group_UIname]]
	d3.select('.colorbar_label').html(colorbar_label)



}

function selectColormapVariable() {
	var option = d3.select(this)
		.selectAll("option")
		.filter(function (d, i) { 
			return this.selected; 
	});
	selectValue = option.property('value');

	var p = this.id.slice(0,-14)

	for (var i=0; i<GUIParams.ckeys[p].length; i+=1){
		d3.selectAll('#'+p+'_CK_'+GUIParams.ckeys[p][i]+'_END_CMap')
			.style('display','none');
	}
	d3.selectAll('#'+p+'_CK_'+selectValue+'_END_CMap')
		.style('display','block');

	// update colormap variable
	GUIParams.colormapVariable[p] = GUIParams.ckeys[p].indexOf(selectValue);
	console.log(p, "colored by:", GUIParams.ckeys[p][GUIParams.colormapVariable[p]])

	// redraw particle type if colormap is on
	if (GUIParams.showColormap[p]){
		drawScene(pDraw = [p]);
		fillColorbarContainer(p);
	}
}

function selectColormap() {
	var option = d3.select(this)
		.selectAll("option")
		.filter(function (d, i) { 
			return this.selected; 
	});
	selectValue = option.property('value');

	var p = this.id.slice(0,-11)

	// update colormap
	GUIParams.colormap[p] = ((GUIParams.colormapList.indexOf(selectValue)) + 0.5) * (8/256);
	sendToViewer({'setViewerParamByKey':[GUIParams.colormap, "colormap"]});	

	console.log(p, " selected colormap:", GUIParams.colormapList[GUIParams.colormapList.indexOf(selectValue)], GUIParams.colormap[p])

	// redraw particle type if colormap is on
	if (GUIParams.showColormap[p]){
		//drawScene(pDraw = [p]);
		fillColorbarContainer(p);
	}
}

function updateUICenterText(){
	var el;
	if (GUIParams.useTrackball){
		el = document.getElementById("CenterXText");
		if (el != null) el.value = GUIParams.controlsTarget.x;

		el = document.getElementById("CenterYText");
		if (el != null) el.value = GUIParams.controlsTarget.y;
		
		el = document.getElementById("CenterZText");
		if (el != null) el.value = GUIParams.controlsTarget.z;
	} else {
		el = document.getElementById("CenterXText");
		if (el != null) el.value = GUIParams.cameraDirection.x + GUIParams.cameraPosition.x;

		el = document.getElementById("CenterYText");
		if (el != null) el.value = GUIParams.cameraDirection.y + GUIParams.cameraPosition.y;

		el = document.getElementById("CenterZText");
		if (el != null) el.value = GUIParams.cameraDirection.z + GUIParams.cameraPosition.z;		
	}
}

function updateUICameraText(){
	var el = document.getElementById("CameraXText");
	if (el != null) el.value = GUIParams.cameraPosition.x;
	
	el = document.getElementById("CameraYText"); 
	if (el != null) el.value = GUIParams.cameraPosition.y;
		
	el = document.getElementById("CameraZText"); 
	if (el != null) el.value = GUIParams.cameraPosition.z;
}

function updateUIRotText(){
	var el = document.getElementById("RotXText");
	if (el != null) el.value = GUIParams.cameraRotation.x;

	var el = document.getElementById("RotYText")
	if (el != null) el.value = GUIParams.cameraRotation.y;

	el = document.getElementById("RotZText")
	if (el != null) el.value = GUIParams.cameraRotation.z;
}
///////////////////////////////
////// all below needs work
//////////////////////////////


/////////////////////////////////////////////
// Filter sliders
function setFSliderHandle(i, value, parent, reset=false) {

	// I need a better way to do this!
	var fpos = parent.id.indexOf('_FK_');
	var epos = parent.id.indexOf('_END_');
	var sl = parent.id.length;
	var p = parent.id.slice(0, fpos - sl);
	var fk = parent.id.slice(fpos + 4, epos - sl);
	viewerParams.filterVals[p][fk][i] = parseFloat(value);

	//reset the filter limits if there is a text entry
	if (reset){
		var check = []
		check.push(viewerParams.filterLims[p][fk][0]);
		check.push(viewerParams.filterLims[p][fk][1]);
		check[i] = parseFloat(value);
		var fmin = parseFloat(check[0]);
		var fmax = parseFloat(check[1]);
		var max = parseFloat(parent.noUiSlider.options.range.max[0]);
		var min = parseFloat(parent.noUiSlider.options.range.min[0]);

		var nf = parseFloat(value)/ (Math.round(1000.*viewerParams.filterLims[p][fk][i])/1000.);
		viewerParams.SliderFinputs[p][fk][i].value = value;
		viewerParams.filterLims[p][fk][i] = parseFloat(value);
		// if (Math.abs(1. - nf) > 0.001 && ! viewerParams.reset){
		// 	//drawScene(pDraw = [p]);
		// }

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
	viewerParams.updateFilter[p] = true;
}

// Listen to keydown events on the input field.
function handleFSliderText(input, handle) {
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
}

function createFilterSliders(){

	var i = 0;
	var j = 0;
	for (i=0; i<viewerParams.partsKeys.length; i++){
		p = viewerParams.partsKeys[i];
		if (viewerParams.parts.options.UIdropdown[p]){

			viewerParams.SliderF[p] = {};
			viewerParams.SliderFmin[p] = {};
			viewerParams.SliderFmax[p] = {};
			viewerParams.SliderFinputs[p] = {};

			for (j=0; j<viewerParams.fkeys[p].length; j++){
				var fk = viewerParams.fkeys[p][j]
				viewerParams.SliderF[p][fk] = document.getElementById(p+'_FK_'+fk+'_END_FilterSlider');
				viewerParams.SliderFmin[p][fk] = document.getElementById(p+'_FK_'+fk+'_END_FilterMinT');
				viewerParams.SliderFmax[p][fk] = document.getElementById(p+'_FK_'+fk+'_END_FilterMaxT');
				if (viewerParams.SliderF[p][fk] != null && viewerParams.SliderFmin[p][fk] != null && viewerParams.SliderFmax[p][fk] != null && viewerParams.filterLims[p][fk] != null){
					if (viewerParams.SliderF[p][fk].noUiSlider) {
						viewerParams.SliderF[p][fk].noUiSlider.destroy();
					}
					viewerParams.SliderFinputs[p][fk] = [viewerParams.SliderFmin[p][fk], viewerParams.SliderFmax[p][fk]];
					viewerParams.SliderFinputs[p][fk][0].parent = viewerParams.SliderF[p][fk];
					viewerParams.SliderFinputs[p][fk][1].parent = viewerParams.SliderF[p][fk];
					min = parseFloat(viewerParams.filterLims[p][fk][0]);
					max = parseFloat(viewerParams.filterLims[p][fk][1]);

					noUiSlider.create(viewerParams.SliderF[p][fk], {
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
					viewerParams.SliderF[p][fk].noUiSlider.on('update', function(values, handle) {
						var fpos = this.target.id.indexOf('_FK_');
						var epos = this.target.id.indexOf('_END_');
						var sl = this.target.id.length;
						var pp = this.target.id.slice(0, fpos - sl);
						var ffk = this.target.id.slice(fpos + 4, epos - sl);


						var nf = parseFloat(values[handle])/ (Math.round(1000.*viewerParams.filterVals[pp][ffk][handle])/1000.);
						viewerParams.SliderFinputs[pp][ffk][handle].value = values[handle];
						viewerParams.filterVals[pp][ffk][handle] = parseFloat(values[handle]);
						// if (Math.abs(1. - nf) > 0.001 && ! viewerParams.reset){
						// 	drawScene(pDraw = [pp]);
						// }


						viewerParams.updateFilter[pp] = true;
					});

					viewerParams.SliderFinputs[p][fk].forEach(handleFSliderText);
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
// Colormap sliders
function setCMapSliderHandle(i, value, parent, reset=false) {

	// I need a better way to do this!
	var cpos = parent.id.indexOf('_CK_');
	var epos = parent.id.indexOf('_END_');
	var sl = parent.id.length;
	var p = parent.id.slice(0, cpos - sl);
	var ck = parent.id.slice(cpos + 4, epos - sl);
	GUIParams.colormapVals[p][ck][i] = parseFloat(value);

	//reset the color limits if there is a text entry
	if (reset){
		var check = []
		check.push(viewerParams.colormapLims[p][ck][0]);
		check.push(viewerParams.colormapLims[p][ck][1]);
		check[i] = parseFloat(value);
		var max = parseFloat(parent.noUiSlider.options.range.max[0]);
		var min = parseFloat(parent.noUiSlider.options.range.min[0]);

		var nf = parseFloat(value)/ (Math.round(1000.*viewerParams.colormapLims[p][ck][i])/1000.);
		viewerParams.SliderCMapinputs[p][ck][i].value = value;
		viewerParams.colormapLims[p][ck][i] = parseFloat(value);
		// if (Math.abs(1. - nf) > 0.001 && ! viewerParams.reset){
		// 	drawScene(pDraw = [p]);
		// }

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
	viewerParams.updateColormap[p] = true;
	viewerParams.updateFilter[p] = true;
	if (GUIParams.showColormap[p]){
		fillColorbarContainer(p);
	}
	//fillColorbarContainer();
}

// Listen to keydown events on the input field.
function handleCMapSliderText(input, handle) {
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
				setCMapSliderHandle(handle, this.value, input.parent, reset=true);
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
					setCMapSliderHandle(handle, value + position, input.parent, reset=false);
				}
				break;
			case 40:
				position = step[0];
				if ( position === false ) {
					position = 1;
				}
				if ( position !== null ) {
					setCMapSliderHandle(handle, value - position, input.parent, reset=false);
				}
				break;
		}
	});
}

function createCMapSliders(){

	var i = 0;
	var j = 0;
	for (i=0; i<viewerParams.partsKeys.length; i++){
		p = viewerParams.partsKeys[i];
		if (viewerParams.parts.options.UIdropdown[p]){

			viewerParams.SliderCMap[p] = {};
			viewerParams.SliderCMapmin[p] = {};
			viewerParams.SliderCMapmax[p] = {};
			viewerParams.SliderCMapinputs[p] = {};

			for (j=0; j<GUIParams.ckeys[p].length; j++){
				var ck = GUIParams.ckeys[p][j]
				viewerParams.SliderCMap[p][ck] = document.getElementById(p+'_CK_'+ck+'_END_CMapSlider');
				viewerParams.SliderCMapmin[p][ck] = document.getElementById(p+'_CK_'+ck+'_END_CMapMinT');
				viewerParams.SliderCMapmax[p][ck] = document.getElementById(p+'_CK_'+ck+'_END_CMapMaxT');
				if (viewerParams.SliderCMap[p][ck] != null && viewerParams.SliderCMapmin[p][ck] != null && viewerParams.SliderCMapmax[p][ck] != null && viewerParams.colormapLims[p][ck] != null){
					if (viewerParams.SliderCMap[p][ck].noUiSlider) {
						viewerParams.SliderCMap[p][ck].noUiSlider.destroy();
					}
					viewerParams.SliderCMapinputs[p][ck] = [viewerParams.SliderCMapmin[p][ck], viewerParams.SliderCMapmax[p][ck]];
					viewerParams.SliderCMapinputs[p][ck][0].parent = viewerParams.SliderCMap[p][ck];
					viewerParams.SliderCMapinputs[p][ck][1].parent = viewerParams.SliderCMap[p][ck];
					min = parseFloat(viewerParams.colormapLims[p][ck][0].toFixed(3));
					max = parseFloat(viewerParams.colormapLims[p][ck][1].toFixed(3));

					noUiSlider.create(viewerParams.SliderCMap[p][ck], {
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
					viewerParams.SliderCMap[p][ck].noUiSlider.on('update', function(values, handle) {
						var cpos = this.target.id.indexOf('_CK_');
						var epos = this.target.id.indexOf('_END_');
						var sl = this.target.id.length;
						var pp = this.target.id.slice(0, cpos - sl);
						var ffk = this.target.id.slice(cpos + 4, epos - sl);


						var nf = parseFloat(values[handle])/ (Math.round(1000.*GUIParams.colormapVals[pp][ffk][handle])/1000.);
						viewerParams.SliderCMapinputs[pp][ffk][handle].value = values[handle];
						GUIParams.colormapVals[pp][ffk][handle] = parseFloat(values[handle]);
						if (GUIParams.showColormap[pp]){
							fillColorbarContainer(pp);
						}
						//fillColorbarContainer();

						// if (Math.abs(1. - nf) > 0.001 && ! viewerParams.reset){
						// 	drawScene(pDraw = [pp]);
						// }


						//because we are now redrawing each time, we do not need to do this
						viewerParams.updateColormap[pp] = true;
						viewerParams.updateFilter[pp] = true;
					});

					viewerParams.SliderCMapinputs[p][ck].forEach(handleCMapSliderText);
				}
				var w = parseInt(d3.select('.CMapClass').style("width").slice(0,-2));
				d3.select('#'+p+'_CK_'+ck+'_END_CMapSlider').select('.noUi-base').style('width',w-10+"px");
				d3.select('#'+p+'_CK_'+ck+'_END_CMapSlider').select('.noUi-connect').style('border-radius','6px 0px 0px 6px');
				d3.select('#'+p+'_CK_'+ck+'_END_CMapSlider').select('.noUi-handle-lower').style('border-radius','6px 0px 0px 6px');

			}
		}
	}
}





/////////////////////////////////////////////
// Friction slider
function setCFSliderHandle(i, value, parent) {
	value = Math.min(Math.max(0., parseFloat(value)),1.);

	parent.noUiSlider.set(value);
	if (viewerParams.useTrackball){
		viewerParams.controls.dynamicDampingFactor = value;
	} else {
		viewerParams.controls.movementSpeed = 1. - Math.pow(value, viewerParams.flyffac);

	}
	viewerParams.friction = value;

}

// Listen to keydown events on the input field.
function handleCFSliderText(input, handle) {
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
}

function createCFslider(){

	viewerParams.SliderCF = document.getElementById('CFSlider');
	viewerParams.SliderCFmax = document.getElementById('CFMaxT');
	if (viewerParams.SliderCF != null && viewerParams.SliderCFmax != null){
		if (viewerParams.SliderCF.noUiSlider) {
			viewerParams.SliderCF.noUiSlider.destroy();
		}
		viewerParams.SliderCFInputs = [viewerParams.SliderCFmax];
		viewerParams.SliderCFInputs[0].parent = viewerParams.SliderCF;
		min = 0.;
		max = 1.;

		noUiSlider.create(viewerParams.SliderCF, {
			start: [viewerParams.friction],
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

		viewerParams.SliderCF.noUiSlider.on('update', function(values, handle) {
			viewerParams.SliderCFInputs[handle].value = values[handle];
			var value = Math.min(Math.max(0., parseFloat(values[handle])),1.);
			if (viewerParams.useTrackball){
				viewerParams.controls.dynamicDampingFactor = value;
			} else {
				viewerParams.controls.movementSpeed = 1. - Math.pow(value, viewerParams.flyffac);
			}
			viewerParams.friction = value;
		});

		viewerParams.SliderCFInputs.forEach(handleCFSliderText);
	}
	w = parseInt(d3.select("#CFSlider").style("width").slice(0,-2));
	d3.select("#CFSlider").select('.noUi-base').style('width',w-10+"px");
}



/////////////////////////////////////////////
// Stereo Separation slider

function setSSSliderHandle(i, value, parent) {
	var max = parent.noUiSlider.options.range.max[i];
	if (value > max){
		viewerParams.stereoSepMax = parseFloat(value);
		parent.noUiSlider.updateOptions({
			range: {
				'min': [0],
				'max': [parseFloat(value)]
			}
		});
	}
	value = Math.min(Math.max(0., parseFloat(value)),viewerParams.stereoSepMax);

	parent.noUiSlider.set(value);
	viewerParams.effect.setEyeSeparation(value);
	viewerParams.stereoSep = value;


}

// Listen to keydown events on the input field.
function handleSSSliderText(input, handle) {
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
}

function createSSslider(){

	viewerParams.sliderSS = document.getElementById('SSSlider');
	viewerParams.sliderSSmax = document.getElementById('SSMaxT');
	if (viewerParams.sliderSS != null && viewerParams.sliderSSmax != null){
		if (viewerParams.sliderSS.noUiSlider) {
			viewerParams.sliderSS.noUiSlider.destroy();
		}
		viewerParams.sliderSSInputs = [viewerParams.sliderSSmax];
		viewerParams.sliderSSInputs[0].parent = viewerParams.sliderSS;
		min = 0.;
		max = parseFloat(viewerParams.stereoSepMax);

		noUiSlider.create(viewerParams.sliderSS, {
			start: [viewerParams.stereoSep],
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

		viewerParams.sliderSS.noUiSlider.on('update', function(values, handle) {

			viewerParams.sliderSSInputs[handle].value = values[handle];

			var value = Math.min(Math.max(0., parseFloat(values[handle])),viewerParams.stereoSepMax);
			viewerParams.effect.setEyeSeparation(value);
			viewerParams.stereoSep = value;
		});

		viewerParams.sliderSSInputs.forEach(handleSSSliderText);
	}
	w = parseInt(d3.select("#SSSlider").style("width").slice(0,-2));
	d3.select("#SSSlider").select('.noUi-base').style('width',w-10+"px");
}








function selectFilter() {
	var option = d3.select(this)
		.selectAll("option")
		.filter(function (d, i) { 
			return this.selected; 
	});
	selectValue = option.property('value');

	var p = this.id.slice(0,-13)

	// store the "currently shown" filter for later use
	console.log("setting the current filter value to",selectValue)
	sendToViewer({'setViewerParamByKey':[selectValue, 'parts',p,'currentlyShownFilter']})

	//console.log("in selectFilter", selectValue, this.id, p)
	for (var i=0; i<viewerParams.fkeys[p].length; i+=1){
		//console.log('hiding','#'+p+'_FK_'+viewerParams.fkeys[p][i]+'_END_Filter')
		d3.selectAll('#'+p+'_FK_'+viewerParams.fkeys[p][i]+'_END_Filter')
			.style('display','none');
		d3.selectAll('#'+p+'_FK_'+viewerParams.fkeys[p][i]+'_END_InvertFilterCheckBox')
			.style('display','none');
		d3.selectAll('#'+p+'_FK_'+viewerParams.fkeys[p][i]+'_END_InvertFilterCheckBoxLabel')
			.style('display','none');
	}
	//console.log('showing', '#'+p+'_FK_'+selectValue+'_END_Filter')
	d3.selectAll('#'+p+'_FK_'+selectValue+'_END_Filter')
		.style('display','block');
	d3.selectAll('#'+p+'_FK_'+selectValue+'_END_InvertFilterCheckBox')
		.style('display','inline-block');
	d3.selectAll('#'+p+'_FK_'+selectValue+'_END_InvertFilterCheckBoxLabel')
		.style('display','inline-block');
}






function createUI(){
	console.log("Creating UI");
		
		var use_color_id = null

//change the hamburger to the X to start
	if (! viewerParams.reset){

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

	 }

	//set the gtoggle Object (in correct order)
	GUIParams.gtoggle.dataControls = true;
	GUIParams.gtoggle.cameraControls = true;
	for (i=0; i<viewerParams.partsKeys.length; i++){
		d = viewerParams.partsKeys[i];
		GUIParams.gtoggle[d] = true;
	}


	var UI = d3.select('#particleUI')
	var UIparts = UI.selectAll('div');

	////////////////////////
	//generic dropdown for "data" controls"
	var m1 = UI.append('div')
		.attr('id','dataControlsDiv')
		.attr('class','particleDiv');
	m1.append('div')
		.attr('class','pLabelDiv')
		.style('width', '215px')
		.text('Data Controls')
	m1.append('button')
		.attr('class','dropbtn')
		.attr('id','dataControlsDropbtn')
		.attr('onclick','showFunction(this);')
		.html('&#x25BC');
	var m2 = m1.append('div')
		.attr('class','dropdown-content')
		.attr('id','dataControlsDropdown')
		.style('height','220px');

	//decimation
	var dec = m2.append('div')
		.attr('id', 'decimationDiv')
		.style('width','270px')
		.style('margin-left','5px')
		.style('margin-top','10px')
		.style('display','inline-block')
	dec.append('div')
		.attr('class','pLabelDiv')
		.style('width','85')
		.style('display','inline-block')
		.text('Decimation');
	dec.append('div')
		.attr('class','NSliderClass')
		.attr('id','DSlider')
		.style('margin-left','40px')
		.style('width','158px');
	dec.append('input')
		.attr('class','NMaxTClass')
		.attr('id','DMaxT')
		.attr('type','text')
		.style('left','255px')
		.style('width','30px');

	//fullscreen button
	m2.append('div').attr('id','fullScreenDiv')
		.append('button')
		.attr('id','fullScreenButton')
		.attr('class','button')
		.style('width','280px')
		.attr('onclick','fullscreen();')
		.append('span')
			.text('Fullscreen');

	//snapshots
	var snap = m2.append('div')
		.attr('id','snapshotDiv')
		.attr('class', 'button-div')
		.style('width','280px')
	snap.append('button')
		.attr('class','button')
		.style('width','140px')
		.style('padding','5px')
		.style('margin',0)
		.on('click',function(){
			sendToViewer({'renderImage':null});
		})
		.append('span')
			.text('Take Snapshot');

	snap.append('input')
		.attr('id','RenderXText')
		.attr('type', 'text')
		.attr('value',viewerParams.renderWidth)
		.attr('autocomplete','off')
		.attr('class','pTextInput')
		.style('width','50px')
		.style('margin-top','5px')
		.style('margin-right','5px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer({'checkText':this});
		})
	snap.append('input')
		.attr('id','RenderYText')
		.attr('type', 'text')
		.attr('value',viewerParams.renderHeight)
		.attr('autocomplete','off')
		.attr('class','pTextInput')
		.style('width','50px')
		.style('margin-top','5px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer({'checkText':this});
		})

	//save preset button
	m2.append('div').attr('id','savePresetDiv')
		.append('button')
		.attr('id','savePresetButton')
		.attr('class','button')
		.style('width','280px')
		.on('click',function(){
			sendToViewer({'savePreset':null});
		})
		.append('span')
			.text('Save Preset');

	//reset to default button
	m2.append('div').attr('id','resetDiv')
		.append('button')
		.attr('id','resetButton')
		.attr('class','button')
		.style('width','134px')
		.on('click',function(){
			sendToViewer({'resetToOptions':null});
		})
		.append('span')
			.text('Reset to Default');
	//reset to preset button
	d3.select('#resetDiv')
		.append('button')
		.attr('id','resetPButton')
		.attr('class','button')
		.style('width','140px')
		.style('left','134px')
		.style('margin-left','0px')
		.on('click',function(){
			sendToViewer({'loadPreset':null});
		})
		.append('span')
			.text('Reset to Preset');

	//load new data button
	m2.append('div').attr('id','loadNewDataDiv')
		.append('button')
		.attr('id','loadNewDataButton')
		.attr('class','button')
		.style('width','280px')
		.on('click',function(){
			sendToViewer({'loadNewData':null});
		})
		.append('span')
			.text('Load New Data');


	/////////////////////////
	//camera
	var c1 = UI.append('div')
		.attr('id','cameraControlsDiv')
		.attr('class','particleDiv');
	c1.append('div')
		.attr('class','pLabelDiv')
		.style('width', '215px')
		.text('Camera Controls')
	c1.append('button')
		.attr('class','dropbtn')
		.attr('id','cameraControlsDropbtn')
		.attr('onclick','showFunction(this);')
		.html('&#x25BC');
	var c2 = c1.append('div')
		.attr('class','dropdown-content')
		.attr('id','cameraControlsDropdown')
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
		.style('width','40px')
		.style('margin-right','8px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer({'checkText':this});
		})
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','CenterYText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width','40px')
		.style('margin-right','8px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer({'checkText':this});
		})
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','CenterZText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width','40px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer({'checkText':this});
		})
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
		.on('change',function(){
			sendToViewer({'checkCenterLock':this});
		})
	if (viewerParams.useTrackball){
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
		.style('width','40px')
		.style('margin-right','8px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer({'checkText':this});
		})
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','CameraYText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width','40px')
		.style('margin-right','8px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer({'checkText':this});
		})
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','CameraZText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width','40px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer({'checkText':this});
		})
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
		.style('width','40px')
		.style('margin-right','8px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer({'checkText':this});
		})
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','RotYText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width','40px')
		.style('margin-right','8px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer({'checkText':this});
		})
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','RotZText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width','40px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer({'checkText':this});
		})
	//buttons
	c3 = c2.append('div')
		.attr('class','pLabelDiv')
		.style('width','280px');
	c3.append('button')
		.attr('id','CameraSave')
		.attr('class','button centerButton')
		.style('margin',0)
		.style('margin-right','8px')
		.style('padding','2px')
		.on('click',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer({'checkText':this});
		})
		.append('span')
			.text('Save');
	c3.append('button')
		.attr('id','CameraReset')
		.attr('class','button centerButton')
		.style('margin',0)
		.style('margin-right','8px')
		.style('padding','2px')
		.on('click',function(){
			sendToViewer({'resetCamera':null});
		})
		.append('span')
			.text('Reset');
		c3.append('button')
		.attr('id','CameraRecenter')
		.attr('class','button centerButton')
		.style('margin',0)
		.style('padding','2px')
		.on('click',function(){
			sendToViewer({'recenterCamera':null});
		})
		.append('span')
			.text('Recenter');
	//camera friction
	c3 = c2.append('div')
		.attr('class','pLabelDiv')
		.attr('id','FrictionDiv')
		// .style('background-color','#808080')
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
		// .style('background-color','#808080')
		.style('width','280px')
		.style('padding-top','10px');
	c3.append('div')
		.style('width','55px')
		.style('display','inline-block')
		.text('Stereo');
	c3.append('input')
		.attr('id','StereoCheckBox')
		.attr('type','checkbox')
		.attr('autocomplete','false')
		.on('change',function(){
			sendToViewer({'checkStereoLock':this});
		});
	if (viewerParams.useStereo){
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



	///////////////////////
	//setup for all the particle UI bits 
	UIparts.data(viewerParams.partsKeys).enter()
		.append('div')
		.attr('class', function (d) { return "particleDiv "+d+"Div" }) //+ dropdown
		.attr('id', function (d) { return d+"Div" }) //+ dropdown


	var i=0;
	var j=0;
	for (i=0; i<viewerParams.partsKeys.length; i++){
		d = viewerParams.partsKeys[i];

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
			.on('change',function(){
				sendToViewer({'checkshowParts':this});
			})
		if (!viewerParams.showParts[d]){
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

		if (viewerParams.parts.options.UIdropdown[d]){
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

			var dheight = 45;

	//for velocity vectors

			if (viewerParams.parts[d].Velocities != null){
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
					.on('change',function(){
						sendToViewer({'checkVelBox':this});
					})
				if (viewerParams.showVel[d]){
					elm = document.getElementById(d+'velCheckBox');
					elm.checked = true;
					elm.value = true;
				} 
				var selectVType = dVcontent.append('select')
					.attr('class','selectVelType')
					.attr('id',d+'_SelectVelType')
					.on('change',selectVelType)

				var options = selectVType.selectAll('option')
					.data(Object.keys(viewerParams.velopts)).enter()
					.append('option')
						.text(function (d) { return d; });
				elm = document.getElementById(d+'_SelectVelType');
				elm.value = viewerParams.velType[d];

				dheight += 30;
			}

			// colormap functionality
			showcolor = [];

			for (j=0; j<GUIParams.ckeys[d].length; j++){
				var ck = GUIParams.ckeys[d][j]
				if (viewerParams.parts[d][ck] != null){
					showcolor.push(ck);
				}
			}
			ncolor = showcolor.length;


			if (ncolor > 0){
								use_color_id = d
				dheight += 50;

				dropdown.append('hr')
					.style('margin','0')
					.style('border','1px solid #909090')

				var ColorDiv = dropdown.append('div')
					.attr('style','margin:0px;  padding:5px; height:50px')

				ColorDiv.append('label')
				.attr('for',d+'colorCheckBox')
				.text('Colormap');

				ColorDiv.append('input')
					.attr('id',d+'colorCheckBox')
					.attr('value','false')
					.attr('type','checkbox')
					.attr('autocomplete','off')
					.on('change',function(){
						sendToViewer({'checkColormapBox':this});
					})

				if (GUIParams.showColormap[d]){
					elm = document.getElementById(d+'colorCheckBox');
					elm.checked = true;
					elm.value = true;
					fillColorbarContainer(d);
				} 

				// dropdown to select colormap
				var selectCMap = ColorDiv.append('select')
					.attr('class','selectCMap')
					.attr('id',d+'_SelectCMap')
					.on('change', selectColormap)

				var options = selectCMap.selectAll('option')
					.data(GUIParams.colormapList).enter()
					.append('option')
						.text(function (x) { return x; });
				elm = document.getElementById(d+'_SelectCMap');

				// dropdown to select colormap variable
				var selectCMapVar = ColorDiv.append('select')
					.attr('class','selectCMapVar')
					.attr('id',d+'_SelectCMapVar')
					.on('change',selectColormapVariable)

				var options = selectCMapVar.selectAll('option')
					.data(GUIParams.ckeys[d]).enter()
					.append('option')
						.text(function (x) { return x; });
				elm = document.getElementById(d+'_SelectCMapVar');

				// sliders for colormap limits
				var colormapn = 0;
				for (j=0; j<GUIParams.ckeys[d].length; j++){
					var ck = GUIParams.ckeys[d][j]
					if (viewerParams.parts[d][ck] != null){

						colormapsliders = ColorDiv.append('div')
							.attr('id',d+'_CK_'+ck+'_END_CMap')
							.attr('class','CMapClass')

						colormapsliders.append('div')
							.attr('class','CMapClassLabel')

						colormapsliders.append('div')
							.attr('id',d+'_CK_'+ck+'_END_CMapSlider')
							.style("margin-top","-1px")

						colormapsliders.append('input')
							.attr('id',d+'_CK_'+ck+'_END_CMapMinT')
							.attr('class','CMapMinTClass')
							.attr('type','text');

						colormapsliders.append('input')
							.attr('id',d+'_CK_'+ck+'_END_CMapMaxT')
							.attr('class','CMapMaxTClass')
							.attr('type','text');

						colormapn += 1;
					}
					if (colormapn > 1){
						d3.selectAll('#'+d+'_CK_'+ck+'_END_CMap')
							.style('display','none');
					}
				}
			}

	//this is dynamic, depending on what is in the data
	//create the filters
	//first count the available filters
			showfilts = [];
			for (j=0; j<viewerParams.fkeys[d].length; j++){
				var fk = viewerParams.fkeys[d][j]
				if (viewerParams.parts[d][fk] != null){
					showfilts.push(fk);
				}
			}
			nfilt = showfilts.length;

			if (nfilt > 0){
				dheight += 80;

				dropdown.append('hr')
					.style('margin','0')
					.style('border','1px solid #909090')

				var filterDiv = dropdown.append('div')
					.attr('style','margin:0px;  padding:5px; height:45px')

				var selectF = filterDiv.append('div')
					//.attr('style', 'height:20px')
					.attr('style','height:20px; display:inline-block')
					.html('Filters &nbsp')	
					.append('select')
					.attr('style','width:160px')
					.attr('class','selectFilter')
					.attr('id',d+'_SelectFilter')
					.on('change',selectFilter)

				var options = selectF.selectAll('option')
					.data(showfilts).enter()
					.append('option')
					.text(function (d) { return d; });

				var filtn = 0;
				for (j=0; j<viewerParams.fkeys[d].length; j++){
					var fk = viewerParams.fkeys[d][j]
					if (viewerParams.parts[d][fk] != null){


						invFilter = filterDiv.append('label')
							.attr('for',d+'_FK_'+fk+'_'+'InvertFilterCheckBox')
							.attr('id',d+'_FK_'+fk+'_END_InvertFilterCheckBoxLabel')
							.style('display','inline-block')
							.style('margin-left','160px')
							.text('Invert');

						invFilter.append('input')
							.attr('id',d+'_FK_'+fk+'_END_InvertFilterCheckBox')
							.attr('value','false')
							.attr('type','checkbox')
							.attr('autocomplete','off')
							.on('change',function(){
								sendToViewer({'checkInvertFilterBox':this});
							})

						dfilters = filterDiv.append('div')
							.attr('id',d+'_FK_'+fk+'_END_Filter')
							.attr('class','FilterClass')
							.style('display','block');

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
						d3.selectAll('#'+d+'_FK_'+fk+'_END_InvertFilterCheckBox')
							.style('display','none');
						d3.selectAll('#'+d+'_FK_'+fk+'_END_InvertFilterCheckBoxLabel')
							.style('display','none');
					}
				}

				playback = filterDiv.append('label')
					.attr('for',d+'_'+'PlaybackLabel')
					.attr('id',d+'_PlaybackLabel')
					.style('display','inline-block')
					.style('margin-top','30px')
					.text('Playback:');
				playback.append('input')
					.attr('id',d+'_PlaybackCheckbox')
					.attr('value','false')
					.attr('type','checkbox')
					.attr('autocomplete','off')
					.style('display','inline-block')
					.on('change',function(){
						sendToViewer({'checkPlaybackFilterBox':this});
					})



				

			} 
			
			dropdown.style('height',dheight+'px');

		}

/* for color pickers*/
//can I write this in d3? I don't think so.  It needs a jquery object
		$("#"+d+"ColorPicker").spectrum({
			color: "rgba("+(viewerParams.Pcolors[d][0]*255)+","+(viewerParams.Pcolors[d][1]*255)+","+(viewerParams.Pcolors[d][2]*255)+","+viewerParams.Pcolors[d][3]+")",
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
				sendToViewer({'checkColor':[this, color]});
			},
		});

		if (!viewerParams.parts.options.UIcolorPicker[d]){
			$("#"+d+"ColorPicker").spectrum({
				color: "rgba("+(viewerParams.Pcolors[d][0]*255)+","+(viewerParams.Pcolors[d][1]*255)+","+(viewerParams.Pcolors[d][2]*255)+","+viewerParams.Pcolors[d][3]+")",
				disabled: true,
			});		
		}

	}

// create all the noUISliders
	createPSliders();
	createNSliders();
	createDSlider();
	createCFslider();
	createSSslider();
	createFilterSliders();
	createCMapSliders();
	updateUICenterText();
	updateUICameraText();
	updateUIRotText();

	sendToViewer({'applyUIoptions':null});



	viewerParams.haveUI = true;

	//hide the UI initially
	if (!viewerParams.reset){
		var hamburger = document.getElementById('UItopbar');
		hideUI(hamburger);
		hamburger.classList.toggle("change");
	}

	//create the colorbar container
		if (use_color_id != null){
			defineColorbarContainer(use_color_id)
			if (GUIParams.showColormap[use_color_id]){
					fillColorbarContainer(use_color_id);
			}
		}
}










