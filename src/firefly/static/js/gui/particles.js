function defineGUIParticleState(){
	//I will add all the possible windows in here, though some may not be used (based on data and settings)
	GUIParams.partsKeys.forEach(function(p){
		GUIParams.GUIState.main.particles[p] = {
			'current':'base',
			'children':['base'],
			'url':'',
			'base':{
				'name':p,
				'id' : p+'Base',
				'onoff':{
					'id':'onoff',
					'builder':createParticleOnOffSegment
				},
				'sizeSlider':{
					'id':p+'sizeSlider',
					'builder':createParticleSizeSliderSegment
				},
				'colorPicker':{
					'id':p+'colorPicker',
					'builder':createParticleColorPickerSegment
				},
				'dropdown':{
					'name':p,
					'id':p+'dropdown',
					'builder':createParticleDropdown,
					'general': {
						'id' : p+'general',
						'builder' : createParticleControlsWindow,
						'octreeClearMemory':{
							'id':'octreeClearMemory',
							'builder':createParticleClearOctreeMemorySegment
						},
						'blendingModeSelectors':{
							'id':'blendingModeSelectors',
							'builder':createParticleBlendingModeSelectorsSegment
						},
						'maxSlider':{
							'id':'maxSlider',
							'builder':createParticleMaxSliderSegment
						},
						'radiusVariableSelector':{
							'id':'radiusVariableSelector',
							'builder':createParticleRadiusVariableSelectorSegment
						}
					}
				}
			}
		};

		if (GUIParams.haveVelocities[p]){
			GUIParams.GUIState.main.particles[p].base.dropdown.velocities = {
				'id' : p+'velocities',
				'builder' : createParticleControlsWindow,
				'velocityCheckBox':{
					'id':'velocityCheckBox',
					'builder':createParticleVelocityCheckBoxSegment
				},
				'velocityWidthSlider':{
					'id':'velocityWidthSlider',
					'builder':createParticleVelocityWidthSliderSegment
				},
				'velocityGradientCheckBox':{
					'id':'velocityGradientCheckBox',
					'builder':createParticleVelocityGradientCheckBoxSegment
				},
				'velocityAnimatorCheckBox':{
					'id':'velocityAnimatorCheckBox',
					'builder':createParticleVelocityAnimatorCheckBoxSegment
				},
				'velocityAnimatorTextBoxes':{
					'id':'velocityAnimatorTextBoxes',
					'builder':createParticleVelocityAnimatorTextBoxesSegment
				}
			};
		}

		if (GUIParams.haveColormap[p]){
			GUIParams.GUIState.main.particles[p].base.dropdown.colormap = {
				'id' : p+'colormap',
				'builder' : createParticleControlsWindow,
				'colormapCheckBox':{
					'id':'colormapCheckBox',
					'builder':createParticleColormapCheckBoxSegment
				},
				'colormapSelector':{
					'id':'colormapSelector',
					'builder':createParticleColormapSelectorSegment
				},
				'colormapVariableSelector':{
					'id':'colormapVariableSelector',
					'builder':createParticleColormapVariableSelectorSegment
				},
				'colormapSliders':{
					'id':'colormapSliders',
					'builder':createParticleColormapSlidersSegment
				}
			};
		}

		if (GUIParams.haveFilter[p]){
			GUIParams.GUIState.main.particles[p].base.dropdown.filters = {
				'id' : p+'filters',
				'builder' : createParticleControlsWindow,
				'filterSliders':{
					'id':'filterSliders',
					'builder':createParticleFilterSlidersSegment
				},
				'filterPlayback':{
					'id':'filterPlayback',
					'builder':createParticleFilterPlaybackSegment
				}
			}
		}

	})

	getGUIIDs();
}

