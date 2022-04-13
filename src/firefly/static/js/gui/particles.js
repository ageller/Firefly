function defineGUIParticleState(){
	//I will add all the possible windows in here, though some may not be used (based on data and settings)
	GUIParams.partsKeys.forEach(function(p){
		GUIParams.GUIState.main.particles[p] = {
			'current':'base',
			'base':{
				'id' : 'GUI'+p+'Base',
				'name': 'Base',
				'general': {
					'id' : 'GUI'+p+'General',
					'name' : 'General',
					'function' : createParticleGeneralWindow
				},

			},
		};


		if (GUIParams.haveVelocities[p]){
			GUIParams.GUIState.main.particles[p].base.velocities = {
				'id' : 'GUI'+p+'Velocities',
				'name' : 'Velocities',
				'function' : createParticleVelocityWindow

			};
		}

		if (GUIParams.haveColormap[p]){
			GUIParams.GUIState.main.particles[p].base.colormap = {
				'id' : 'GUI'+p+'Colormap',
				'name' : 'Colormap',
				'function' : createParticleColormapWindow
			};
		}

		if (GUIParams.haveFilter[p]){
			GUIParams.GUIState.main.particles[p].base.filters = {
				'id' : 'GUI'+p+'Filters',
				'name' : 'Filters',
				'function' : createParticleFilterWindow
			}
		}

		// rather than make its own window let's put radii in general
		//  since we'll only ever need the dropdown
		/*
		if (GUIParams.haveRadii[p]){
			GUIParams.GUIState.main.particles[p].base.radii = {
				'id' : 'GUI'+p+'Radii',
				'name' : 'Radii'
				//TO DO : create a function and enter it here
			};
		}
		*/

	})
}

function createParticlesWindow(container){

	var UI = container.append('div')
		.attr('id',GUIParams.GUIState.main.particles.id)
		.attr('class','UImover')
		// .style('display','flex')
		.style('position','absolute')
		.style('top','0px')
		.style('height','34px')
		.attr('trueHeight','34px')
		.style('width', GUIParams.containerWidth + 'px')
		.style('transform','translateX(' + GUIParams.containerWidth + 'px)')


	// create each of the particle group UI base panels containing:
	GUIParams.partsKeys.forEach(function(p,i){
		if (GUIParams.UIparticle[p]) createParticleBase(UI,p);
	});
	

}

function createParticleBase(UI, p){

	//  create container divs for each of the particle groups
	var controls = UI.append('div')
		.attr('class',"particleDiv "+p+"Div")
		.attr('id',p+"Div" ) 
		.style('width', (GUIParams.containerWidth - 4) + 'px')
		.style('height','32px')
		.attr('trueHeight','32px')
		.style('margin-bottom','0px')
		.style('padding','0px')

	var container = controls.append('div')
		.attr('id',p + 'BaseContainer')
		.style('height','33px')
		.attr('trueHeight','33px');

	// size the overall particle group div
	container.append('div')
		.attr('class','pLabelDiv')
		.style('padding-top','7px')
		.style('width',GUIParams.longestPartLabelLen)
		.text(p)
		
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

	// add the particle color picker
	container.append('input')
		.attr('id',p+'ColorPicker');
	createColorPicker(p);
	container.select('.sp-replacer').style('left',(GUIParams.containerWidth - 54) + 'px');

	createPsizeSlider(p);

	// add the dropdown button and a dropdown container div
	if (GUIParams.UIdropdown[p]){
	container.append('button')
		.attr('id', p+'Dropbtn')
		.attr('class', 'dropbtn')
		.attr('onclick','expandParticleDropdown(this)')
		.style('left',(GUIParams.containerWidth - 28) + 'px')
		.style('top','-22px')
		.html('&#x25BC');
	}

	var keys = Object.keys(GUIParams.GUIState.main.particles[p].base).filter(function(d){return (d != 'id' && d != 'name' && d != 'current')});
	//var h = 34*keys.length
	var h = 34*Math.ceil(keys.length/2.) + 1;

	dropdown = controls.append('div')
		.attr('id',p+'Dropdown')
		.attr('class','dropdown-content')
		.style('width',(GUIParams.containerWidth - 4) + 'px')
		.style('display','flex-wrap')
		.style('top', '0px') 
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
			.text('base')

	// buttons to navigate to additional particle controls
	var container = dropdown.append('div')
		.attr('id',GUIParams.GUIState.main.particles[p].base.id)
		.attr('class','dropdown-content UImover')
		.style('width',(GUIParams.containerWidth - 7) + 'px')
		.style('display','flex-wrap')
		.style('height', h + 'px')
		.attr('trueHeight', h + 'px')
		.style('margin-top','16px')
		.style('margin-left','1px')
		.style('clip-path', 'inset(0px 0px 0px 0px)');

	var singleWidth = (GUIParams.containerWidth - 38)/2. + 1.5;

	keys.forEach(function(k){
		//create the button on the base window
		if (GUIParams.GUIState.main.particles[p].base[k].hasOwnProperty('function')) {
			container.append('div')
				.attr('id',GUIParams.GUIState.main.particles[p].base[k].id + 'button')
				.attr('class','particleDiv')
				//.style('width', (GUIParams.containerWidth - 25) + 'px')
				.style('width',singleWidth + 'px')
				.style('float','left')
				.style('margin','2px')
				.style('cursor','pointer')
				.on('click',function(){
					transitionUIWindows.call(this, 'base/' + k, p)
				})
				.append('div')
					.attr('class','pLabelDiv')
					.text(GUIParams.GUIState.main.particles[p].base[k].name)

			//create the UI for this key
			GUIParams.GUIState.main.particles[p].base[k].function(dropdown, p);
		}

	})

	return dropdown

}



