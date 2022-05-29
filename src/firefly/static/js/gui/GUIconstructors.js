function createColumnDensityControlsBox(UI){

	UI.style('height', '135px')
		.attr('trueHeight', '135px')

	var columnDensityDiv = UI.append('div')
		.attr('class','dropdown-content')
		.attr('id','projectionControls')
		.style('margin','0px')
		.style('padding','0px 0px 0px 5px')
		.style('width',GUIParams.containerWidth + 'px')
		.style('border-radius',0)
	
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
		.text('Enable column density projection')
		.style('margin-left','10px')
	


	// add checkbox to toggle log10
	var logContainer = columnDensityDiv.append('div')
		.attr('id','columnDensityLog10Container');

	logContainer.append('input')
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
		.style('margin','8px 0px 0px 0px')

	logContainer.append('label')
		.attr('for','columnDensityLog10CheckBox')
		.text('Take Log10')
		.style('margin-left','10px')



	// dropdown to select colormap
	var cmapContainer = columnDensityDiv.append('div')
		.attr('id','columnDensityCmapContainer')
		.style('margin-top','5px');

	cmapContainer.append('label')
		.attr('for', GUIParams.CDkey+'_SelectCMap')
		.text('Select colormap :')

	var selectCMap = cmapContainer.append('select')
		.attr('class','selectCMap')
		.attr('id',GUIParams.CDkey+'_SelectCMap')
		.style('margin-left','10px')
		.on('change', selectColormap)

	var options = selectCMap.selectAll('option')
		.data(GUIParams.colormapList).enter()
		.append('option')
			.attr('value',function(d,i){ return i; })
			.text(function (d) { return d; });

	// create colorbar limits slider
	columnDensityDiv.append('div')
		.style('margin-top','10px')
		.text('Adjust limits below');

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

function createDataControlsBox(UI){
	////////////////////////
	//"data" controls"

	var m2 = UI.append('div')
		.attr('class','dropdown-content')
		.attr('id','dataControls')
		.style('margin','0px')
		.style('width',GUIParams.containerWidth + 'px')
		.style('border-radius',0)
	var m2height = 145;

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

function createCameraControlsBox(UI){
	/////////////////////////
	//camera controls


	var c2height = 260;
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
	if (GUIParams.haveTween){
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
	}

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
			sendToViewer([{'saveCamera':null}]);
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

	//fullscreen button
	c2.append('div')
		.attr('id','fullScreenDiv')
		.style('margin-left','-5px')
		.append('button')
			.attr('id','fullScreenButton')
			.attr('class','button')
			.style('width',(GUIParams.containerWidth - 10) + 'px')
			.attr('onclick','fullscreen();')
			.append('span')
				.text('Fullscreen');

	//snapshots
	var snap = c2.append('div')
		.attr('id','snapshotDiv')
		.attr('class', 'button-div')
		.style('width',(GUIParams.containerWidth - 10) + 'px')
		.style('margin-left','0px')
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
		.on('keyup',function(){
			var key = event.keyCode || event.which;
			//if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
			sendToViewer([{'checkText':[this.id, this.value]}]);
		})
	snap.append('input')
		.attr('id','RenderYText')
		.attr('type', 'text')
		.attr('value',GUIParams.renderHeight)
		.attr('autocomplete','off')
		.attr('class','pTextInput')
		.style('width','50px')
		.style('margin-top','5px')
		.on('keyup',function(){
			var key = event.keyCode || event.which;
			//if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
			sendToViewer([{'checkText':[this.id, this.value]}]);
		})

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