function createParticleBase(container, parent, p){

	var this_pane = parent[p].base;
	var keys = Object.keys(this_pane).filter(function(key){return !GUIParams.GUIState_variables.includes(key)});

	// initialize some of the variables the node will need here
	this_pane.children = keys;
	this_pane.parent = parent;
	this_pane.url = p;
	// can't decide if i want the url to be relative to particles or if it should include main/particles in it.
	//  so i'll comment out the "absolute" url in case I change my mind
	//this_pane.url = parent.url + '/' + p;

	//  create container divs for each of the particle groups

	var height = 0;
	if (!excluded(this_pane.url)){
		height += 33;
		var controls = container.append('div')
			.attr('class',"particleDiv "+p+"Div")
			.attr('id',p+"Div" ) 
			.style('width', (GUIParams.containerWidth - 4) + 'px')
			.style('height',height+'px')
			.attr('trueHeight',height+'px')
			.style('margin-bottom','0px')
			.style('padding','0px')

		this_pane.d3Element = controls.append('div')
			.attr('id',p + 'BaseContainer')
			.style('height',height+'px')
			.attr('trueHeight',height+'px');

		// size the overall particle group div
		this_pane.d3Element.append('div')
			.attr('class','pLabelDiv')
			.style('padding-top','7px')
			.style('width',GUIParams.longestPartLabelLen)
			.text(p)

		this_pane.children.forEach(function(name){
			height+=createParticleSegment(this_pane.d3Element,this_pane,name)})

		this_pane.d3Element.style('height', height + 'px')
		.attr('trueHeight', height + 'px')
		.style('display','block')
	}

	container.style('height', height + 'px')
		.attr('trueHeight', height + 'px')
}

function createParticleOnOffSegment(container,parent,name,p){
	// add the on-off switch
	var onoff = container.append('label')
		.attr('class','switch')
		.style('top','4px');

	onoff.append('input')
		.attr('id',p+'Check')
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.attr('checked','true')
		.on('change',function(){
			sendToViewer([{'checkshowParts':[p,this.checked]}]);
			// update the checkbox on the GUI side
			elm = document.getElementById(p+'Check');
				elm.checked = this.checked;
				elm.value = this.checked;
			GUIParams.showParts[p] = this.checked;

			var any_shown = GUIParams.partsKeys.some(
				function (key){return GUIParams.showParts[key]});
			GUIParams.showParts[GUIParams.CDkey] = any_shown;

			if (!this.checked && GUIParams.showColormap[p]) removeColorbar(p);
			else if (this.checked && GUIParams.showColormap[p]) checkColormapBox(p,this.checked);

			// need to determine if we should show/hide the colorbar container
			//  for column density b.c. if we turn off all the particles it should disappear
			if (GUIParams.showColormap[GUIParams.CDkey]){
				if (any_shown){
					// show the colorbar container
					d3.select('#colormap_outer_container').style('visibility','visible');
				}
				else{
					// hide the colorbar container
					//hide the colomap div
					if (d3.select('#colormap_outer_container').classed('show')) expandColormapTab();
					d3.select('#colormap_outer_container').style('visibility','hidden');
				}
			}
		})

	if (!GUIParams.showParts[p]){
		elm = document.getElementById(p+'Check');
		elm.checked = false;
		elm.value = false;
	} 

	onoff.append('span')
		.attr('class','slideroo');

	return 0;
}
function createParticleSizeSliderSegment(container,parent,name,p){
	// add the particle size slider
	left = 210;
	container.append('div')
		.attr('id',p+'_PSlider')
		.attr('class','PSliderClass')
		.style('left',(GUIParams.containerWidth - left) + 'px')
		.style('width',(GUIParams.containerWidth - (left+4-75+GUIParams.longestPartLabelLen)) + 'px')
		.style('height', '25px');

	// add the particle size text input
	container.append('input')
		.attr('id',p+'_PMaxT')
		.attr('class', 'PMaxTClass')
		.attr('type','text')
		.style('left',(GUIParams.containerWidth - 94) + 'px');

	createPsizeSlider(p);
	return 0;
}

function createParticleColorPickerSegment(container,parent,name,p){
	// add the particle color picker
	container.append('input')
		.attr('id',p+'ColorPicker');
	createColorPicker(p);
	container.select('.sp-replacer').style('left',(GUIParams.containerWidth - 54) + 'px');
	return 0;
}

