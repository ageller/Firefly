window.addEventListener('mouseup',function(){GUIParams.movingUI = false;});

///////////////////////////////
////// create the UI
//////////////////////////////
function createUI(){
	console.log("Creating UI", GUIParams.partsKeys, GUIParams.decimate);

	//add particle data to the GUIState object
	defineGUIParticleState();



	//first get the maximum width of the particle type labels
	var longestPartLabel = '';
	GUIParams.longestPartLabelLen = 0;

	GUIParams.partsKeys.forEach(function(p,i){
		if (p.length > longestPartLabel.length) longestPartLabel = p;
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

	// create the FPS container
	createFPSContainer(UIcontainer);

	//create the colormap tab (will be hidden until needed)
	createColormapContainer(UIcontainer)

	//define the top bar
	var UIt = UIcontainer.append('div')
		.attr('id','UItopbar')
		.attr('class','UIdiv')
		.attr('onmouseup','hideUI(this);')
		.attr('onmousedown','dragElement(this, event);')
		.style('width', (GUIParams.containerWidth - 4)+ 'px')

	//UIt.append('table');
	var UIr1 = UIt.append('div')
		.attr('id','Hamburger')
		.style('padding','2px 0px 0px 4px')
		.style('float','left')
		.style('cursor','pointer')
	UIr1.append('div').attr('class','bar1');
	UIr1.append('div').attr('class','bar2');
	UIr1.append('div').attr('class','bar3');

	var UIr2 = UIt.append('div')
		.style('float','left')
		.attr('id','ControlsText')
		.style('font-size','16pt')
		.style('line-height','16pt')
		.style('padding','4px 0px 0px 8px')
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
			.html('&#129044;')
			//.text('Back')

	stateBar.append('div')
		.attr('id','UIStateText')
		.attr('class','UIdiv')
		.style('width', (GUIParams.containerWidth - 41) + 'px')
		.style('margin-left','1px')
		.style('height', '16px')
		.style('font-size','12px')
		.style('line-height','16px')
		.style('float','left')
		.style('padding','0px 0px 0px 10px')
		.style('font-family', '"Lucida Console", "Courier New", monospace')
		.text('main')


	var UI = UIcontainer.append('div')
		.attr('id','UIStateContainer')
		.style('position','relative')
		.style('height','72px')
		.style('top','34px')
		.style('clip-path','inset(0px)'); 


	//start creating the rest of the elements
	//work with the GUIState object
	//  it might be nice to generalize this so that I can just define the GUIParams.GUIState Object to determine what parts to create...

	createMainWindow(UI);
	createGeneralWindow(UI);
	createDataWindow(UI);
	createCameraWindow(UI);

	createParticlesWindow(UI);



	
	// if (GUIParams.containerWidth > 300) {
	// 	//could be nice to center these, but there are lots of built in positions for the sliders and input boxes.  Not worth it
	// 	var pd = 0.//(GUIParams.containerWidth - 300)/2.;
	// 	d3.selectAll('.dropdown-content')
	// 		.style('width',(GUIParams.containerWidth - 10 - pd) + 'px')
	// 		//.style('padding-left',pd + 'px')
	// }








	//create the octree loading bar
	if (GUIParams.haveAnyOctree) createOctreeLoadingBar(UIcontainer);



	// tell the viewer the UI has been initialized
	sendToViewer([{'applyUIoptions':null}]);
	sendToViewer([{'setViewerParamByKey':[true, "haveUI"]}]);

	// collapse the UI initially
	var hamburger = document.getElementById('UItopbar');
	hideUI(hamburger);
	hamburger.classList.toggle("change");	


	// and now reveal the result
	UIcontainer.classed('hidden', false);

}
function defineGUIParticleState(){
	//I will add all the possible windows in here, though some may not be used (based on data and settings)
	GUIParams.partsKeys.forEach(function(p){
		GUIParams.GUIState.main.particles[p] = {
			'current':'main',
			'main':{
				'id' : 'GUI'+p+'Main',
				'name': 'Main',
				'general': {
					'id' : 'GUI'+p+'General',
					'name' : 'General'
				},
				'velocities': {
					'id' : 'GUI'+p+'Velocities',
					'name' : 'Velocities'
				},
				'colormap': {
					'id' : 'GUI'+p+'Colormap',
					'name' : 'Colormap'
				},
				'filters': {
					'id' : 'GUI'+p+'Filters',
					'name' : 'Filters'
				},
				'radii': {
					'id' : 'GUI'+p+'Radii',
					'name' : 'Radii'
				},
			},
			'id' : 'GUIParticles'+p,
			'name': p
		}
	})
}

function transitionUIWindows(state=null, pID=null){
	//if state is null, this will transition to the previous level (unless the previous level is main)
	//will transition from the current UI window (id1) to the desired UI windows (id2)
	//animations taken care of by css

	//check which button was clicked
	var inParticles = false;
	var GUIBase = GUIParams.GUIState;
	//if (this.id == "UIParticlesBackButton") {
	if (pID) {
		inParticles = true;
		GUIBase = GUIParams.GUIState.main.particles[pID];
	}


	//don't try to go back from main
	if (!state && GUIBase.current == 'main') return false

	//get the current state
	var d = GUIBase.current.split('/');
	level = GUIBase;
	d.forEach(function(dd){
		level = level[dd];
	})
	var id1 = level.id;
	var elem1 = d3.select('#'+id1);
	var bbox1 = elem1.node().getBoundingClientRect(); 

	if (state){
		//going forward to a deeper level of the GUI
		d = state.split('/');
		level = GUIBase;
		d.forEach(function(dd){
			level = level[dd];
		})
		var id2 = level.id;

		//transition the clip paths
		//old one off

		elem1.style('transform','translateX(-' + GUIParams.containerWidth + 'px)')


	} else {
		//go back
		//get the current state (in this case it is not included in the state string sent here)
		d = GUIBase.current.split('/');
		d.pop();
		level = GUIBase;
		state = ''
		d.forEach(function(dd,i){
			level = level[dd];
			if (i > 0) state += '/';
			state += dd;
		})
		id2 = level.id;

		//old one off, but moving in the opposite direction 
		elem1.style('transform','translateX(' + GUIParams.containerWidth + 'px)')

	}

	//new one on
	var elem2 = d3.select('#'+id2);
	var bbox2 = elem2.node().getBoundingClientRect(); 
	elem2.style('transform','translateX(0px)')


	var stateTextID  = 'UIStateText';
	var h = bbox2.height + 38;
	if (inParticles){
		stateTextID = pID + 'UIStateText';
		d3.select('#' + pID + 'Dropdown').style('height',h + 'px');
		h += 72;
	}
	console.log(inParticles, pID, state, id1, id2, stateTextID, bbox2, this)


	//update the UI state,
	var w = parseFloat(d3.select('#UIStateContainer').style('width'));
	var stateText = state;
	d3.select('#' + stateTextID).text(stateText);
	//if the text is too long, shorten in
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
	

	//update the UI height

	d3.select('#UIStateContainer').style('height',h + 'px');

	//set the state variable
	GUIBase.current = state;

}

function createMainWindow(container){
	//these will be side by side
	var keys = Object.keys(GUIParams.GUIState.main).filter(function(d){return (d != 'id' && d != 'name')});
	var fullWidth = GUIParams.containerWidth;
	var singleWidth = fullWidth/keys.length - 4;

	var UI = container.append('div')
		.attr('id',GUIParams.GUIState.main.id)
		.attr('class','UImover')
		.style('display','flex')
		.style('position','absolute')
		.style('top','0px')
		.style('height','34px')
		.style('width', fullWidth + 'px')
		.style('transform','translateX(0px)')


	keys.forEach(function(k){
		UI.append('div')
			.attr('id',GUIParams.GUIState.main[k].id + 'button')
			.attr('class','particleDiv')
			.style('width', singleWidth + 'px')
			.style('float','left')
			.style('margin','2px')
			.style('cursor','pointer')
			.on('click',function(){
				transitionUIWindows.call(this, 'main/' + k)
			})
			.append('div')
				.attr('class','pLabelDiv')
				.text(GUIParams.GUIState.main[k].name)
	})

}

function createGeneralWindow(container){
	//these will be side by side
	var keys = Object.keys(GUIParams.GUIState.main.general).filter(function(d){return (d != 'id' && d != 'name')});
	var fullWidth = GUIParams.containerWidth;
	var singleWidth = fullWidth/keys.length - 4;

	var UI = container.append('div')
		.attr('id',GUIParams.GUIState.main.general.id)
		.attr('class','UImover')
		.style('display','flex')
		.style('position','absolute')
		.style('top','0px')
		.style('height','34px')
		.style('width', fullWidth + 'px')
		.style('transform','translateX(' + GUIParams.containerWidth + 'px)')


	keys.forEach(function(k){
		UI.append('div')
			.attr('id',GUIParams.GUIState.main.general[k].id + 'button')
			.attr('class','particleDiv')
			.style('width', singleWidth + 'px')
			.style('float','left')
			.style('margin','2px')
			.style('cursor','pointer')
			.on('click',function(){
				transitionUIWindows.call(this, 'main/general/' + k)
			})
			.append('div')
				.attr('class','pLabelDiv')
				.text(GUIParams.GUIState.main.general[k].name)
	})
}

function createDataWindow(container){
	var UI = container.append('div')
		.attr('id',GUIParams.GUIState.main.general.data.id)
		.attr('class','UImover')
		.style('position','absolute')
		.style('top','0px')
		.style('height','34px')
		.style('width', GUIParams.containerWidth + 'px')
		.style('transform','translateX(' + GUIParams.containerWidth + 'px)')


	// create data controls pane containing:
	//  fullscreen button
	//  take snapshot button
	//  save settings button
	//  default settings button
	//  load settings button
	//  load new data button
	createDataControlsBox(UI);


}

function createCameraWindow(container){

	var UI = container.append('div')
		.attr('id',GUIParams.GUIState.main.general.camera.id)
		.attr('class','UImover')
		.style('position','absolute')
		.style('top','0px')
		.style('height','34px')
		.style('width', GUIParams.containerWidth + 'px')
		.style('transform','translateX(' + GUIParams.containerWidth + 'px)')


	// create camera controls pane containing:
	//  camera center (camera focus) text boxes
	//  camera location text boxes
	//  camera rotation text boxes
	//  save, reset, and recenter buttons
	//  friction and stereo separation sliders
	//  stereo checkbox
	createCameraControlBox(UI);
}

function createParticlesWindow(container){

	var UI = container.append('div')
		.attr('id',GUIParams.GUIState.main.particles.id)
		.attr('class','UImover')
		// .style('display','flex')
		.style('position','absolute')
		.style('top','0px')
		.style('height','34px')
		.style('width', GUIParams.containerWidth + 'px')
		.style('transform','translateX(' + GUIParams.containerWidth + 'px)')


	// create each of the particle group UI base panels containing:
	GUIParams.partsKeys.forEach(function(p,i){
		var dropdown = createParticleBase(UI,p);
		createParticleGeneralBox(dropdown, p);
	});
	


}

function createFPSContainer(container){

	var d = container.insert('div')
		.attr('id','fps_container')
		.style('display','block')
		.style('border-radius','10px 10px 0px 0px')
		.style('width', GUIParams.containerWidth + 4 + 'px') //+4 for the border
		.style('margin','-21px 0px 3px -2px')
		.style('height','20px')
		.style('background-color',getComputedStyle(document.body).getPropertyValue('--UI-border-color'))
		.style('color',getComputedStyle(document.body).getPropertyValue('--UI-text-color'))
		.style('text-align','center')
}


function createColormapContainer(container){
	var h = container.node().getBoundingClientRect().height;
	var tabh = Math.max(h, 100);
	var d = container.append('div')
		.attr('id','colormap_outer_container')
		.style('display','block')
		.style('border-radius','10px 10px 0px 0px')
		.style('width',tabh + 4 + 'px') //+4 for the border
		.style('margin',0)
		.style('height','20px')
		.style('background-color',getComputedStyle(document.body).getPropertyValue('--UI-border-color'))
		.style('transform','translate(' + (GUIParams.containerWidth + 21) + 'px,' + (4 - h) + 'px)rotate(90deg)')
		.style('transform-origin', 'top left')
		.style('visibility', 'hidden')

	var elem = d.append('div')
		.attr('id','colormap_container')
		.attr('class','extension')
		.style('width',h + 4 + 'px') 
		.style('margin','0')
		.style('transform','translate(0,20px)')
		.style('border','2px solid ' + getComputedStyle(document.body).getPropertyValue('--UI-border-color'))
		.style('border-radius','0px 10px 0px 0px')
		.style('clip-path','inset(0px 0px 0px -1px)'); //using -1 so that it doesn't get set to (0px), which would not allow d3 transition!

	var tab = d.append('div')
		.attr('id','colormap_container_tab')
		.style('display','block')
		.style('border-radius','10px 10px 0px 0px')
		.style('width',(tabh + 4) + 'px') //+4 for the border
		.style('background-color',getComputedStyle(document.body).getPropertyValue('--UI-border-color'))
		.style('color',getComputedStyle(document.body).getPropertyValue('--UI-text-color'))
		.style('text-align','left')
		.style('position','absolute')
		.style('bottom','0px')
		.style('height', '20px')
		.append('span')
			.style('padding-left','10px')
			.text('Colormap')
	var btn = tab.append('button')
		.attr('class','dropbtn')
		.attr('id','colormapDropbtn')
		.attr('onclick','expandColormapTab()')
		.style('left',(tabh - 24) + 'px')
		.style('margin-top','2px')
		.html('&#x25B2');

}


function createOctreeLoadingBar(container){

	var d = container.append('div')
		.attr('id','octree_loading_outer_container')
		.style('display','block')
		.style('border-radius','0px 0px 10px 10px')
		.style('width', GUIParams.containerWidth + 4 + 'px') //+4 for the border
		.style('margin','3px 0 -21px -2px')
		.style('border-top','2px solid ' + getComputedStyle(document.body).getPropertyValue('--UI-border-color'))


	var elem = d.append('div')
		.attr('id','octree_loading_container')
		.attr('class','extension')
		.style('width', GUIParams.containerWidth + 'px') 
		.style('margin','0px 0px 2px 1px')

	var tab = d.append('div')
		.attr('id','octree_loading_tab')
		.style('display','block')
		.style('border-radius','0px 0px 10px 10px')
		.style('width', GUIParams.containerWidth + 4 + 'px') //+4 for the border
		.style('background-color',getComputedStyle(document.body).getPropertyValue('--UI-border-color'))
		.style('color',getComputedStyle(document.body).getPropertyValue('--UI-text-color'))
		.style('text-align','center')
		.style('height', '20px')
		.text('Octree Loading Progress')
	var btn = tab.append('button')
		.attr('class','dropbtn')
		.attr('id','octreeLoadingDropbtn')
		.attr('onclick','expandLoadingTab()')
		.style('left',(GUIParams.containerWidth - 28) + 'px')
		.style('margin-top','4px')
		.html('&#x25BC');

	//start with the tabl open
	btn.classed('dropbtn-open',true)
	d.classed('show', true);



	var height = 16;
	var width = GUIParams.containerWidth - GUIParams.longestPartLabelLen - 50;
	var offset = 5;
	var margin = 10;

	var svg = elem.append('svg')
		.attr('id','octreeLoadingBars')
		// .style('position','absolute')
		// .style('left','0px')
		// .style('bottom','0px')
		.attr('width', (width + 2*margin + 120) + 'px')
		.attr('height', height + 'px') //will be adjusted below
		//.style('transform', 'translate(2px,2px)')

	//count to get the full size of the SVG
	var nRects = 0;
	GUIParams.partsKeys.forEach(function(p){
		if (GUIParams.haveOctree[p]){

			svg.append('rect')
				.attr('id',p + 'octreeLoadingOutline')
				.attr('x', '10px')
				.attr('y', (nRects*(height + offset) + margin) + 'px')
				.attr('width',width + 'px')
				.attr('height',height + 'px')
				.attr('fill','rgba(0,0,0,0)')
				.attr('stroke',getComputedStyle(document.body).getPropertyValue('--UI-border-color'))
				.attr('stroke-width', '1')
			svg.append('rect')
				.attr('id',p + 'octreeLoadingFill')
				.attr('class','octreeLoadingFill')
				.attr('x', '10px')
				.attr('y', (nRects*(height + offset) + margin) + 'px')
				.attr('width','0px') //will be updated
				.attr('height',height + 'px')
				.attr('fill','rgb(' + (255*GUIParams.Pcolors[p][0]) + ',' + (255*GUIParams.Pcolors[p][1]) + ',' + (255*GUIParams.Pcolors[p][2]) + ')')
			svg.append('text')
				.attr('id',p + 'octreeLoadingText')
				.attr('class','octreeLoadingText')
				.attr('x', (width + margin + offset) + 'px')
				.attr('y', (nRects*(height + offset) + margin + 0.75*height) + 'px')
				.attr('fill','rgb(' + (255*GUIParams.Pcolors[p][0]) + ',' + (255*GUIParams.Pcolors[p][1]) + ',' + (255*GUIParams.Pcolors[p][2]) + ')')
				.style('font-size', (0.75*height) + 'px')
				.text(p + ' (0/0)')				
			nRects += 1;
		}
	})

	var h = (nRects*(height + offset) + 2.*margin);
	svg.attr('height', h + 'px') 

	//add the clip path
	svg.append('clipPath')
		.attr('id','loadingClipPath')
		.append('rect')
			.attr('id','loadingClipRect')
			.attr('x','0px')
			.attr('y','0px')
			.attr('width',GUIParams.containerWidth + 'px')
			.attr('height', h + 'px')

	svg.attr('clip-path', 'url(#loadingClipPath)')

}



function createDataControlsBox(UI){
	////////////////////////
	//"data" controls"

	var m2 = UI.append('div')
		.attr('class','dropdown-content')
		.attr('id','dataControls')
		.style('margin','0px')
		.style('width',GUIParams.containerWidth + 'px')
		.style('border-radius',0)
	var m2height = 224;

	//decimation
	var dec = m2.append('div')
		.attr('id', 'decimationDiv')
		.style('width',(GUIParams.containerWidth - 10) + 'px')
		.style('margin-left','5px')
		.style('margin-top','10px')
		.style('display','inline-block')
	dec.append('div')
		.attr('class','pLabelDiv')
		.style('width','85px')
		.style('display','inline-block')
		.text('Decimation');
	dec.append('div')
		.attr('class','NSliderClass')
		.attr('id','DSlider')
		.style('margin-left','40px')
		.style('width',(GUIParams.containerWidth - 145) + 'px');
		// .style('margin-left','90px')
		// .style('width',(GUIParams.containerWidth - 200) + 'px');
	dec.append('input')
		.attr('class','NMaxTClass')
		.attr('id','DMaxT')
		.attr('type','text')
		.style('left',(GUIParams.containerWidth - 45) + 'px')
		.style('width','40px');
	if (GUIParams.haveAnyOctree){
		m2height += 50;
		//text to show the memory-imposed decimation
		m2.append('div')
			.attr('id', 'decimationOctreeDiv')
			.style('width',(GUIParams.containerWidth - 10) + 'px')
			.style('margin-left','5px')
			.style('margin-top','10px')
			.style('display','inline-block')
			.append('div')
				.attr('class','pLabelDiv')
				.style('width',(GUIParams.containerWidth - 10) + 'px')
				.style('display','inline-block')
				.style('font-size','12px')
				.text('Octree memory-imposed decimation = ')
				.append('span')
					.attr('id','decimationOctreeSpan')
					.text('1.0');

		//slider to controls the memory limit
		var mem = m2.append('div')
			.attr('id', 'memoryDiv')
			.style('width',(GUIParams.containerWidth - 10) + 'px')
			.style('margin-left','5px')
			.style('margin-top','10px')
			.style('display','inline-block')
		mem.append('div')
			.attr('class','pLabelDiv')
			.style('width','135px')
			.style('display','inline-block')
			.text('Memory Limit (Gb)');
		mem.append('div')
			.attr('class','NSliderClass')
			.attr('id','MSlider')
			.style('margin-left','90px')
			.style('width',(GUIParams.containerWidth - 195) + 'px');
		mem.append('input')
			.attr('class','NMaxTClass')
			.attr('id','MMaxT')
			.attr('type','text')
			.style('left',(GUIParams.containerWidth - 45) + 'px')
			.style('width','40px');
	}

	//fullscreen button
	m2.append('div').attr('id','fullScreenDiv')
		.append('button')
		.attr('id','fullScreenButton')
		.attr('class','button')
		.style('width',(GUIParams.containerWidth - 10) + 'px')
		.attr('onclick','fullscreen();')
		.append('span')
			.text('Fullscreen');

	//snapshots
	var snap = m2.append('div')
		.attr('id','snapshotDiv')
		.attr('class', 'button-div')
		.style('width',(GUIParams.containerWidth - 10) + 'px')
	snap.append('button')
		.attr('class','button')
		.style('width','140px')
		.style('padding','5px')
		.style('margin',0)
		.style('opacity',1)
		.on('click',function(){
			sendToViewer([{'renderImage':null}]);
		})
		.append('span')
			.text('Take Snapshot');

	snap.append('input')
		.attr('id','RenderXText')
		.attr('type', 'text')
		.attr('value',GUIParams.renderWidth)
		.attr('autocomplete','off')
		.attr('class','pTextInput')
		.style('width','50px')
		.style('margin-top','5px')
		.style('margin-right','5px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})
	snap.append('input')
		.attr('id','RenderYText')
		.attr('type', 'text')
		.attr('value',GUIParams.renderHeight)
		.attr('autocomplete','off')
		.attr('class','pTextInput')
		.style('width','50px')
		.style('margin-top','5px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})

	//save preset button
	m2.append('div').attr('id','savePresetDiv')
		.append('button')
		.attr('id','savePresetButton')
		.attr('class','button')
		.style('width',(GUIParams.containerWidth - 10) + 'px')
		.on('click',function(){
			sendToViewer([{'savePreset':null}]);
		})
		.append('span')
			.text('Save Settings');

	//reset to default button
	m2.append('div').attr('id','resetDiv')
		.append('button')
		.attr('id','resetButton')
		.attr('class','button')
		.style('width',(GUIParams.containerWidth - 10)/2. - 3 + 'px')
		.on('click',function(){
			sendToViewer([{'resetToOptions':null}]);
		})
		.append('span')
			.text('Default Settings');
	//reset to preset button
	d3.select('#resetDiv')
		.append('button')
		.attr('id','resetPButton')
		.attr('class','button')
		.style('width',(GUIParams.containerWidth - 10)/2. - 3 + 'px')
		.style('left', (GUIParams.containerWidth - 10)/2. + 2 + 'px')
		.style('margin-left','0px')
		.on('click',function(){
			loadPreset();
		})
		.append('span')
			.text('Load Settings');

	//load new data button
	m2.append('div').attr('id','loadNewDataDiv')
		.append('button')
		.attr('id','loadNewDataButton')
		.attr('class','button')
		.style('width',(GUIParams.containerWidth - 10) + 'px')
		.on('click',function(){
			sendToViewer([{'loadNewData':null}]);
		})
		.append('span')
			.text('Load New Data');

	m2.style('height', m2height + 'px')
		.style('display','block')

	UI.style('height', m2height + 'px')

	// create all the noUISliders
	createDecimationSlider();
	if (GUIParams.haveAnyOctree) createMemorySlider();
}

function createCameraControlBox(UI){
	/////////////////////////
	//camera controls


	var c2height = 190;
	var c2 = UI.append('div')
		.attr('class','dropdown-content')
		.attr('id','cameraControls')
		.style('margin','0px')
		.style('padding','0px 0px 0px 5px')
		.style('width',GUIParams.containerWidth + 'px')
		.style('border-radius',0)

	//center text boxes
	var c3 = c2.append('div')
		.attr('class','pLabelDiv')
		.style('width',(GUIParams.containerWidth - 10) + 'px')
		.style('margin-top','5px') 
	c3.append('div')
		.style('width','62px')
		.style('display','inline-block')
		.text('Center');
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','CenterXText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width',(GUIParams.containerWidth - 150)/3. + 'px')
		.style('margin-right','8px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','CenterYText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width',(GUIParams.containerWidth - 150)/3. + 'px')
		.style('margin-right','8px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','CenterZText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width',(GUIParams.containerWidth - 150)/3. + 'px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
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
			sendToViewer([{'checkCenterLock':this.checked}]);
		})
	if (GUIParams.useTrackball){
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
		.style('width','62px')
		.style('display','inline-block')
		.text('Camera');
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','CameraXText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width',(GUIParams.containerWidth - 150)/3. + 'px')
		.style('margin-right','8px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','CameraYText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width','60px')
		.style('margin-right','8px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','CameraZText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width',(GUIParams.containerWidth - 150)/3. + 'px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})
	//rotation text boxes
	c3 = c2.append('div')
		.attr('class','pLabelDiv')
		.style('width','280px')
		.style('margin-top','5px') 
	c3.append('div')
		.style('width','62px')
		.style('display','inline-block')
		.text('Rotation');
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','RotXText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width',(GUIParams.containerWidth - 150)/3. + 'px')
		.style('margin-right','8px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','RotYText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width',(GUIParams.containerWidth - 150)/3. + 'px')
		.style('margin-right','8px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','RotZText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width',(GUIParams.containerWidth - 150)/3. + 'px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})
	//buttons
	c3 = c2.append('div')
		.attr('class','pLabelDiv')
		.style('width',(GUIParams.containerWidth - 10) + 'px');
	c3.append('button')
		.attr('id','CameraSave')
		.attr('class','button centerButton')
		.style('margin',0)
		.style('margin-right','8px')
		.style('padding','2px')
		.style('width',(GUIParams.containerWidth - 30)/3. + 'px')
		.on('click',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})
		.append('span')
			.text('Save');
	c3.append('button')
		.attr('id','CameraReset')
		.attr('class','button centerButton')
		.style('margin',0)
		.style('margin-right','8px')
		.style('padding','2px')
		.style('width',(GUIParams.containerWidth - 30)/3. + 'px')
		.on('click',function(){
			sendToViewer([{'resetCamera':null}]);
		})
		.append('span')
			.text('Reset');
		c3.append('button')
		.attr('id','CameraRecenter')
		.attr('class','button centerButton')
		.style('margin',0)
		.style('padding','2px')
		.style('width',(GUIParams.containerWidth - 30)/3. + 'px')
		.on('click',function(){
			sendToViewer([{'recenterCamera':null}]);
		})
		.append('span')
			.text('Recenter');

	//camera friction
	c3 = c2.append('div')
		.attr('class','pLabelDiv')
		.attr('id','FrictionDiv')
		// .style('background-color','#808080')
		.style('width',(GUIParams.containerWidth - 10) + 'px')
		.style('padding-top','10px');
	c3.append('div')
		.style('width','55px')
		.style('display','inline-block')
		.text('Friction');
	c3.append('div')
		.attr('class','NSliderClass')
		.attr('id','CFSlider')
		.style('margin-left','10px')
		.style('width',(GUIParams.containerWidth - 115) + 'px');
	c3.append('input')
		.attr('class','NMaxTClass')
		.attr('id','CFMaxT')
		.attr('type','text')
		.style('left',(GUIParams.containerWidth - 45) + 'px')
		.style('width','40px')
		.style('margin-top','-2px');

	//camera stereo separation
	c3 = c2.append('div')
		.attr('class','pLabelDiv')
		.attr('id','StereoSepDiv')
		// .style('background-color','#808080')
		.style('width',(GUIParams.containerWidth - 10) + 'px')
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
			sendToViewer([{'checkStereoLock':this.checked}]);
		});
	if (GUIParams.useStereo){
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
		.style('width',(GUIParams.containerWidth - 145));
	c3.append('input')
		.attr('class','NMaxTClass')
		.attr('id','SSMaxT')
		.attr('type','text')
		.style('left',(GUIParams.containerWidth - 45) + 'px')
		.style('width','40px')
		.style('margin-top','-2px');

	c2.style('height', c2height + 'px')
		.style('display','block')

	UI.style('height', c2height + 'px')

	// camera sliders
	createStereoSlider();
	createFrictionSlider();

	// update the text boxes for camera
	updateUICenterText();
	updateUICameraText();
	updateUIRotText();

	// remove this after fixing the camera input boxes!
	disableCameraInputBoxes();
}

function createParticleUIs(UI){
	
	//TO DO: 
	// remove this function
	//  rework this so that the sliders and filters go with each createParticleUI?  
	//  I need to resize the UI based on the number of particles
	//  reformat particle UIs so that there is an additional level of dropdowns/buttons (as in new design)
	//  remove that "post-facto" resize

	// loop through each of the particle groups and create their UI
	GUIParams.partsKeys.forEach(function(p,i){
		var container = createParticleBase(UI,p);
		console.log('here', p)
		createParticleGeneralBox(container, p);

	});


	// // resize a bit post-facto
	// d3.selectAll('.sp-replacer').style('left',(GUIParams.containerWidth - 60) + 'px');

	// // particle sliders
	// createPsizeSliders();
	// createNpartsSliders();
	// if (GUIParams.haveAnyOctree) createCamNormSliders();

	// // particle group dropdowns
	// createVelWidthSliders();
	// createFilterSliders();
	// createColormapSliders();
}

function createParticleBase(UI, p){

	//  create container divs for each of the particle groups
	var controls = UI.append('div')
		.attr('class',"particleDiv "+p+"Div")
		.attr('id',p+"Div" ) 
		.style('width', (GUIParams.containerWidth - 20) + 'px');

	// size the overall particle group div
	controls.append('div')
		.attr('class','pLabelDiv')
		.style('width',GUIParams.longestPartLabelLen)
		.text(p)
		
	// add the on-off switch
	var onoff = controls.append('label')
		.attr('class','switch');

	onoff.append('input')
		.attr('id',p+'Check')
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.attr('checked','true')
		.on('change',function(){
			sendToViewer([{'checkshowParts':[p,this.checked]}]);})

	if (!GUIParams.showParts[p]){
		elm = document.getElementById(p+'Check');
		elm.checked = false;
		elm.value = false;
	} 

	onoff.append('span')
		.attr('class','slideroo');


	// add the particle size slider
	controls.append('div')
		.attr('id',p+'_PSlider')
		.attr('class','PSliderClass')
		.style('left',(GUIParams.containerWidth - 200) + 'px');

	// add the particle size text input
	controls.append('input')
		.attr('id',p+'_PMaxT')
		.attr('class', 'PMaxTClass')
		.attr('type','text')
		.style('left',(GUIParams.containerWidth - 100) + 'px');

	// add the particle color picker
	controls.append('input')
		.attr('id',p+'ColorPicker');

	createColorPicker(p);
	controls.select('.sp-replacer').style('left',(GUIParams.containerWidth - 60) + 'px');

	createPsizeSlider(p);

	// add the dropdown button and a dropdown container div
	controls.append('button')
		.attr('id', p+'Dropbtn')
		.attr('class', 'dropbtn')
		.attr('onclick','expandParticleDropdown(this)')
		.style('left',(GUIParams.containerWidth - 40) + 'px')
		.html('&#x25BC');

	var keys = Object.keys(GUIParams.GUIState.main.particles[p].main).filter(function(d){return (d != 'id' && d != 'name' && d != 'current')});
	//var h = 34*keys.length
	var h = 34*Math.ceil(keys.length/2.) + 1;

	dropdown = controls.append('div')
		.attr('id',p+'Dropdown')
		.attr('class','dropdown-content')
		.style('width',(GUIParams.containerWidth - 10) + 'px')
		.style('display','flex-wrap')
		.style('height', h + 16 + 'px')
		.style('clip-path', 'inset(0px 0px ' + (h + 16) + 'px 0px)');

	//add an address bar (like in the main controls section) to show the current state of the particle UIs
	var stateBar = dropdown.append('div')
		.style('display','flex')
		.style('position','absolute')
		.style('padding','0px')
		.style('top','0px')
		.style('width', (GUIParams.containerWidth - 10) + 'px')
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
			.html('&#129044;')
			//.text('Back')

	stateBar.append('div')
		.attr('id',p + 'UIStateText')
		.attr('class','UIdiv')
		.style('width', (GUIParams.containerWidth - 51) + 'px')
		.style('margin-left','1px')
		.style('height', '16px')
		.style('font-size','12px')
		.style('line-height','16px')
		.style('float','left')
		.style('padding','0px 0px 0px 10px')
		.style('font-family', '"Lucida Console", "Courier New", monospace')
		.text('main')

	// buttons to navigate to additional particle controls
	var container = dropdown.append('div')
		.attr('id',GUIParams.GUIState.main.particles[p].main.id)
		.attr('class','dropdown-content UImover')
		.style('width',(GUIParams.containerWidth - 10) + 'px')
		.style('display','flex-wrap')
		.style('height', h+ 'px')
		.style('margin-top','16px')
		.style('padding-left','5px')
		.style('clip-path', 'inset(0px 0px 0px 0px)');

	var singleWidth = (GUIParams.containerWidth - 38)/2. - 1;

	keys.forEach(function(k){
		container.append('div')
			.attr('id',GUIParams.GUIState.main.particles[p].main[k].id + 'button')
			.attr('class','particleDiv')
			//.style('width', (GUIParams.containerWidth - 25) + 'px')
			.style('width',singleWidth + 'px')
			.style('float','left')
			.style('margin','2px')
			.style('cursor','pointer')
			.on('click',function(){
				transitionUIWindows.call(this, 'main/' + k, p)
			})
			.append('div')
				.attr('class','pLabelDiv')
				.text(GUIParams.GUIState.main.particles[p].main[k].name)
	})

	return dropdown

}

function createColorPicker(p){
	/* for color pickers*/
	//can I write this in d3? I don't think so.  It needs a jquery object
	$("#"+p+"ColorPicker").spectrum({
		color: "rgba("+(GUIParams.Pcolors[p][0]*255)+","+(GUIParams.Pcolors[p][1]*255)+","+(GUIParams.Pcolors[p][2]*255)+","+GUIParams.Pcolors[p][3]+")",
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

	if (!GUIParams.useColorPicker[p]){
		$("#"+d+"ColorPicker").spectrum({
			color: "rgba("+(GUIParams.Pcolors[p][0]*255)+","+(GUIParams.Pcolors[p][1]*255)+","+(GUIParams.Pcolors[p][2]*255)+","+GUIParams.Pcolors[p][3]+")",
			disabled: true,
		});		
	}

}

function createParticleGeneralBox(container, p){
	/////////////////////////
	//general controls for a particle controls

	var dheight = 0;
	var UI = container.append('div')
		.attr('id',GUIParams.GUIState.main.particles[p].main.general.id)
		.attr('class','UImover')
		.style('position','absolute')
		.style('top','16px')
		.style('height','34px')
		.style('width', GUIParams.containerWidth + 'px')
		.style('transform','translateX(' + GUIParams.containerWidth + 'px)')


	// for octree add a button to dispose of the nodes from memory
	if (GUIParams.haveOctree[p]) {

		var clearMem = UI.append('div')
			.attr('id',p+'_disposer')
		var b = clearMem.append('button')
			.attr('class','button centerButton')
			.style('margin','10px')
			.style('width',(GUIParams.containerWidth - 40) + 'px')
			.on('click',function(){
				sendToViewer([{'disposeOctreeNodes':[p]}]);
			})
		b.append('span').text('Clear from memory')

		UI.append('hr')
			.style('margin','0')
			.style('border','1px solid #909090')

		dheight += 45;

	}

	//dropdown to change blending mode
	var dBcontent = UI.append('div')
		.attr('class','NdDiv');

	dBcontent.append('span')
		.attr('class','pLabelDiv')
		.attr('style','width:115px')
		.text('Blending Mode');

	// add blending mode selector
	var selectBType = dBcontent.append('select')
		.attr('class','selectBlendingMode')
		.attr('id',p+'_selectBlendingMode')
		.on('change',selectBlendingMode)

	var optionsB = selectBType.selectAll('option')
		.data(Object.keys(GUIParams.blendingOpts)).enter()
		.append('option')
			.text(function (d) { return d; });

	elm = document.getElementById(p+'_selectBlendingMode');
	elm.value = GUIParams.blendingMode[p];

	depthCheck = dBcontent.append('label')
		.attr('for',p+'_depthCheckBox')
		.attr('id',p+'_depthCheckBoxLabel')
		.style('display','inline-block')
		.style('margin-left','8px')
		.text('Depth');

	depthCheck.append('input')
		.attr('id',p+'_depthCheckBox')
		.attr('value','false')
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.on('change',function(){
			sendToViewer([{'setDepthMode':[p, this.checked]}]);
		})

	UI.append('hr')
		.style('margin','0')
		.style('border','1px solid #909090');

	dheight += 35;

	// add max number of particles slider 
	dNcontent = UI.append('div')
		.attr('class','NdDiv');

	dNcontent.append('span')
		.attr('class','pLabelDiv')
		.attr('style','width:20px')
		.text(function(){
			if (GUIParams.haveOctree[p]) return '%';
			return 'N';
		});

	dNcontent.append('div')
		.attr('id',p+'_NSlider')
		.attr('class','NSliderClass');

	// add max number of particles text input
	dNcontent.append('input')
		.attr('id',p+'_NMaxT')
		.attr('class', 'NMaxTClass')
		.attr('type','text');

	dheight += 45; // height of the max particles section


	//for octree, slider to change the camera limit
	if (GUIParams.haveOctree[p]){
		dCcontent = UI.append('div')
			.attr('class','NdDiv');
		dCcontent.append('span')
			.attr('class','pLabelDiv')
			.attr('style','width:140px')
			.text('Octree Cam. Norm');
		dCcontent.append('div')
			.attr('id',p+'_CamSlider')
			.attr('class','NSliderClass')
			.style('margin-left','90px')
			.style('width','90px');
		dCcontent.append('input')
			.attr('id',p+'_CamMaxT')
			.attr('class', 'NMaxTClass')
			.attr('type','text');
		dheight += 45;

	}

	UI.style('height',dheight + 'px');
}

function fillParticleDropdown(controls,p){




	// velocity vectors
	if (GUIParams.haveVelocities[p]){
		fillVelocityVectorDropdown(dropdown,p);
		dheight += 150;
	}

	// colormap
	if (GUIParams.haveColormap[p]){
		fillColormapDropdown(dropdown,p);
		dheight += 50;
	}

	// filters
	if (GUIParams.haveFilter[p]){
		fillFilterDropdown(dropdown,p);
		dheight += 115;
	} 
	
	// add the clip path
	dropdown
		.style('height',dheight+'px')
		.style('display','block')
		.style('clip-path', 'inset(0px 0px ' + dheight + 'px 0px')
}

function fillVelocityVectorDropdown(dropdown,p){
	dropdown.append('hr')
		.style('margin','0')
		.style('border','1px solid #909090')

	dVcontent = dropdown.append('div')
		.attr('class','NdDiv');

	// add velocity vector checkbox
	dVcontent.append('input')
		.attr('id',p+'velCheckBox')
		.attr('value','false')
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.on('change',function(){
			sendToViewer([{'checkVelBox':[p, this.checked]}]);
		})

	dVcontent.append('label')
		.attr('for',p+'velCheckBox')
		.text('Plot Velocity Vectors');

	if (GUIParams.showVel[p]){
		elm = document.getElementById(p+'velCheckBox');
		elm.checked = true;
		elm.value = true;
	} 

	// add velocity vector type selector
	var selectVType = dVcontent.append('select')
		.attr('class','selectVelType')
		.attr('id',p+'_SelectVelType')
		.on('change',selectVelType)

	var options = selectVType.selectAll('option')
		.data(Object.keys(GUIParams.velopts)).enter()
		.append('option')
			.text(function (d) { return d; });

	elm = document.getElementById(p+'_SelectVelType');
	elm.value = GUIParams.velType[p];

	// add width input and gradient checkbox
	dVWcontent = dropdown.append('div')
		.attr('class','NdDiv');
	dVWcontent.append('span')
		.attr('class','pLabelDiv')
		.attr('style','width:100px')
		.text('Vector Width');
	dVWcontent.append('div')
		.attr('id',p+'_VelWidthSlider')
		.attr('class','NSliderClass')
		.style('margin-left','48px')
		.style('width','132px');
	dVWcontent.append('input')
		.attr('id',p+'_VelWidthMaxT')
		.attr('class', 'NMaxTClass')
		.attr('type','text');

	dVGcontent = dropdown.append('div')
		.attr('class','NdDiv');

	dVGcontent.append('input')
		.attr('id',p+'velGradientCheckBox')
		.attr('value','false')
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.on('change',function(){
			sendToViewer([{'toggleVelocityGradient':[p, this.checked]}]);
		})

	dVGcontent.append('label')
		.attr('for',p+'velGradientCheckBox')
		.text('Apply Gradient to Vectors');

	// add velocity animator checkbox
	dAVcontent = dropdown.append('div')
		.attr('class','NdDiv');

	dAVcontent.append('input')
		.attr('id',p+'velAnimateCheckBox')
		.attr('value','false')
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.on('change',function(){
			sendToViewer([{'toggleVelocityAnimation':[p, this.checked]}]);
		})

	dAVcontent.append('label')
		.attr('for',p+'velAnimateCheckBox')
		.text('Animate Velocities');

	//add velocity animator input text boxes
	dATVcontent = dropdown.append('div')
		.attr('class','NdDiv');
	dATVcontent.append('label')
		.attr('for',p+'velAnimateDt')
		.text('dt');
	dATVcontent.append('input')
		.attr('id',p+'velAnimateDt')
		.attr('type', 'text')
		.attr('value',GUIParams.animateVelDt)
		.attr('autocomplete','off')
		.attr('class','pTextInput velAnimateDt')
		.style('width','50px')
		.style('margin-left','8px')
		.style('margin-right','20px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value, p]}]);
		})
	dATVcontent.append('label')
		.attr('for',p+'velAnimateTmax')
		.text('tMax');
	dATVcontent.append('input')
		.attr('id',p+'velAnimateTmax')
		.attr('type', 'text')
		.attr('value',GUIParams.animateVelTmax)
		.attr('autocomplete','off')
		.attr('class','pTextInput velAnimateTmax')
		.style('width','50px')
		.style('margin-left','8px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value, p]}]);
		})

	if (GUIParams.animateVel[p]){
		elm = document.getElementById(p+'velAnimateCheckBox');
		elm.checked = true;
		elm.value = true;
	} 


}

function fillColormapDropdown(dropdown,p){
	dropdown.append('hr')
		.style('margin','0')
		.style('border','1px solid #909090')

	var ColorDiv = dropdown.append('div')
		.attr('style','margin:0px;  padding:5px; height:50px')

	// add checkbox to enable colormap
	ColorDiv.append('input')
		.attr('id',p+'colorCheckBox')
		.attr('value','false')
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.on('change',function(){
			checkColormapBox(p, this.checked);
		})

	ColorDiv.append('label')
		.attr('for',p+'colorCheckBox')
		.text('Colormap');

	// dropdown to select colormap
	var selectCMap = ColorDiv.append('select')
		.attr('class','selectCMap')
		.attr('id',p+'_SelectCMap')
		.style('margin-left','4px')
		.on('change', selectColormap)

	var options = selectCMap.selectAll('option')
		.data(GUIParams.colormapList).enter()
		.append('option')
			.attr('value',function(d,i){ return i; })
			.text(function (d) { return d; });

	// dropdown to select colormap variable
	var selectCMapVar = ColorDiv.append('select')
		.attr('class','selectCMapVar')
		.attr('id',p+'_SelectCMapVar')
		.on('change',selectColormapVariable)

	var options = selectCMapVar.selectAll('option')
		.data(GUIParams.ckeys[p]).enter()
		.append('option')
			.attr('value',function(d,i){ return i; })
			.text(function (d) { return d; });

	// sliders for colormap limits
	GUIParams.ckeys[p].forEach(function(ck){
		if (GUIParams.haveColormapSlider){

			colormapsliders = ColorDiv.append('div')
				.attr('id',p+'_CK_'+ck+'_END_CMap')
				.attr('class','CMapClass')

			colormapsliders.append('div')
				.attr('class','CMapClassLabel')

			colormapsliders.append('div')
				.attr('id',p+'_CK_'+ck+'_END_CMapSlider')
				.style("margin-top","-1px")

			colormapsliders.append('input')
				.attr('id',p+'_CK_'+ck+'_END_CMapMinT')
				.attr('class','CMapMinTClass')
				.attr('type','text');

			colormapsliders.append('input')
				.attr('id',p+'_CK_'+ck+'_END_CMapMaxT')
				.attr('class','CMapMaxTClass')
				.attr('type','text');

		}
	});


	// handle if colormap should be enabled at startup by pre-checking
	//  the box
	if (GUIParams.showColormap[p]){
		elm = document.getElementById(p+'colorCheckBox');
		elm.checked = true;
		elm.value = true;
		var idx = parseInt(Math.round(GUIParams.colormap[p]*256/8 - 0.5));
		document.getElementById(p+'_SelectCMap').value = idx.toString();
		document.getElementById(p+'_SelectCMapVar').value = GUIParams.colormapVariable[p].toString();
		createColormapSVG(p);

	} 
	showHideColormapFilter(p, GUIParams.colormapVariable[p]);
}

function fillFilterDropdown(dropdown,p){
	dropdown.append('hr')
		.style('margin','0')
		.style('border','1px solid #909090')

	var filterDiv = dropdown.append('div')
		.attr('style','margin:0px;  padding:5px; height:45px')

	// add filter key selector
	var selectF = filterDiv.append('div')
		//.attr('style', 'height:20px')
		.attr('style','height:20px; display:inline-block')
		.html('Filters &nbsp')	
		.append('select')
		.attr('style','width:160px')
		.attr('class','selectFilter')
		.attr('id',p+'_SelectFilter')
		.on('change',selectFilter)

	var options = selectF.selectAll('option')
		.data(GUIParams.fkeys[p]).enter()
		.append('option')
			.text(function (d) { return d; });

	var invFilter = dropdown.append('div')
		.attr('class','NdDiv');

	var filtn = 0;
	// create sliders for each of the filters
	GUIParams.fkeys[p].forEach(function(fk){
		if (GUIParams.haveFilterSlider[p][fk] != null){

			dfilters = filterDiv.append('div')
				.attr('id',p+'_FK_'+fk+'_END_Filter')
				.attr('class','FilterClass')
				.style('display','block');

			dfilters.append('div')
				.attr('class','FilterClassLabel')

			dfilters.append('div')
				.attr('id',p+'_FK_'+fk+'_END_FilterSlider')
				.style("margin-top","-1px")

			dfilters.append('input')
				.attr('id',p+'_FK_'+fk+'_END_FilterMinT')
				.attr('class','FilterMinTClass')
				.attr('type','text');

			dfilters.append('input')
				.attr('id',p+'_FK_'+fk+'_END_FilterMaxT')
				.attr('class','FilterMaxTClass')
				.attr('type','text');

			invFilter.append('input')
				.attr('id',p+'_FK_'+fk+'_END_InvertFilterCheckBox')
				.attr('value','false')
				.attr('type','checkbox')
				.attr('autocomplete','off')
				.on('change',function(){
					sendToViewer([{'checkInvertFilterBox':[p, fk, this.checked]}]);
				})
			invFilter.append('label')
				.attr('for',p+'_FK_'+fk+'_'+'InvertFilterCheckBox')
				.attr('id',p+'_FK_'+fk+'_END_InvertFilterCheckBoxLabel')
				.style('display','inline-block')
				.text('Invert Filter');

			filtn += 1;

		}
		
		// handle invert filter checkbox
		elm = document.getElementById(p+'_FK_'+fk+'_END_InvertFilterCheckBox');
		elm.checked = GUIParams.invertFilter[p][fk];
		elm.value = GUIParams.invertFilter[p][fk];
		
		if (filtn > 1){
			d3.selectAll('#'+p+'_FK_'+fk+'_END_Filter')
				.style('display','none');
			d3.selectAll('#'+p+'_FK_'+fk+'_END_InvertFilterCheckBox')
				.style('display','none');
			d3.selectAll('#'+p+'_FK_'+fk+'_END_InvertFilterCheckBoxLabel')
				.style('display','none');
		}
	});

	// add playback checkbox and label
	playback = dropdown.append('div')
		.attr('class','NdDiv');
	playback.append('input')
		.attr('id',p+'_PlaybackCheckbox')
		.attr('value','false')
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.style('display','inline-block')
		.on('change',function(){
			togglePlayback(p, this.checked)});
	playback.append('label')
		.attr('for',p+'_'+'PlaybackLabel')
		.attr('id',p+'_PlaybackLabel')
		.text('Playback');

}

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
	//type of symbol to draw velocity vectors (from input box)
	var option = d3.select(this)
		.selectAll("option")
		.filter(function (d, i) { 
			return this.selected; 
	});
	var selectValue = option.property('value');

	var p = this.id.slice(0,-19)
	sendToViewer([{'setBlendingMode':[selectValue, p]}]);
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


//////////////////////
// to move the GUI around on the screen
// from https://www.w3schools.com/howto/howto_js_draggable.asp
//////////////////////
function dragElement(elm, e) {
	var elmnt = document.getElementById("UIcontainer");
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
		GUIParams.movingUI = false;
		e.stopPropagation();
		document.removeEventListener('mouseup', closeDragElement);
		document.removeEventListener('mousemove', elementDrag);

	}
}

/////////////
// for show/hide of elements of the UI
//////////////
function hideUI(x){
	//clip-path has animation in css
	if (!GUIParams.movingUI){

		// change the x to 3 bars
		x.classList.toggle("change");
		GUIParams.UIhidden = !GUIParams.UIhidden

		var elem = d3.select('#UIcontainer');
		var bbox = elem.node().getBoundingClientRect();
		if (GUIParams.UIhidden){
			elem.style('clip-path','inset(3px ' + (bbox.width - 34) + 'px ' + (bbox.height - 34) + 'px 3px')
		}else{
			//check the colormap
			var inset = getUIcontainerInset()
			elem.style('clip-path','inset(-20px ' + (-20 - inset.cbar[0]) + 'px ' + (-20 - inset.cbar[1]) + 'px 0px)');

			// var cwidth = 0;
			// var cheight = 0;
			// if (d3.select('#colormap_outer_container').classed('show')){
			// 	var cbar = d3.select('#colormap_container');
			// 	if (cbar.node()){
			// 		//it's rotated
			// 		cwidth = parseFloat(cbar.style('height')) + 4; // +4 for border
			// 		cheight = parseFloat(cbar.style('width')) + 4 - bbox.height; // +4 for border
			// 	}
			// }
			// elem.transition().duration(duration).style('clip-path','inset(-20px ' + (-20 - cwidth) + 'px -20px 0px)');
			// //elem.style('clip-path','inset(-20px -20px -20px 0px)');

		}

	}
}

function getUIcontainerInset(pID = null){
	//if the colormap is open be sure to update the overall clip-path
	var bbox = d3.select('#UIcontainer').node().getBoundingClientRect();
	var newHeight = 0;
	if (pID){
		//for dropdown
		var dbbox = document.getElementById(pID+'Dropdown').getBoundingClientRect();
		var newHeight = bbox.height - dbbox.height;
	}
	var cwidth = 0;
	var cheight = 0;
	var inset = parseInset(d3.select('#UIcontainer'));	
	if (d3.select('#colormap_outer_container').classed('show')){
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

function expandParticleDropdown(handle) {

	// find the position in the partsKeys list
	var pID = handle.id.slice(0,-7); // remove  "Dropbtn" from id
	document.getElementById(pID+"Dropdown").classList.toggle("show");

	handle.classList.toggle('dropbtn-open');

	//if the colormap is open be sure to update the overall clip-path
	var inset = getUIcontainerInset(pID);
	d3.select('#UIContainer').style('clip-path','inset(-20px ' + inset.inset[1] + 'px ' + inset.inset[2] + 'px 0px)')

	var ddiv = document.getElementById(pID+'Dropdown');

	var bh = parseFloat(d3.select('#GUIParticlesBase').style('height'));

	if (d3.select('#'+pID+"Dropdown").classed('show')){
		d3.select(ddiv)
			.style('margin-bottom', parseFloat(ddiv.style.height) + 72 + 'px')
			.style('clip-path', 'inset(0px 0px 0px 0px'); 
		d3.select('#GUIParticlesBase').style('height',bh + parseFloat(ddiv.style.height) + 'px')
		var ht = parseFloat(ddiv.style.height) + 72;

	} else {
		d3.select(ddiv)
			.style('margin-bottom', '0px')
			.style('clip-path', 'inset(0px 0px ' + parseFloat(ddiv.style.height) + 'px 0px')
		d3.select('#GUIParticlesBase').style('height',bh - parseFloat(ddiv.style.height) + 'px')
		var ht = 72

	}

	//update the height
	d3.select('#UIStateContainer').style('height', ht + 'px')
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
	//all animations are in CSS (because of the clip-pat)
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
	var mode = args[1];
	var dTest = args[2];

	// set the blending mode value in the dropdown
	document.getElementById(p+'_selectBlendingMode').value = mode;

	//also update the checkbox for the depth test
	elm = document.getElementById(p+'_depthCheckBox');
	elm.checked = dTest;
	elm.value = dTest
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