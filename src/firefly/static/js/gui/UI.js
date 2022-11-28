//GLOBAL_arrow = '&#129044;';
GLOBAL_arrow = '&#11104;';

// while the window is resizing, I don't want transitions in the size of the GUI
// execute a function after resize is finished
// https://stackoverflow.com/questions/45905160/javascript-on-window-resize-end
function debounce(func, time = 100){
	var timer;
	return function(event){
		if(timer) clearTimeout(timer);
		timer = setTimeout(func, time, event);
	};
}

function removeTransition() {
	d3.select('#UIStateContainer').classed('noTransition', true);
}
function resetTransition() {
	d3.select('#UIStateContainer').classed('noTransition', false);
}

function addGUIlisteners(){
	window.addEventListener('mouseup',function(){GUIParams.movingUI = false;});
	document.body.addEventListener('dblclick',resetGUILocation);

	window.addEventListener('resize', checkGUIsize);
	window.addEventListener('resize', removeTransition);
	window.addEventListener('resize', debounce(resetTransition));
}

///////////////////////////////
////// create the UI
//////////////////////////////
function createUI(){
	//console.log("Creating UI", GUIParams.partsKeys, GUIParams.decimate);

	// don't create the UI at all
	if (excluded('')) return clearloading(true);

	//add particle data to the GUIState object
	defineGUIParticleState();

	//first get the maximum width of the particle type labels
	var longestPartLabel = '';
	GUIParams.longestPartLabelLen = 0;

	GUIParams.partsKeys.forEach(function(p,i){
		if (p.length > longestPartLabel.length && !excluded(p)) longestPartLabel = p;
		if (i == GUIParams.partsKeys.length - 1){
			var elem = d3.select('body').append('div')
				.attr('class','pLabelDivCHECK')
				.text(longestPartLabel)
			GUIParams.longestPartLabelLen = elem.node().clientWidth;
			elem.remove();
		}
	});
	GUIParams.longestPartLabelLen = Math.max(50, GUIParams.longestPartLabelLen); //50 is our default length
	if (GUIParams.longestPartLabelLen > 50){
		GUIParams.containerWidth += (GUIParams.longestPartLabelLen - 50);
	}


	var UIcontainer = d3.select('#UIcontainer');
	UIcontainer.classed('hidden', true); //hide to start
	UIcontainer.html(""); //start fresh

	UIcontainer.attr('style','position:relative; top:30px; left:10px; width:'+GUIParams.containerWidth+'px');
	UIcontainer.style('clip-path','inset(-20px -20px -20px 0px)');

	// set the children before going into createGeneralWindow
	GUIParams.GUIState.children = Object.keys(GUIParams.GUIState).filter(function(key){return !GUIParams.GUIState_variables.includes(key)});

	// create the FPS container
	createGeneralWindow(UIcontainer,GUIParams.GUIState,'FPSContainer',UIcontainer);

	//create the colormap tab (will be hidden until needed)
	createGeneralWindow(UIcontainer,GUIParams.GUIState,'colorbarContainer',UIcontainer);
	UIcontainer.append('div')

	//define the top bar
	var UIt = UIcontainer.append('div')
		.attr('id','UItopbar')
		.attr('class','UIdiv')
		.on('mousedown',dragElement)
		.style('width', (GUIParams.containerWidth - 4)+ 'px')
		.style('opacity',1)

	//UIt.append('table');
	var UIr1 = UIt.append('div')
		.attr('id','Hamburger')
		.style('padding','2px 0px 0px 4px')
		.style('float','left')
		.style('cursor','pointer')
		.on('mouseup',hideUI)
	UIr1.append('div').attr('class','bar1');
	UIr1.append('div').attr('class','bar2');
	UIr1.append('div').attr('class','bar3');


	// append the Firefly logo (instead of the bars?)
	/*
	UIt.append('div')
		.attr('id','UIicon')
		.on('mousedown',dragElement)
		.on('mouseup',hideUI)
		.style('cursor','pointer')
		.style('position','absolute')
		.style('top','2px')
		.style('left','2px')
		.append('img')
			.attr('src','static/docs/GUIicon.png')
			.attr('draggable',false)
			.style('height','30px')
	*/

	var UIr2 = UIt.append('div')
		.style('float','left')
		.attr('id','ControlsText')
		.style('font-size','16pt')
		.style('line-height','16pt')
		.style('padding','4px 0px 0px 40px')
		.append('b').text('Controls');

	//add an address bar to show the current state of the GUI
	var stateBar = UIcontainer.append('div')
		.style('display','flex')
		.style('position','absolute')
		.style('padding','0px')
		.style('top','35px')
		.style('width', GUIParams.containerWidth + 'px')
		.style('height', '16px')

	stateBar.append('div')
		.attr('id','UIBackButton')
		.attr('class','particleDiv')
		.style('float','left')
		.style('width','40px')
		.style('height','16px')
		.style('cursor','pointer')
		.style('margin','0px')
		.style('padding','0px')
		.on('click', function(){transitionUIWindows.call(this, null)})
		.append('div')
			.attr('class','pLabelDiv')
			.style('font-size','30px')
			.style('line-height','14px')
			.style('color',getComputedStyle(document.body).getPropertyValue('--UI-character-background-color'))
			.html(GLOBAL_arrow)
			//.text('Back')

	stateBar.append('div')
		.attr('id','UIStateTextContainer')
		.attr('class','UIdiv')
		.style('width', (GUIParams.containerWidth - 41) + 'px')
		.style('margin-left','1px')
		.style('height', '16px')
		.style('font-size','12px')
		.style('line-height','16px')
		.style('padding','0px')
		.append('div')
			.attr('id','UIStateText')
			.style('float','left')
			.style('padding','0px 0px 0px 10px')
			.style('font-family', '"Lucida Console", "Courier New", monospace')
			.text('main')


	var top_position = excluded('colorbarContainer') ? 50 : 30;
	var UI =  UIcontainer.append('div')
		.attr('id','UIStateContainer')
		.attr('class','UIStateContainer')
		.attr('trueHeight','34px')
		.style('position','relative')
		.style('height','34px')
		.style('margin-bottom',top_position + 2 + 'px')
		.style('top',top_position+'px')
		.style('clip-path','inset(0px)');

	//start creating the rest of the elements
	//work with the GUIState object
	//  it might be nice to generalize this so that I can just define the GUIParams.GUIState Object to determine what parts to create...

	createGeneralWindow(UI,GUIParams.GUIState,'main');

	if (!excluded('main/particles')){
		container = GUIParams.GUIState.main.particles.d3Element;
		// create each of the particle group UI base panels containing:
		GUIParams.partsKeys.forEach(function(p,i){
			createParticleBase(container,GUIParams.GUIState.main.particles,p);
		});
	}
		
	// if (GUIParams.containerWidth > 300) {
	// 	//could be nice to center these, but there are lots of built in positions for the sliders and input boxes.  Not worth it
	// 	var pd = 0.//(GUIParams.containerWidth - 300)/2.;
	// 	d3.selectAll('.dropdown-content')
	// 		.style('width',(GUIParams.containerWidth - 10 - pd) + 'px')
	// 		//.style('padding-left',pd + 'px')
	// }

	//create the octree loading bar
	if (GUIParams.haveAnyOctree) createGeneralWindow(
		UIcontainer,GUIParams.GUIState,'octreeLoadingBarContainer',UIcontainer);
	else delete GUIParams.GUIState['octreeLoadingBarContainer']

	// bind the children here again so that we can look for them in GUI built
	GUIParams.GUIState.children = Object.keys(GUIParams.GUIState).filter(function(key){return !GUIParams.GUIState_variables.includes(key)});

}