function createParticleDropdown(container,this_pane,name,p){

	var keys = Object.keys(this_pane).filter(function(key){return !GUIParams.GUIState_variables.includes(key)});
	this_pane.children = keys;
	this_pane.url = p + '/' + 'dropdown';

	//var h = 34*keys.length
	var segment_height = 3; //34*Math.ceil(this_pane.children.length/2.) + 1;

	// add the dropdown button and a dropdown container div
	d3.select('#' + p + 'Div')
		.append('button')
		.attr('id', p+'Dropbtn')
		.attr('class', 'dropbtn')
		.attr('onclick','expandParticleDropdown(this)')
		.style('left',(GUIParams.containerWidth - 28) + 'px')
		.style('top','-22px')
		.html('&#x25BC');

	dropdown = this_pane.d3Element = container.append('div')
		.attr('id',p+'DropdownDiv')
		.attr('class','dropdown-content')
		.style('width',(GUIParams.containerWidth - 4) + 'px')
		.style('display','flex-wrap')
		.style('top','7px') 
		//.style('height', h + 16 + 'px')
		//.style('clip-path', 'inset(0px 0px ' + (h + 16) + 'px 0px)');
		.style('height','0px')
		.style('clip-path', 'inset(0px 0px 0px 0px)');

	//add an address bar (like in the main controls section) to show the current state of the particle UIs
	var stateBar = dropdown.append('div')
		.style('display','flex')
		.style('position','absolute')
		.style('padding','0px')
		.style('top','0px')
		.style('width', (GUIParams.containerWidth - 4) + 'px')
		.style('height', '16px')

	stateBar.append('div')
		.attr('id','UIParticleBackButton')
		.attr('class','particleDiv')
		.style('float','left')
		.style('width','40px')
		.style('height','16px')
		.style('cursor','pointer')
		.style('margin','0px')
		.style('padding','0px')
		.on('click', function(){transitionUIWindows.call(this, null, p)})
		.append('div')
			.attr('class','pLabelDiv')
			.style('font-size','30px')
			.style('line-height','14px')
			.style('color',getComputedStyle(document.body).getPropertyValue('--UI-character-background-color'))
			.html(GLOBAL_arrow);
			//.text('Back')

	stateBar.append('div')
		.attr('id',p + 'UIStateTextContainer')
		.attr('class','UIdiv')
		.style('width', (GUIParams.containerWidth - 45) + 'px')
		.style('margin-left','1px')
		.style('height', '16px')
		.style('font-size','12px')
		.style('line-height','16px')
		.style('padding','0px')
		.append('div')
			.attr('id',p + 'UIStateText')
			.style('float','left')
			.style('padding','0px 0px 0px 10px')
			.style('font-family', '"Lucida Console", "Courier New", monospace')
			// because we're hiding the base layer make it say dropdown rather than base or base/dropdown
			.text(p+'/dropdown') 

	// buttons to navigate to additional particle controls
	var button_container = dropdown.append('div')
		.attr('id',GUIParams.GUIState.main.particles[p].base.id)
		.attr('class','dropdown-content UImover')
		.style('width',(GUIParams.containerWidth - 7) + 'px')
		.style('display','flex-wrap')
		.style('margin-top','16px')
		.style('margin-left','1px')
		.style('clip-path', 'inset(0px 0px 0px 0px)');

	var singleWidth = (GUIParams.containerWidth - 38)/2.+1;

	var button_count = 0;
	var last_button;
	var last_label;
	this_pane.children.forEach(function(k){
		//create the button on the base window
		var sub_url = this_pane[k].url = this_pane.url+'/' + k;
		if (excluded(sub_url)) return;
		else if (this_pane[k].hasOwnProperty('builder')) {
			//console.log(sub_url)
			last_button = button_container.append('div')
				.attr('id',this_pane[k].id + 'button')
				.attr('class','particleDiv')
				.style('width',singleWidth + 'px')
				.style('float','left')
				.style('margin-left',3.5+'px')
				.style('margin-top',4.5+'px')
				.style('cursor','pointer')
				.on('click',function(){
					transitionUIWindows.call(this, 'base/dropdown/' + k, p)
				})

			last_label = last_button.append('div')
				.attr('class','pLabelDiv')
				.text(k[0].toUpperCase()+k.slice(1,))
				.style('width',singleWidth + 'px')
				// uncomment to center-align button labels
				//.style('text-align','center')

			if (!(button_count%2 )) segment_height+=36;
			button_count+=1;
			//create the UI for this key
			this_pane[k].builder(dropdown,this_pane,k,p);
			this_pane[k].built = true;
		}

	})

	// if we have an odd number of buttons, make the last one wider
	if (button_count%2){
		last_button.style('width',GUIParams.containerWidth-22)
		last_label.style('width',GUIParams.containerWidth-22)
	}

	button_container.style('height', segment_height + 'px')
		.attr('trueHeight', segment_height + 'px')

	return dropdown
}