function createParticleGeneralWindow(container, p){
	/////////////////////////
	//general controls for a particles

	var dheight = 0;
	var UI = container.append('div')
		.attr('id',GUIParams.GUIState.main.particles[p].base.general.id)
		.attr('class','UImover')
		.style('position','absolute')
		.style('top','16px')
		.style('height','34px')
		.attr('trueHeight','34px')
		.style('width', GUIParams.containerWidth + 'px')
		.style('transform','translateX(' + GUIParams.containerWidth + 'px)')


	// for octree add a button to dispose of the nodes from memory
	if (GUIParams.haveOctree[p]) {

		var clearMem = UI.append('div')
			.attr('id',p+'_disposer')
		var b = clearMem.append('button')
			.attr('class','button centerButton')
			.style('margin','4px')
			.style('width',(GUIParams.containerWidth - 12) + 'px')
			.on('click',function(){
				sendToViewer([{'disposeOctreeNodes':[p]}]);
			})
		b.append('span').text('Clear from memory')

		UI.append('hr')
			.style('margin','0')
			.style('border','1px solid #909090')

		dheight += 34;

	}

	//dropdown to change blending mode
	var dBcontent = UI.append('div')
		.attr('class','NdDiv');

	dBcontent.append('span')
		.attr('class','pLabelDiv')
		.style('width','115px')
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

	dheight += 32;

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
		.attr('id',p+'_plotNmaxSlider')
		.attr('class','NSliderClass')
		.style('width',(GUIParams.containerWidth - 106) + 'px');

	// add max number of particles text input
	dNcontent.append('input')
		.attr('id',p+'_NMaxT')
		.attr('class', 'NMaxTClass')
		.attr('type','text')
		.style('left',(GUIParams.containerWidth - 48) + 'px');

	dheight += 30; // height of the max particles section


	//for octree, slider to change the camera limit
	if (GUIParams.haveOctree[p]){
		UI.append('hr')
			.style('margin','0')
			.style('border','1px solid #909090');
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
			.style('width',(GUIParams.containerWidth - 196) + 'px');
		dCcontent.append('input')
			.attr('id',p+'_CamMaxT')
			.attr('class', 'NMaxTClass')
			.attr('type','text')
			.style('left',(GUIParams.containerWidth - 48) + 'px');
		dheight += 32;
		createCamNormSlider(p);
	}

	if (GUIParams.rkeys[p].length > 1){

		UI.append('hr')
			.style('margin','0')
			.style('border','1px solid #909090');

		//dropdown to change blending mode
		var dRcontent = UI.append('div')
			.attr('class','NdDiv');

		dRcontent.append('span')
			.attr('class','pLabelDiv')
			.style('width','115px')
			.text('Radius Variable');

		// add blending mode selector
		var selectRType = dRcontent.append('select')
			.attr('class','selectRadiusVariable')
			.attr('id',p+'_selectRadiusVariable')
			.on('change',selectRadiusVariable)

		var optionsR = selectRType.selectAll('option')
			.data(GUIParams.rkeys[p]).enter()
			.append('option')
				.text(function (d) { return d; });

		elm = document.getElementById(p+'_selectRadiusVariable');
		elm.value = GUIParams.rkeys[p][GUIParams.radiusVariable[p]];

		dheight += 32;

	}

	UI.style('height',dheight + 'px')
		.attr('trueHeight',dheight + 'px');

	createNpartsSlider(p);

}