function getCurrentLevel(obj, state = null){
	var current = obj.current
	if (state) current = state;
	var d = current.split('/');
	var level = obj;
	d.forEach(function(dd){
		level = level[dd];
	})
	return level
}

function transitionUIWindows(state=null, pID=null){
	// if state is null, this will transition to the previous level (unless the previous level is main)
	// will transition from the current UI window (id1) to the desired UI windows (id2)
	// animations taken care of by css

	// check which button was clicked
	var inParticles = false;
	var direction = 'forward'
	var GUIBase = GUIParams.GUIState;
	if (pID) {
		inParticles = true;
		GUIBase = GUIParams.GUIState.main.particles[pID];
	}

	// don't try to go back from main
	if (!state && (GUIBase.current == 'main' || (inParticles && GUIBase.current == 'base'))) return false

	// get the current and next element
	var level = getCurrentLevel(GUIBase);
	var id1 = level.id;
	var elem1 = d3.select('#'+id1);

	var id2 = null;
	var elem2 = null;
	if (state){
		// going forward to a deeper level of the GUI
		level = getCurrentLevel(GUIBase, state)
		id2 = level.id;
		elem2 = d3.select('#'+id2);
		direction = 'forward';
	} else {
		// go back
		// get the current state (in this case it is not included in the state string sent here)
		d = GUIBase.current.split('/');
		d.pop();
		level = GUIBase;
		state = ''
		d.forEach(function(dd,i){
			// short-circuit on dropdown, that pane doesn't actually exist
			//  so we'll want to return to base. this ensures the state doesn't
			//  have the trailing '/dropdown' that would try and transition to a
			//  pane that doesn't actually exist.
			if (dd == 'dropdown') return;
			level = level[dd];
			if (i > 0) state += '/';
			state += dd;
		})
		id2 = level.id;
		elem2 = d3.select('#'+id2);
		direction = 'backward';
	}

	//set the state variable
	GUIBase.current = state;

	//update the state text
	// because we're hiding the base layer for the particle dropdowns from the user,
	//  make it say dropdown rather than base or base/dropdown
	var stateText = state;
	var stateTextID  = 'UIStateText';
	var stateTextContainerID  = 'UIStateTextContainer';
	if (inParticles) {
		stateTextID = pID + 'UIStateText';
		stateTextContainerID = pID + 'UIStateTextContainer';
		stateText = stateText.replace('base/dropdown','dropdown').replace('base','dropdown');
		stateText = stateText.replace('dropdown',pID+'/dropdown')
	}
	d3.select('#' + stateTextID).text(stateText);

	//if the text is too long, shorten it (in my current version, this is never necessary)
	var w = parseFloat(d3.select('#' + stateTextContainerID).style('width'));
	var count = (stateText.match(/\//g) || []).length;
	var bbox = d3.select('#' + stateTextID).node().getBoundingClientRect();
	if (bbox.width > w && count > 0){
		while (count > 0){
			var p1 = stateText.indexOf('/');
			stateText = '...' + stateText.substr(p1)
			d3.select('#' + stateTextID).text(stateText);
			bbox = d3.select('#' + stateTextID).node().getBoundingClientRect();
			count -= 1;
			stateText = stateText.substr(4)
		}
	}

	// deal with the particle show classes
	GUIParams.partsKeys.forEach(function(k){
		var ddiv = d3.select('#' + k + 'DropdownDiv');
		if (ddiv.empty()) return;
		ddiv.selectAll('.dropdown-content').classed('show', false);
		if ((inParticles || id2 == 'particles') && ddiv.classed('show')){
			var level = getCurrentLevel(GUIParams.GUIState.main.particles[k]);
			d3.select('#' + level.id).classed('show', true);
		}
	})


	// transition the old and new elements into place
	if (direction == 'forward'){
		// old one off
		elem1.style('transform','translateX(-' + GUIParams.containerWidth + 'px)');
		// new one on
		elem2.style('transform','translateX(0px)');
	} else {
		// old one off, but moving in the opposite direction 
		elem1.style('transform','translateX(' + GUIParams.containerWidth + 'px)');
		// new one on
		elem2.style('transform','translateX(0px)');
	}


	// set the correct heights
	// these go away (after the transition)
	setTimeout(function(){
		elem1.style('height', '0px');
		elem1.selectAll('.dropdown-content').style('height', '0px');
	}, 250);

	// these go on, but with special handling below for particles
	elem2.style('height', elem2.attr('trueHeight'));
	elem2.select('.dropdown-content').style('height', elem2.attr('trueHeight'));
	var bbox2 = elem2.node().getBoundingClientRect(); 


	// set the heights for the particle dropdowns and count up the total height for the global GUI height
	var h = bbox2.height;
	var dh = 0;
	var id3 = '';
	if (inParticles || id2 =='particles'){
		var hdrop = 0;
		var pheight = 0;
		GUIParams.partsKeys.forEach(function(k){
			var ddiv = d3.select('#' + k + 'DropdownDiv');
			var pdiv = d3.select('#' + k + 'Div');

			var htmp = 0;
			// the main particle div without the dropdown
			if (!pdiv.empty()) htmp += parseFloat(pdiv.style('height')) + 2; //2 for margins

			if (!ddiv.empty() && ddiv.classed('show')){
				// add on the height of the dropdown
				var level = getCurrentLevel(GUIParams.GUIState.main.particles[k]);
				if (inParticles && pID == k) id3 = level.id;
				var elem = d3.select('#' + level.id);

				var ph = parseFloat(elem.attr('trueHeight')) + 18; //18 for the state bar at the top

				//reset the heights
				elem.style('height', elem.attr('trueHeight'));
				ddiv.style('height', ph + 'px');
				pdiv.style('margin-bottom', ph + 4 + 'px');

				//save this to resize the particle dropdown
				if (inParticles && pID == k) pheight = ph; 

				htmp += ph

				//dh += 2; // I think I need a slight addition to the sizing per particle, but this needs further testing
			} else 	{
				ddiv.style('height','0px');
			}

			hdrop += htmp

		});
		h = hdrop

	}


	// set the new height of the overall UI
	d3.select('#UIStateContainer')
		.style('height',(h + dh) + 'px')
		.attr('trueHeight',h + 'px');

	// set all hidden components of the GUI to a height of 0
	function setToZero(obj){
		if (obj.hasOwnProperty('id')){
			if (obj.id != id1 && obj.id != id2 && obj.id != id3){
				//console.log(obj.id)
				var elem = d3.select('#' + obj.id);
				// size checks if the selection caught anything
				if (elem.size()>0 && !elem.classed('show')) elem.style('height','0px');
				elem.select('.dropdown-content').filter(function(){
					if (d3.select(this).classed('show')) return false;
					return true;
				}).style('height','0px');
			}
		}

		if (obj.hasOwnProperty('children')) keys = obj.children;
		// TODO should be able to remove this else statement after doing particles
		else keys = Object.keys(obj);

		keys.forEach(function(k){
			if (typeof obj[k] === 'object') setToZero(obj[k])
		})
	}
	setToZero(GUIParams.GUIState);

	// make sure that we are not cutting off the colormap
	var inset = getUIcontainerInset()
	d3.select('#UIcontainer').style('clip-path','inset(-20px ' + (-20 - inset.cbar[0]) + 'px ' + (-20 - inset.cbar[1]) + 'px 0px)');

	// check if we need a scroll bar
	setTimeout(checkGUIsize, 500);

}

function createGeneralWindow(container,parent,name,this_UIcontainer=null){
	//these will be side by side
	var this_pane = parent[name];
	var keys = Object.keys(this_pane).filter(function(key){return !GUIParams.GUIState_variables.includes(key)});

	// initialize some of the variables the node will need here
	this_pane.children = keys;
	this_pane.parent = parent;
	//if (!GUIParams.GUIState.children.includes(this_pane.id)){
	if (!parent.hasOwnProperty('current')){
		this_pane.url = parent.url+'/'+this_pane.id;
		var width = GUIParams.containerWidth;
	}
	else{
		this_pane.url = this_pane.id;
		var width = 0;
	}

	// don't actually want to make this or any of its children
	if (excluded(this_pane.url)) return;

	// allow to pass the UIcontainer to apply builder to if desired, 
	//  otherwise will create a new one just for this pane
	if (this_UIcontainer == null){
		this_UIcontainer = container.append('div')
		.attr('id',this_pane.id)
		.attr('class','UImover')
		.style('position','absolute')
		.style('top','0px')
		.style('height','34px')
		.attr('trueHeight','34px')
		.style('width', GUIParams.containerWidth + 'px')
		.style('transform','translateX(' + width + 'px)')
	}

	// handle the base case
	if (this_pane.hasOwnProperty('builder')){	
		// fill this pane with its content using the 
		//  builder function defined in GUIParams
		this_pane.builder(
			this_UIcontainer,	
			parent,
			this_pane.id)
		// tell the pane it's been built
		this_pane.built = true;
	}
	else { // this is a branch leading to more buttons
		var sub_url;
		var button_count = keys.filter(function (val){
			sub_url = this_pane.url+'/' + val;
			return !excluded(sub_url);
		}).length;
		var denom = Math.min(button_count,2);
		var singleWidth = GUIParams.containerWidth/denom - 14;

		//console.log('hardcoded padding between',this_pane.url,'/',keys,'buttons');

		// each button has 36 pixels associated with it, 22 in height,
		//  7 in buffer/padding that expands the width of the gray box, and then
		//  an additional 8 of blank space
		//  so we want the number of rows (button_count/2 + button_count%2)
		//  which could change (right now between 1 and 2)
		segment_height=36 * (Math.floor(button_count/2) + button_count%2);
		this_pane.d3Element = this_UIcontainer.style('display','flex-wrap')
			.style('height', segment_height + 'px')
			.attr('trueHeight', segment_height + 'px');

		// short-circuit once we've made the div for the particles above
		if (this_pane.id != 'particles'){
			this_pane.children.forEach(function(k,index){
				var sub_url = this_pane[k].url = this_pane.url+'/' + k;
				//console.log(this_pane.id,sub_url,singleWidth)
				if (excluded(sub_url)) return;
				last_button = this_pane.d3Element.append('div')
					.attr('id',this_pane[k].id + 'button')
					.attr('class','particleDiv')
					.style('width', singleWidth + 'px')
					.style('float','left')
					.style('margin','2px')
					.style('cursor','pointer')
					.on('click',function(){transitionUIWindows(sub_url)})
				
				last_label = last_button.append('div')
					.attr('class','pLabelDiv')
					.text(this_pane[k].id[0].toUpperCase()+this_pane[k].id.slice(1,))

				// if we have an odd number of buttons, make the last one wider
				if (button_count%2 && index == (button_count-1)){
					last_button.style('width',GUIParams.containerWidth-14)
					last_label.style('width',GUIParams.containerWidth-14)
				}

				createGeneralWindow(container,this_pane,k);
			})
		}// this_pane.id != 'particles'
		else this_pane.d3Element.style('display',null); // undo the styling above
	}// else no builder
}

	// create data controls pane containing:
	//  save settings button
	//  default settings button
	//  load settings button
	//  load new data button
	// create camera controls pane containing:
	//  fullscreen button
	//  take snapshot button
	//  camera center (camera focus) text boxes
	//  camera location text boxes
	//  camera rotation text boxes
	//  save, reset, and recenter buttons
	//  friction and stereo separation sliders
	//  stereo checkbox
	// create column desnity pane containing:
	//  on/off checkbox
	//  log10 checkbox
	//  colormap selector
	//  slider to adjust limits

//////////////////////// ////////////////////////
// helper functions vvvvvvv
//////////////////////// ////////////////////////

////////////////////////
// update the text in the camera location
////////////////////////
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
	if (el != null) el.value = GUIParams.cameraRotation._x;

	var el = document.getElementById("RotYText");
	if (el != null) el.value = GUIParams.cameraRotation._y;

	el = document.getElementById("RotZText");
	if (el != null) el.value = GUIParams.cameraRotation._z;
}

//////////////////////
// presets
//////////////////////
//load a preset file
function loadPreset(){
	document.getElementById("presetFile").click();
}

//read a preset file
d3.select('body').append('input')
	.attr('type','file')
	.attr('id','presetFile')
	.on('change', function(e){
		file = this.files[0];
		if (file != null){
			readPreset(file);
		}})
	.style('display','None');
	
function readPreset(file){
	//get the new options JSON
	var preset = {};
	preset.loaded = false;

	var reader = new FileReader();
	reader.readAsText(file, 'UTF-8');
	reader.onload = function(){
		preset = JSON.parse(this.result);
		if (preset.loaded){
			document.getElementById("presetFile").value = "";
			sendToViewer([{'resetToPreset':preset}]);
		}
	}
}


//////////////////////
// various functions tied to buttons in UI
//////////////////////
function selectVelType() {
	//type of symbol to draw velocity vectors (from input box)
	var option = d3.select(this)
		.selectAll("option")
		.filter(function (d, i) { 
			return this.selected; 
	});
	var selectValue = option.property('value');

	var p = this.id.slice(0,-14)
	sendToViewer([{'setViewerParamByKey':[selectValue, "velType",p]}]);
}

function selectBlendingMode() {
	//set the blending mode from the options selector
	var option = d3.select(this)
		.selectAll("option")
		.filter(function (d, i) { 
			return this.selected; 
	});
	var selectValue = option.property('value');

	var p = this.id.slice(0,-19)
	sendToViewer([{'setBlendingMode':[selectValue, p]}]);
}

function selectRadiusVariable(){
	var option = d3.select(this)
		.selectAll("option")
		.filter(function (d, i) { 
			return this.selected; 
	});

	var p = this.id.slice(0,-21) // 21 is length of _selectRadiusVariable
	var selectValue = GUIParams.rkeys[p].indexOf(option.property('value'));

	sendToViewer([{'setRadiusVariable':[selectValue, p]}]);
}


function changeUISnapSizes(){
	//size of the snapshot (from text input)
	var el = document.getElementById("RenderXText");
	if (el) el.value = GUIParams.renderWidth;

	el = document.getElementById("RenderYText");
	if (el) el.value = GUIParams.renderHeight;
}

function togglePlayback(p,checked){
	// figure out which checkbox was checked by slicing the ID, clever move Aaron!
	this_label = document.getElementById(p+'_PlaybackLabel');

	//reset the text/appstate to default values
	this_label.childNodes[0].nodeValue = 'Playback: ';

	var forViewer = [];
	var playbackEnabled = false;
	var updateFilter = false

	if (checked){
		//this_label.childNodes[0].nodeValue += "under development";
		this_label.childNodes[0].nodeValue += GUIParams.currentlyShownFilter[p];

		playbackEnabled = true;
		updateFilter = true;
	}

	forViewer.push({'setViewerParamByKey':[0, 'parts',p,"playbackTicks"]})
	forViewer.push({'setViewerParamByKey':[playbackEnabled,'parts',p,"playbackEnabled"]})
	forViewer.push({'setViewerParamByKey':[updateFilter, "updateFilter",p,]})

	if (checked) forViewer.push({'updatePlaybackFilter':[p]})

	sendToViewer(forViewer);

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
	GUIParams.currentlyShownFilter[p] = selectValue;
	sendToViewer({'setViewerParamByKey':[selectValue, 'parts',p,'currentlyShownFilter']})

	//console.log("in selectFilter", selectValue, this.id, p)
	for (var i=0; i<GUIParams.fkeys[p].length; i+=1){
		d3.selectAll('#'+p+'_FK_'+GUIParams.fkeys[p][i]+'_END_Filter')
			.style('display','none');
		d3.selectAll('#'+p+'_FK_'+GUIParams.fkeys[p][i]+'_END_InvertFilterCheckBox')
			.style('display','none');
		d3.selectAll('#'+p+'_FK_'+GUIParams.fkeys[p][i]+'_END_InvertFilterCheckBoxLabel')
			.style('display','none');
	}
	d3.selectAll('#'+p+'_FK_'+selectValue+'_END_Filter')
		.style('display','block');
	d3.selectAll('#'+p+'_FK_'+selectValue+'_END_InvertFilterCheckBox')
		.style('display','inline-block');
	d3.selectAll('#'+p+'_FK_'+selectValue+'_END_InvertFilterCheckBoxLabel')
		.style('display','inline-block');
}


//////////////////////
// to move the GUI around on the screen
// from https://www.w3schools.com/howto/howto_js_draggable.asp
//////////////////////
function dragElement(elm, e) {
	var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
	dragMouseDown(e);
}

function dragMouseDown(e) {
	e = e || window.event;
	// get the mouse cursor position at startup:
	pos3 = e.clientX;
	pos4 = e.clientY;
	document.addEventListener('mouseup', closeDragElement);
	document.addEventListener('mousemove', elementDrag);
	d3.select('#UIStateContainer').classed('noTransition', true);
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
	var elem = document.getElementById("UIcontainer");
	var top = parseInt(elem.style.top);
	var left = parseInt(elem.style.left);
	elem.style.top = (top - pos2) + "px";
	elem.style.left = (left - pos1) + "px";

	checkGUIsize();
}

function closeDragElement(e) {
	/* stop moving when mouse button is released:*/
	GUIParams.movingUI = false;
	e.stopPropagation();
	document.removeEventListener('mouseup', closeDragElement);
	document.removeEventListener('mousemove', elementDrag);
	d3.select('#UIStateContainer').classed('noTransition', false);
}

/////////////
// for show/hide of elements of the UI
//////////////
function hideUI(){
	//clip-path has animation in css
	if (!GUIParams.movingUI){

		// change the x to 3 bars
		this.classList.toggle("change");
		GUIParams.UIhidden = !GUIParams.UIhidden

		var elem = d3.select('#UIcontainer');
		var bbox = elem.node().getBoundingClientRect();
		//console.log('checking', GUIParams.UIhidden, this.classList, bbox)
		if (GUIParams.UIhidden){
			elem.style('clip-path','inset(3px ' + (bbox.width - 35) + 'px ' + (bbox.height - 35) + 'px 3px round 10px');
		}else{
			//check the colormap
			var inset = getUIcontainerInset()
			elem.style('clip-path','inset(-20px ' + (-20 - inset.cbar[0]) + 'px ' + (-20 - inset.cbar[1]) + 'px 0px)');
		}

	}
}

function getUIcontainerInset(pID = null){
	//if the colormap is open be sure to update the overall clip-path
	var bbox = d3.select('#UIcontainer').node().getBoundingClientRect();
	var newHeight = 0;
	if (pID){
		//for dropdown
		var dbbox = document.getElementById(pID+'DropdownDiv').getBoundingClientRect();
		var newHeight = bbox.height - dbbox.height;
	}
	var cwidth = 0;
	var cheight = 0;
	var inset = parseInset(d3.select('#UIcontainer'));	
	var colorbar_container = d3.select('#colormap_outer_container')
	if (!colorbar_container.empty() && colorbar_container.classed('show')){
		var cbar = d3.select('#colormap_container');
		if (cbar.node()) {
			//it's rotated
			cwidth = parseFloat(cbar.style('height')) + 4;
			inset[1] = -20 - cwidth; // 4 for border
			cheight = parseFloat(cbar.style('width')) + 4; 
			if (cheight > newHeight) inset[2] = -20 - (cheight - newHeight) - 4; // 4 for border
		}
	}

	return {'inset':inset,'cbar':[cwidth, cheight]}
}




function expandLoadingTab(duration=250){
	var container = d3.select('#octree_loading_outer_container');
	container.node().classList.toggle('show')

	//rotate the arrow
	d3.select('#octreeLoadingDropbtn').node().classList.toggle('dropbtn-open');

	var elem = d3.select('#octree_loading_container');
	var svg = elem.select('svg');
	//show/hide the tab
	if (container.classed('show')){
		elem.style('margin','0px 0px 2px 1px');
		elem.transition().duration(duration).style('height', svg.attr('height'));
		svg.select('clipPath').select('rect').transition().duration(duration).attr('height', svg.attr('height'));
	} else {
		elem.transition().duration(duration)
			.style('height','0px').on('end', function(){
				d3.select(this).style('margin', '-1px 0px 0px 0px');
			})
			
		svg.select('clipPath').select('rect').transition().duration(duration).attr('height', '0px');
	}
}

function expandColormapTab(show){
	//all animations are in CSS (because of the clip-path)
	var container = d3.select('#colormap_outer_container');
	if (show == null){
		container.node().classList.toggle('show')
		d3.select('#colormapDropbtn').node().classList.toggle('dropbtn-open');

	} else {
		container.classed('show', show)
		d3.select('#colormapDropbtn').classed('dropbtn-open', show);
	}

	var h = parseFloat(d3.select('#colormap_container').style('height')) + 4; // +4 for border
	var w = parseFloat(d3.select('#colormap_container').style('width')) + 4; // +4 for border
	var hContainer = d3.select('#UIcontainer').node().getBoundingClientRect().height;

	//show/hide the tab
	//animations for UIcontainer are taken care of in css
	if (container.classed('show')){
		var h2 = -20
		if (w > hContainer) h2 -= w;
		d3.select('#UIcontainer').style('clip-path', 'inset(-20px ' + (-20 - h) + 'px ' + h2 + 'px 0px')
		d3.select('#colormap_outer_container').style('margin-left', h + 'px')
		d3.select('#colormap_container').style('clip-path','inset(0px 0px 0px 0px)'); 


	} else {
		d3.select('#UIcontainer').style('clip-path', 'inset(-20px -20px -20px 0px')
		d3.select('#colormap_outer_container').style('margin-left', '0px')
		d3.select('#colormap_container').style('clip-path','inset(0px 0px ' + h + 'px 0px)');
	}
}



/////////////
// read values from UI and send to viewer
//////////////
function updateUIValues(value, varArgs, i=0, type='single'){

	var forViewer = [];

	//these update the viewer parameters
	if (varArgs){
		if (varArgs.hasOwnProperty('f')){
			varToSetSend = [];
			varArgs.v.forEach(function(x){
				varToSetSend.push(x);
			})
			if (type == "double") varToSetSend.push(i); //adding this only for double sliders 
			varToSetSend[0] = parseFloat(value);
			toSend = {};
			toSend[varArgs.f]= varToSetSend;

			forViewer.push(toSend);
		}

		//is there a more efficient way to check for all of these?
		if (varArgs.hasOwnProperty('f1')){
			toSend = {};
			toSend[varArgs.f1]= varArgs.v1;
			forViewer.push(toSend);
		}

		if (varArgs.hasOwnProperty('f2')){
			toSend = {};
			toSend[varArgs.f2]= varArgs.v2;
			forViewer.push(toSend);
		}

		if (varArgs.hasOwnProperty('f3')){
			toSend = {};
			toSend[varArgs.f3]= varArgs.v3;
			forViewer.push(toSend);
		}

		if (varArgs.hasOwnProperty('f4')){
			toSend = {};
			toSend[varArgs.f4]= varArgs.v4;
			forViewer.push(toSend);
		}

		if (varArgs.hasOwnProperty('f5')){
			toSend = {};
			toSend[varArgs.f5]= varArgs.v5;
			forViewer.push(toSend);
		}

		if (varArgs.hasOwnProperty('f6')){
			toSend = {};
			toSend[varArgs.f6]= varArgs.v6;
			forViewer.push(toSend);
		}
		//console.log('updateUIValues', forViewer);
		sendToViewer(forViewer);

		//this can run a function in the GUI (can I improve on this method?)
		if (varArgs.hasOwnProperty('evalString')) eval(varArgs.evalString);

	}
}

function updateUIBlending(args){
	var p = args[0];
	var mode = args[1] ? 'normal':'additive';
	var dTest = args[1]; // have dTest and mode share

	// don't change the blending mode for column density projection
	if (p == GUIParams.CDkey) return;

	// set the blending mode value in the dropdown
	elm = document.getElementById(p+'_selectBlendingMode');
	if (elm) elm.value = mode;

	//also update the checkbox for the depth test
	elm = document.getElementById(p+'_depthCheckBox');
	if (elm){
		elm.checked = dTest;
		elm.value = dTest;
	}
}

//////////////////////////////////////////
// disable the camera text input boxes (they don't work properly)
// this function is called right after creating the UI; remove it once the input boxes functionality is fixed!
/////////////////////////////////////////
function disableCameraInputBoxes(){
	// this does the job but turns the boxes gray
	// document.getElementById('CenterXText').disabled = true;
	// document.getElementById('CenterYText').disabled = true;
	// document.getElementById('CenterZText').disabled = true;

	// document.getElementById('CameraXText').disabled = true;
	// document.getElementById('CameraYText').disabled = true;
	// document.getElementById('CameraZText').disabled = true;

	// document.getElementById('RotXText').disabled = true;
	// document.getElementById('RotYText').disabled = true;
	// document.getElementById('RotZText').disabled = true;

	// this does the job without graying out the boxes
	document.getElementById('CenterXText').onkeydown = function(e){ e.preventDefault(); };
	document.getElementById('CenterYText').onkeydown = function(e){ e.preventDefault(); };
	document.getElementById('CenterZText').onkeydown = function(e){ e.preventDefault(); };

	document.getElementById('CameraXText').onkeydown = function(e){ e.preventDefault(); };
	document.getElementById('CameraYText').onkeydown = function(e){ e.preventDefault(); };
	document.getElementById('CameraZText').onkeydown = function(e){ e.preventDefault(); };

	document.getElementById('RotXText').onkeydown = function(e){ e.preventDefault(); };
	document.getElementById('RotYText').onkeydown = function(e){ e.preventDefault(); };
	document.getElementById('RotZText').onkeydown = function(e){ e.preventDefault(); };
}

//////////////////////// ////////////////////////
// helper functions ^^^^^^^
//////////////////////// ////////////////////////

function checkGUIsize(){
	var container = d3.select('#UIStateContainer');
	if (container.node() && GUIParams.GUIbuilt){

		//if the bottom of the GUI extends off the page, force the GUI size to get smaller (is possible) and add a scroll bar
		var bbox = document.getElementById('UIcontainer').getBoundingClientRect();
		var bottom = bbox.bottom
		if (GUIParams.haveAnyOctree) bottom += 20; //20 to account for the octree loading tab

		var windowHeight = window.innerHeight;
		var h = parseFloat(container.style('height'));
		var h0 = parseFloat(container.attr('trueHeight'));

		if (bottom > windowHeight){
			if (h > 34){
				//shrink
				var newh = Math.max(h - (bottom - windowHeight), 34);
				container.style('height', newh + 'px');
			}
		} else {
			//grow
			if (h < h0){
				var newh = Math.min(h - (bottom - windowHeight), h0);
				container.style('height', newh + 'px');

			}
		}

		//add the scrollbar
		h = parseFloat(container.style('height'));
		if (h < h0){
			container.style('overflow', 'hidden scroll')
		} else {
			container.style('overflow', 'hidden')
		}
	}

}

function resetGUILocation(){
	// move the GUI back to the starting location on double click
	closeDragElement(event);
	if (event.target.nodeName == 'CANVAS') {
		var elem = document.getElementById("UIcontainer");
		elem.style.top = '30px';
		elem.style.left = '10px';
	}
}

function countNodes(obj){
	var count=1;
	if (obj.hasChildNodes()){
		obj.childNodes.forEach(
		function (cnode){count+=countNodes(cnode)})
	}
	else count+=1;
	return count;
}

function getGUIIDs(){
	// iterate through and grab all the id keys 
	GUIParams.GUIIDs = ['UIcontainer'];

	var obj;
	function iterate(obj) {
		var key;
		Object.keys(obj).forEach(function(key){
			if (key == 'id') GUIParams.GUIIDs.push(obj[key]);

			if (
				typeof obj[key] == 'object' && 
				obj[key] != null && 
				!GUIParams.GUIState_variables.includes(key)){
				iterate(obj[key])
			}
		})
	}
	iterate(GUIParams.GUIState);
}