function expandParticleDropdown(handle) {

	//get the current height of the particle container
	var h0 = parseFloat(d3.select('#UIStateContainer').attr('trueHeight'));

	// find particle ID for this dropdown and toggle the classes
	var pID = handle.id.slice(0,-7); // remove  "Dropbtn" from id
	var ddiv = d3.select('#' + pID + 'DropdownDiv');
	var pdiv = d3.select('#' + pID + 'Div');
	ddiv.node().classList.toggle('show');

	handle.classList.toggle('dropbtn-open');

	//get the height of the current dropdown window
	var current = GUIParams.GUIState.main.particles[pID].current;
	var d = current.split('/');
	var level = GUIParams.GUIState.main.particles[pID];
	d.forEach(function(dd){
		level = level[dd];
	})
	var elem = d3.select('#' + level.id);
	elem.node().classList.toggle('show');
	var hdrop = parseFloat(elem.attr('trueHeight')) + 18; //18 for the state bar at the top

	//transition the dropdown open or closed
	if (ddiv.classed('show')){
		ddiv
			.style('clip-path', 'inset(0px 0px 0px 0px')
			.style('height',hdrop + 'px');
		pdiv.style('margin-bottom', hdrop + 4 + 'px');
		elem.style('height', elem.attr('trueHeight'));
		h0 += hdrop + 2
	} else {
		ddiv
			.style('clip-path', 'inset(0px 0px ' + parseFloat(ddiv.style.height) + 'px 0px')
			.style('height','0px');
		pdiv.style('margin-bottom', '0px');
		elem.style('height', '0px');
		h0 -= hdrop + 2
	}


	//reset the height of the containers
	d3.select('#GUIParticlesBase').style('height',h0 + 'px')
	d3.select('#UIStateContainer')
		.style('height',h0 + 'px') 
		.attr('trueHeight',h0 +  'px')

	//if the colormap is open be sure to update the overall clip-path
	var inset = getUIcontainerInset(pID);
	d3.select('#UIcontainer').style('clip-path','inset(-20px ' + inset.inset[1] + 'px ' + inset.inset[2] + 'px 0px)');

	setTimeout(checkGUIsize, 500);
}


function createColorPicker(p){
	/* for color pickers*/
	//can I write this in d3? I don't think so.  It needs a jquery object
	$("#"+p+"ColorPicker").spectrum({
		color: "rgba("+(GUIParams.partsColors[p][0]*255)+","+(GUIParams.partsColors[p][1]*255)+","+(GUIParams.partsColors[p][2]*255)+","+GUIParams.partsColors[p][3]+")",
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
			console.log(color)
			sendToViewer([{'checkColor':[p, color.toRgb()]}]);
		},
	});

	// special URL to disable the colorpicker
	if (excluded(p+'/colorPicker/onclick')){
		$("#"+p+"ColorPicker").spectrum({
			color: "rgba("+(GUIParams.partsColors[p][0]*255)+","+(GUIParams.partsColors[p][1]*255)+","+(GUIParams.partsColors[p][2]*255)+","+GUIParams.partsColors[p][3]+")",
			disabled: true,
		});		
	}

}