function createParticleVelocityWindow(container, p){
	/////////////////////////
	//velocity controls for a particles
	var UI = container.append('div')
		.attr('id',GUIParams.GUIState.main.particles[p].base.velocities.id)
		.attr('class','UImover')
		.style('position','absolute')
		.style('top','16px')
		.style('height','154px')
		.attr('trueHeight','154px')
		.style('width', GUIParams.containerWidth + 'px')
		.style('transform','translateX(' + GUIParams.containerWidth + 'px)')



	dVcontent = UI.append('div')
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
		.style('width',(GUIParams.containerWidth - 192) + 'px')
		.on('change',selectVelType)

	var options = selectVType.selectAll('option')
		.data(Object.keys(GUIParams.velopts)).enter()
		.append('option')
			.text(function (d) { return d; });

	elm = document.getElementById(p+'_SelectVelType');
	elm.value = GUIParams.velType[p];

	// add width input and gradient checkbox
	dVWcontent = UI.append('div')
		.attr('class','NdDiv');
	dVWcontent.append('span')
		.attr('class','pLabelDiv')
		.attr('style','width:100px')
		.text('Vector Width');
	dVWcontent.append('div')
		.attr('id',p+'_VelWidthSlider')
		.attr('class','NSliderClass')
		.style('margin-left','48px')
		.style('width',(GUIParams.containerWidth - 154) + 'px');
	dVWcontent.append('input')
		.attr('id',p+'_VelWidthMaxT')
		.attr('class', 'NMaxTClass')
		.attr('type','text')
		.style('left',(GUIParams.containerWidth - 48) + 'px');

	UI.append('hr')
		.style('margin','0')
		.style('border','1px solid #909090')

	dVGcontent = UI.append('div')
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

	UI.append('hr')
		.style('margin','0')
		.style('border','1px solid #909090')

	// add velocity animator checkbox
	dAVcontent = UI.append('div')
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
	dATVcontent = UI.append('div')
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

	createVelWidthSlider(p)
}

