//GLOBAL_arrow = '&#129044;';
GLOBAL_arrow = '&#11104;';

// TO DO: create radii controls for particles
// fix multiple colormaps (alex may have already fixed this, wait until merged into kaitai_io)

window.addEventListener('mouseup',function(){GUIParams.movingUI = false;});
window.addEventListener('resize',checkGUIsize);
document.body.addEventListener('dblclick',resetGUILocation);

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
window.addEventListener('resize', removeTransition);
window.addEventListener('resize', debounce(resetTransition));

///////////////////////////////
////// create the UI
//////////////////////////////
function createUI(){
	//console.log("Creating UI", GUIParams.partsKeys, GUIParams.decimate);

	//add particle data to the GUIState object
	defineGUIParticleState();



	//first get the maximum width of the particle type labels
	var longestPartLabel = '';
	GUIParams.longestPartLabelLen = 0;

	GUIParams.partsKeys.forEach(function(p,i){
		if (p.length > longestPartLabel.length && GUIParams.UIparticle[p]) longestPartLabel = p;
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
	// don't know how to start it expanded so we can hide it later
	//  so will just toggle the bars to an x
	UIr1.node().classList.toggle("change");

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


	var UI = UIcontainer.append('div')
		.attr('id','UIStateContainer')
		.attr('class','UIStateContainer')
		.attr('trueHeight','34px')
		.style('position','relative')
		.style('height','34px')
		.style('margin-bottom','38px')
		.style('top','34px')
		.style('clip-path','inset(0px)'); 


	//start creating the rest of the elements
	//work with the GUIState object
	//  it might be nice to generalize this so that I can just define the GUIParams.GUIState Object to determine what parts to create...

	createMainWindow(UI);
	createGeneralWindow(UI);
	createDataWindow(UI);
	createCameraWindow(UI);
	createColumnDensityWindow(UI);

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
	var stateText = state;
	var stateTextID  = 'UIStateText';
	var stateTextContainerID  = 'UIStateTextContainer';
	if (inParticles) {
		stateTextID = pID + 'UIStateText';
		stateTextContainerID = pID + 'UIStateTextContainer';
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
		if (!GUIParams.UIparticle[k]) return;
		var ddiv = d3.select('#' + k + 'Dropdown');
		ddiv.selectAll('.dropdown-content').classed('show', false);
		if ((inParticles || id2 == 'GUIParticlesBase') && ddiv.classed('show')){
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
	if (inParticles || id2 =='GUIParticlesBase'){
		var hdrop = 0;
		var pheight = 0;
		GUIParams.partsKeys.forEach(function(k){
			if (!GUIParams.UIparticle[k]) return;
			var ddiv = d3.select('#' + k + 'Dropdown');
			var pdiv = d3.select('#' + k + 'Div');

			// the main particle div without the dropdown
			var htmp = parseFloat(pdiv.style('height')) + 2; //2 for margins

			if (ddiv.classed('show')){
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

				dh += 2; // I think I need a slight addition to the sizing per particle, but this needs further testing
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
				var elem = d3.select('#' + obj.id);
				// size checks if the selection caught anything
				if (elem.size()>0 && !elem.classed('show')) elem.style('height','0px');
				elem.select('.dropdown-content').filter(function(){
					if (d3.select(this).classed('show')) return false;
					return true;
				}).style('height','0px');
			}
		}
		Object.keys(obj).forEach(function(k){
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
		.attr('trueHeight','34px')
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
		.attr('trueHeight','34px')
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
		.attr('trueHeight','34px')
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
		.attr('trueHeight','34px')
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

function createColumnDensityWindow(container){

	var UI = container.append('div')
		.attr('id',GUIParams.GUIState.main.general.projection.id)
		.attr('class','UImover')
		.style('position','absolute')
		.style('top','0px')
		.style('height','60px')
		.attr('trueHeight','60px')
		.style('width', GUIParams.containerWidth + 'px')
		.style('transform','translateX(' + GUIParams.containerWidth + 'px)')

	// create camera controls pane containing:
	//  camera center (camera focus) text boxes
	//  camera location text boxes
	//  camera rotation text boxes
	//  save, reset, and recenter buttons
	//  friction and stereo separation sliders
	//  stereo checkbox
	createColumnDensityBox(UI);
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
			.text('Initial Settings');
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
	if (GUIParams.usingSocket){
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
	}
	// height of the load new data button and its padding (found by trial and error)
	else m2height-=45;

	m2.style('height', m2height + 'px')
		.attr('trueHeight', m2height + 'px')
		.style('display','block')

	UI.style('height', m2height + 'px')
		.attr('trueHeight', m2height + 'px')

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
		.style('margin-left','2px')
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
		.style('width',(GUIParams.containerWidth - 10) + 'px')
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
		.style('width',(GUIParams.containerWidth - 150)/3. + 'px')
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

	// tween checkbox
	var c4 = c3.append('span')
		.attr('id','TweenCheckDiv')
		.style('width','65px')
		.style('margin',0)
		.style('margin-left','2px')
		.style('padding',0);
	c4.append('input')
		.attr('id','TweenCheckBox')
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.attr('value',GUIParams.inTween)
		.on('change',function(){
			GUIParams.inTween = this.checked;
			sendToViewer([{'toggleTween':this.checked}]);
		});
	c4.append('label')
		.attr('for','CenterCheckBox')
		.attr('id','CenterCheckLabel')
		.style('font-size','10pt')
		.text('Tween');

	//rotation text boxes
	c3 = c2.append('div')
		.attr('class','pLabelDiv')
		.style('width',(GUIParams.containerWidth - 10) + 'px')
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
		.style('margin-top','-22px')
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
		.style('margin-top','-22px')
		.style('width',(GUIParams.containerWidth - 145));
	c3.append('input')
		.attr('class','NMaxTClass')
		.attr('id','SSMaxT')
		.attr('type','text')
		.style('left',(GUIParams.containerWidth - 45) + 'px')
		.style('width','40px')
		.style('margin-top','-2px');

	c2.style('height', c2height + 'px')
		.attr('trueHeight', c2height + 'px')
		.style('display','block')

	UI.style('height', c2height + 'px')
		.attr('trueHeight', c2height + 'px')

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

function createColumnDensityBox(UI){
	var pheight = 60;
	var columnDensityDiv = UI.append('div')
		.attr('class','dropdown-content')
		.attr('id','projectionControls')
		.style('margin','0px')
		.style('padding','0px 0px 0px 5px')
		.style('width',GUIParams.containerWidth + 'px')
		.style('border-radius',0)
		.attr('trueHeight',pheight)
	
	// add checkbox to enable colormap
	columnDensityDiv.append('input')
		.attr('id','columnDensityCheckBox')
		.attr('value',GUIParams.columnDensity)
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.on('change',function(){
			checkColormapBox(GUIParams.CDkey,this.checked)
			sendToViewer([{'setViewerParamByKey':[this.checked, "columnDensity"]}]);
			GUIParams.columnDensity = this.checked;
		})
		.style('margin','8px 0px 0px 0px')

	columnDensityDiv.append('label')
		.attr('for','columnDensityCheckBox')
		.text('Projection')
		.style('margin-left','10px')
	
	// dropdown to select colormap
	var selectCMap = columnDensityDiv.append('select')
		.attr('class','selectCMap')
		.attr('id',GUIParams.CDkey+'_SelectCMap')
		.style('margin-left','10px')
		.style('margin-top','5px')
		.on('change', selectColormap)

	// add checkbox to toggle log10
	columnDensityDiv.append('input')
		.attr('id','columnDensityLog10CheckBox')
		.attr('value',false)
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.on('change',function(){
			sendToViewer([{'setCDlognorm':[this.checked]}]);
			GUIParams.CDlognorm = this.checked;
			// change the colorbar label
			if (GUIParams.showParts[GUIParams.CDkey] && 
				GUIParams.showColormap[GUIParams.CDkey]) populateColormapAxis(GUIParams.CDkey);
		})
		.style('margin','8px 0px 0px 100px')

	columnDensityDiv.append('label')
		.attr('for','columnDensityLog10CheckBox')
		.text('Take Log10')
		.style('margin-left','10px')

	var options = selectCMap.selectAll('option')
		.data(GUIParams.colormapList).enter()
		.append('option')
			.attr('value',function(d,i){ return i; })
			.text(function (d) { return d; });

	// create colorbar limits slider
	colormapsliders = columnDensityDiv.append('div')
		.attr('id',GUIParams.CDkey+'_CK_'+GUIParams.ckeys[GUIParams.CDkey][0]+'_END_CMap')
		.attr('class','CMapClass')
		.style('width', (GUIParams.containerWidth - 100) + 'px');

	colormapsliders.append('div')
		.attr('class','CMapClassLabel')

	colormapsliders.append('div')
		.attr('id',GUIParams.CDkey+'_CK_'+GUIParams.ckeys[GUIParams.CDkey][0]+'_END_CMapSlider')
		.style("margin-top","-1px")
		.style('left','-8px')

	colormapsliders.append('input')
		.attr('id',GUIParams.CDkey+'_CK_'+GUIParams.ckeys[GUIParams.CDkey][0]+'_END_CMapMinT')
		.attr('class','CMapMinTClass')
		.attr('type','text');

	colormapsliders.append('input')
		.attr('id',GUIParams.CDkey+'_CK_'+GUIParams.ckeys[GUIParams.CDkey][0]+'_END_CMapMaxT')
		.attr('class','CMapMaxTClass')
		.attr('type','text')
		.style('left',(GUIParams.containerWidth - 103) + 'px');

	createColormapSlider(GUIParams.CDkey,GUIParams.ckeys[GUIParams.CDkey][0]);

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
		//console.log('checking', bbox)
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
	document.getElementById(p+'_selectBlendingMode').value = mode;

	//also update the checkbox for the depth test
	elm = document.getElementById(p+'_depthCheckBox');
	elm.checked = dTest;
	elm.value = dTest;
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
	//if the bottom of the GUI extends off the page, force the GUI size to get smaller (is possible) and add a scroll bar
	var bbox = document.getElementById('UIcontainer').getBoundingClientRect();
	var bottom = bbox.bottom
	if (GUIParams.haveAnyOctree) bottom += 20; //20 to account for the octree loading tab

	var windowHeight = window.innerHeight;
	var container = d3.select('#UIStateContainer');
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