function createParticleColormapWindow(container, p){
	/////////////////////////
	//colormap controls for a particles

	var UI = container.append('div')
		.attr('id',GUIParams.GUIState.main.particles[p].base.colormap.id)
		.attr('class','UImover')
		.style('position','absolute')
		.style('top','16px')
		.style('height','54px')
		.attr('trueHeight','54px')
		.style('width', GUIParams.containerWidth + 'px')
		.style('transform','translateX(' + GUIParams.containerWidth + 'px)');


	var ColorDiv = UI.append('div')
		.attr('style','margin:0px;  padding:5px; height:50px')

	// add checkbox to enable colormap
	ColorDiv.append('input')
		.attr('id',p+'colorCheckBox')
		.attr('value','false')
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.on('change',function(){
			if (GUIParams.showParts[p]) checkColormapBox(p, this.checked);
			else this.checked=GUIParams.showColormap[p];
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
		.style('width', (GUIParams.containerWidth - 192) + 'px')
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
				.style('width', (GUIParams.containerWidth - 100) + 'px');

			colormapsliders.append('div')
				.attr('class','CMapClassLabel')

			colormapsliders.append('div')
				.attr('id',p+'_CK_'+ck+'_END_CMapSlider')
				.style("margin-top","-1px")
				.style('left','-8px')

			colormapsliders.append('input')
				.attr('id',p+'_CK_'+ck+'_END_CMapMinT')
				.attr('class','CMapMinTClass')
				.attr('type','text');

			colormapsliders.append('input')
				.attr('id',p+'_CK_'+ck+'_END_CMapMaxT')
				.attr('class','CMapMaxTClass')
				.attr('type','text')
				.style('left',(GUIParams.containerWidth - 103) + 'px');

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

	createColormapSliders(p);
}

function createParticleFilterWindow(container, p){
	/////////////////////////
	//filter controls for a particles

	var UI = container.append('div')
		.attr('id',GUIParams.GUIState.main.particles[p].base.filters.id)
		.attr('class','UImover')
		.style('position','absolute')
		.style('top','16px')
		.style('height','116px')
		.attr('trueHeight','116px')
		.style('width', GUIParams.containerWidth + 'px')
		.style('transform','translateX(' + GUIParams.containerWidth + 'px)');


	var filterDiv = UI.append('div')
		.attr('style','margin:0px;  padding:5px; height:45px')

	// add filter key selector
	var selectF = filterDiv.append('div')
		.style('height','20px')
		.style('display','inline-block')
		.text('Filters')	
		.append('select')
			.attr('class','selectFilter')
			.attr('id',p+'_SelectFilter')
			.style('width',(GUIParams.containerWidth - 62) + 'px')
			.on('change',selectFilter)

	var options = selectF.selectAll('option')
		.data(GUIParams.fkeys[p]).enter()
		.append('option')
			.text(function (d) { return d; });

	var invFilter = UI.append('div')
		.attr('class','NdDiv');

	var filtn = 0;
	// create sliders for each of the filters
	GUIParams.fkeys[p].forEach(function(fk){
		if (GUIParams.haveFilterSlider[p][fk] != null){

			dfilters = filterDiv.append('div')
				.attr('id',p+'_FK_'+fk+'_END_Filter')
				.attr('class','FilterClass')
				.style('display','block')
				.style('width', (GUIParams.containerWidth - 100) + 'px');

			dfilters.append('div')
				.attr('class','FilterClassLabel')

			dfilters.append('div')
				.attr('id',p+'_FK_'+fk+'_END_FilterSlider')
				.style("margin-top","-1px")
				.style('left','-8px')

			dfilters.append('input')
				.attr('id',p+'_FK_'+fk+'_END_FilterMinT')
				.attr('class','FilterMinTClass')
				.attr('type','text');

			dfilters.append('input')
				.attr('id',p+'_FK_'+fk+'_END_FilterMaxT')
				.attr('class','FilterMaxTClass')
				.attr('type','text')
				.style('left',(GUIParams.containerWidth - 103) + 'px');

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
	playback = UI.append('div')
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

	createFilterSliders(p)
}


function expandParticleDropdown(handle) {

	//get the current height of the particle container
	var h0 = parseFloat(d3.select('#UIStateContainer').attr('trueHeight'));

	// find particle ID for this dropdown and toggle the classes
	var pID = handle.id.slice(0,-7); // remove  "Dropbtn" from id
	var ddiv = d3.select('#' + pID + 'Dropdown');
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
		h0 += hdrop
	} else {
		ddiv
			.style('clip-path', 'inset(0px 0px ' + parseFloat(ddiv.style.height) + 'px 0px')
			.style('height','0px');
		pdiv.style('margin-bottom', '0px');
		elem.style('height', '0px');
		h0 -= hdrop
	}


	//reset the height of the containers
	d3.select('#GUIParticlesBase').style('height',h0 + 'px')
	d3.select('#UIStateContainer')
		.style('height',h0 + 'px') 
		.attr('trueHeight',h0 + 'px')

	//if the colormap is open be sure to update the overall clip-path
	var inset = getUIcontainerInset(pID);
	d3.select('#UIContainer').style('clip-path','inset(-20px ' + inset.inset[1] + 'px ' + inset.inset[2] + 'px 0px)');

	setTimeout(checkGUIsize, 500);
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
		$("#"+p+"ColorPicker").spectrum({
			color: "rgba("+(GUIParams.Pcolors[p][0]*255)+","+(GUIParams.Pcolors[p][1]*255)+","+(GUIParams.Pcolors[p][2]*255)+","+GUIParams.Pcolors[p][3]+")",
			disabled: true,
		});		
	}

}