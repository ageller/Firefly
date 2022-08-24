function excluded(url){
	return (url && GUIParams.GUIExcludeList.map((element)=>element.toLowerCase()).includes(url.toLowerCase()))
}

function createSegment(container,parent,name){
	var this_pane = parent[name];
	this_pane.url = parent.url+'/'+this_pane.id;

	if (excluded(this_pane.url)) return 0;
	var return_value = this_pane.builder(container,this_pane,this_pane.id);
	// tell the pane it's been built
	this_pane.built = true;
	return return_value;
}

function createParticleSegment(container,parent,name){
	var this_pane = parent[name];
	this_pane.url = parent.url+'/'+this_pane.id.replace(parent.name,'');
	//console.log(this_pane.url)
	if (excluded(this_pane.url)) return 0;
	return_value = this_pane.builder(container,this_pane,this_pane.id,parent.name);
	// tell the pane it's been built
	this_pane.built = true;
	return return_value;
}

function createControlsBox(container,parent,name){

	var this_pane  = parent[name];

	this_pane.d3Element = container.append('div')
		.attr('class','dropdown-content')
		.attr('id',name+'Controls')
		.style('margin','0px')
		.style('padding','0px 0px 0px 5px') 
		.style('width',GUIParams.containerWidth + 'px')
		.style('border-radius',0)

	var height = 5; // <--- required to match AMG's original hard-coded var m2height = 145;
	this_pane.children.forEach(function(name){
		height+=createSegment(this_pane.d3Element,this_pane,name)})
	
	this_pane.d3Element.style('height', height + 'px')
		.attr('trueHeight', height + 'px')
		.style('display','block')

	container.style('height', height + 'px')
		.attr('trueHeight', height + 'px')

}

function createDecimationSegment(container,parent,name){
	var segment_height = 35;
	//decimation
	var segment = container.append('div')
		.attr('id', name+'Div')
		.style('width',(GUIParams.containerWidth - 10) + 'px')
		.style('margin-left','5px')
		.style('margin-top','10px')
		.style('display','inline-block')
	segment.append('div')
		.attr('class','pLabelDiv')
		.style('width','85px')
		.style('display','inline-block')
		.text('Decimation');
	segment.append('div')
		.attr('class','NSliderClass')
		.attr('id','DSlider')
		.style('margin-left','40px')
		.style('width',(GUIParams.containerWidth - 145) + 'px');
		// .style('margin-left','90px')
		// .style('width',(GUIParams.containerWidth - 200) + 'px');
	segment.append('input')
		.attr('class','NMaxTClass')
		.attr('id','DMaxT')
		.attr('type','text')
		.style('left',(GUIParams.containerWidth - 45) + 'px')
		.style('width','40px');
	if (GUIParams.haveAnyOctree){
		segment_height += 50;
		//text to show the memory-imposed decimation
		container.append('div')
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
		var mem = container.append('div')
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

		createMemorySlider();
	}

	createDecimationSlider();
	return segment_height;
}

function createPresetSegment(container,parent,name){
	var segment_height = 35;
	//save preset button
	container.append('div').attr('id','savePresetDiv')
		.append('button')
		.attr('id','savePresetButton')
		.attr('class','button')
		.style('width',(GUIParams.containerWidth - 10) + 'px')
		.on('click',function(){
			sendToViewer([{'savePreset':null}]);
		})
		.append('span')
		.text('Save Settings');
	return segment_height;
}
function createResetSegment(container,parent,name){
	var segment_height = 35;
	//reset to default button
	var sub_div = container.append('div').attr('id','resetDiv')
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
	d3.select("#resetDiv")
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
	return segment_height;
}

function createLoadNewDataSegment(container,parent,name){
	var segment_height = 0;
	//load new data button
	if (GUIParams.usingSocket){
		container.append('div').attr('id','loadNewDataDiv')
			.append('button')
			.attr('id','loadNewDataButton')
			.attr('class','button')
			.style('width',(GUIParams.containerWidth - 10) + 'px')
			.on('click',function(){
				sendToViewer([{'loadNewData':null}]);
			})
			.append('span')
				.text('Load New Data');
		segment_height += 35;
	}
	return segment_height;
}


function createCenterTextBoxesSegment(container,parent,name){
	// TODO disabling the lock checkbox is tied disabling the center text box
	// TODO: also removed this disableCameraInputBoxes();
	var segment_height = 30;
	//center text boxes
	var c3 = container.append('div')
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
	updateUICenterText();
	return segment_height;
}

function createCameraTextBoxesSegment(container,parent,name){
	// TODO disabling the tween checkbox is tied disabling the camera text box
	var segment_height = 30;
	//camera text boxes
	var c3 = container.append('div')
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
	updateUICameraText();
	return segment_height;
}

function createRotationTextBoxesSegment(container,parent,name){
	var segment_height = 30;
	//rotation text boxes
	var c3 = container.append('div')
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
	updateUIRotText();
	return segment_height;
}

function createCameraButtonsSegment(container,parent,name){
	var segment_height = 30;
	//buttons
	c3 = container.append('div')
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
			.text('Refocus');
	return segment_height;
}

function createFullScreenSegment(container,parent,name){
	var segment_height = 30;
	//fullscreen button
	container.append('div')
		.attr('id','fullScreenDiv')
		.style('margin-left','-5px')
		.append('button')
			.attr('id','fullScreenButton')
			.attr('class','button')
			.style('width',(GUIParams.containerWidth - 10) + 'px')
			.attr('onclick','fullscreen();')
			.append('span')
			.text('Fullscreen');
	return segment_height;
}

function createCameraFrictionSegment(container,parent,name){
	var segment_height = 35;
	//camera friction
	c3 = container.append('div')
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

	createFrictionSlider();
	return segment_height;
}

function createStereoSepSegment(container,parent,name){
	var segment_height = 35;
	//camera stereo separation
	c3 = container.append('div')
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

	createStereoSlider();
	return segment_height;
}

// capture segments
function createCaptureButtonsSegment(container,parent,name){
	var segment_height = 35;
	//snapshots
	var segment = container.append('div')
		.attr('id', 'captureButtonsDiv')
		.style('width',(GUIParams.containerWidth - 10) + 'px')
		.style('margin-left','5px')
		.style('display','flex')

	var snap = segment.append('div')
		.attr('id','snapshotDiv')
		.attr('class', 'button-div')
		.style('width',(GUIParams.containerWidth/2 - 10) + 'px')
		.style('margin-left','0px')

	snap.append('button')
		.attr('class','button')
		.style('width',GUIParams.containerWidth/2-10)
		.style('padding','5px')
		.style('margin',0)
		.style('opacity',1)
		.on('click',function(){
			sendToViewer([{'renderImage':null}]);
		})
		.append('span')
		.text('Take Snapshot');

	var snap = segment.append('div')
		.attr('id','videoDiv')
		.attr('class', 'button-div')
		.style('width',(GUIParams.containerWidth/2 - 10) + 'px')
		.style('margin-left','0px')

	snap.append('button')
		.attr('class','button')
		.style('width',GUIParams.containerWidth/2-10)
		.style('padding','5px')
		.style('margin',0)
		.style('margin-left','4px')
		.style('opacity',1)
		.on('click',function(){
			sendToViewer([{'recordVideo':null}]);
		})
		.append('span')
		.text('Record Video');

	return segment_height;
}

function createCaptureResolutionSegment(container,parent,name){
	segment_height = 32;
	var segment = container.append('div')
		.attr('id', 'captureResolutionDiv')
		.style('width',(GUIParams.containerWidth - 10) + 'px')
		.style('margin-left','5px')
		.style('margin-top','10px')
		.style('display','inline-block')

	segment.append('div')
		.attr('class','pLabelDiv')
		.style('width','130px')
		.style('display','inline-block')
		.text('Capture Region:');

	segment.append('input')
		.attr('id','RenderXText')
		.attr('type', 'text')
		.attr('value',GUIParams.renderWidth)
		.attr('autocomplete','off')
		.attr('class','pTextInput')
		.style('width','50px')
		.style('margin-left','46px')
		.style('margin-right','5px')
		.on('keyup',function(){
			var key = event.keyCode || event.which;
			//if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
			sendToViewer([{'checkText':[this.id, this.value]}]);
		})

	segment.append('input')
		.attr('id','RenderYText')
		.attr('type', 'text')
		.attr('value',GUIParams.renderHeight)
		.attr('autocomplete','off')
		.attr('class','pTextInput')
		.style('width','50px')
		.on('keyup',function(){
			var key = event.keyCode || event.which;
			//if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
			sendToViewer([{'checkText':[this.id, this.value]}]);
		})
	
	return segment_height;
}

function createVideoDurationSegment(container,parent,name){
	var segment_height = 35;

	var segment = container.append('div')
		.attr('id', name+'Div')
		.style('width',(GUIParams.containerWidth - 10) + 'px')
		.style('margin-left','5px')
		.style('margin-top','10px')
		.style('display','inline-block')

	segment.append('div')
		.attr('class','pLabelDiv')
		.style('width','65px')
		.style('display','inline-block')
		.text('Duration:');

	segment.append('input')
		.attr('id','VideoCapture_duration')
		.attr('type', 'text')
		.attr('value',GUIParams.VideoCapture_duration)
		.attr('autocomplete','off')
		.attr('class','pTextInput')
		.style('width','50px')
		.style('margin-left','5px')
		.style('margin-right','5px')
		.on('keyup',function(){
			var key = event.keyCode || event.which;
			//if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
			sendToViewer([{'checkText':[this.id, this.value]}]);
		})

	segment.append('div')
		.attr('class','pLabelDiv')
		.style('width','30px')
		.style('display','inline-block')
		.text('sec');

	segment.append('div')
		.attr('class','pLabelDiv')
		.style('width','35px')
		.style('margin-left','28px')
		.style('display','inline-block')
		.text('FPS:');

	segment.append('input')
		.attr('id','VideoCapture_FPS')
		.attr('type', 'text')
		.attr('value',GUIParams.VideoCapture_FPS)
		.attr('autocomplete','off')
		.attr('class','pTextInput')
		.style('width','50px')
		.style('margin-left','5px')
		.style('margin-right','5px')
		.on('keyup',function(){
			var key = event.keyCode || event.which;
			//if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
			sendToViewer([{'checkText':[this.id, this.value]}]);
		})

	return segment_height;
}

function createVideoFormatSegment(container,parent,name){
	var segment_height = 32;

	var segment = container.append('div')
		.attr('id', name+'Div')
		.style('width',(GUIParams.containerWidth - 10) + 'px')
		.style('margin-left','5px')
		.style('margin-top','10px')
		.style('display','inline-block')

	segment.append('div')
		.attr('class','pLabelDiv')
		.style('width','70px')
		.style('display','inline-block')
		.text('Filename:');

	segment.append('input')
		.attr('id','VideoCapture_filename')
		.attr('type', 'text')
		.attr('value',GUIParams.VideoCapture_filename)
		.attr('autocomplete','off')
		.attr('class','pTextInput')
		.style('width','92px')
		.style('margin-left','5px')
		.style('margin-right','5px')
		.on('keyup',function(){
			var key = event.keyCode || event.which;
			//if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
			sendToViewer([{'checkText':[this.id, this.value]}]);
		})

	segment.append('div')
		.attr('class','pLabelDiv')
		.style('width','55px')
		.style('display','inline-block')
		.text('Format:');

	var selectFormat = segment.append('select')
		.attr('class','selectVideoFormat')
		.attr('id','VideoCapture_format')
		.style('margin-left','5px')
		.style('width','45px')
		.on('change', function(){
			sendToViewer([{'checkText':[this.id, this.value]}]);
		})

	var options = selectFormat.selectAll('option')
		.data(GUIParams.VideoCapture_formats).enter()
		.append('option')
			.attr('value',function(d,i){ return i; })
			.text(function (d) { return d; });

	elm = document.getElementById('VideoCapture_format');
	elm.value = GUIParams.VideoCapture_format;
	return segment_height;
}

function createColumnDensityCheckBoxSegment(container,parent,name){
	var segment_height = 25;
	// add checkbox to enable colormap

	var new_container = container.append('div')
		.attr('id','columnDensityCheckBoxContainer');

	new_container.append('input')
		.attr('id',name+'Elm')
		.attr('value',GUIParams.columnDensity)
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.on('change',function(){
			checkColormapBox(GUIParams.CDkey,this.checked)
			sendToViewer([{'setViewerParamByKey':[this.checked, "columnDensity"]}]);
			GUIParams.columnDensity = this.checked;
		})
		.style('margin','8px 0px 0px 0px')

	new_container.append('label')
		.attr('for','columnDensityCheckBox')
		.text('Enable column density projection')
		.style('margin-left','10px')

	return segment_height;
}

function createColumnDensityLogCheckBoxSegment(container,parent,name){
	var segment_height = 25;
	// add checkbox to toggle log10
	var logContainer = container.append('div')
		.attr('id','columnDensityLog10Container');

	logContainer.append('input')
		.attr('id','columnDensityLogCheckBoxElm')
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
	return segment_height;
}

function createColumnDensitySelectCmapSegment(container,parent,name){
	var segment_height = 25;
	// dropdown to select colormap
	var cmapContainer = container.append('div')
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
	return segment_height;
}

function createColumnDensitySlidersSegment(container,parent,name){
	var segment_height = 35+20;
	// create colorbar limits slider
	container.append('div')
		.style('margin-top','10px')
		.text('Adjust limits below');

	colormapsliders = container.append('div')
		.attr('id',GUIParams.CDkey+'_CK_'+GUIParams.ckeys[GUIParams.CDkey][0]+'_END_CMap')
		.attr('class','CMapClass')
		.style('width', (GUIParams.containerWidth - 100) + 'px');

	colormapsliders.append('div')
		.attr('class','CMapClassLabel')

	colormapsliders.append('div')
		.attr('id',GUIParams.CDkey+'_CK_'+GUIParams.ckeys[GUIParams.CDkey][0]+'_END_CMapSlider')
		//.style("margin-top","-1px")
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
	return segment_height;
}

//////////////
////////////// particle pane constructors below //////////////
//////////////
function createParticleControlsWindow(container,parent,name,p){

	var this_pane = parent[name];
	var keys = Object.keys(this_pane).filter(function(key){return !GUIParams.GUIState_variables.includes(key)});
	this_pane.children = keys;
	this_pane.url = parent.url+'/'+name;
	this_pane.name = p

	var height = 0;
	this_pane.d3Element = container.append('div')
		.attr('id',this_pane.id)
		.attr('class','UImover')
		.style('position','absolute')
		.style('top','16px')
		.style('width', GUIParams.containerWidth + 'px')
		.style('transform','translateX(' + GUIParams.containerWidth + 'px)')

	this_pane.children.forEach(function(name){
		height+=createParticleSegment(this_pane.d3Element,this_pane,name)})
	
	this_pane.d3Element.style('height', height + 'px')
		.attr('trueHeight', height + 'px')
		.style('display','block')

	container.style('height', height + 'px')
		.attr('trueHeight', height + 'px')

}

//////////////
////////////// particle general pane constructors below //////////////
//////////////
function createParticleClearOctreeMemorySegment(container,parent,name,p){
	var segment_height = 0;
	// for octree add a button to dispose of the nodes from memory
	if (GUIParams.haveOctree[p]) {

		var clearMem = container.append('div')
			.attr('id',p+'_disposer')
		var b = clearMem.append('button')
			.attr('class','button centerButton')
			.style('margin','4px')
			.style('width',(GUIParams.containerWidth - 12) + 'px')
			.on('click',function(){
				sendToViewer([{'disposeOctreeNodes':[p]}]);
			})
		b.append('span').text('Clear from memory')

		segment_height += 34;

	}
	return segment_height;
}

function createParticleBlendingModeSelectorsSegment(container,parent,name,p){
	var segment_height = 32;

	//dropdown to change blending mode
	var dBcontent = container.append('div')
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
		.attr('value',GUIParams.depthTest[p])
		.attr('checked',GUIParams.depthTest[p])
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.on('change',function(){
			sendToViewer([{'setDepthMode':[p, this.checked]}]);
		})

	 return segment_height;
}

function createParticleMaxSliderSegment(container,parent,name,p){
	var segment_height = 30; // height of the max particles section

	// add max number of particles slider 
	dNcontent = container.append('div')
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

	createNpartsSlider(p);

	return segment_height;
}

function createParticleOctreeCameraNormSliderSegment(container,parent,name,p){
	var segment_height = 0;
	//for octree, slider to change the camera limit
	if (GUIParams.haveOctree[p]){
		dCcontent = container.append('div')
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
		segment_height += 32;
		createCamNormSlider(p);
	}
	return segment_height;
}

function createParticleRadiusVariableSelectorSegment(container,parent,name,p){
	var segment_height = 0;
	if (GUIParams.rkeys[p].length > 1){

		//dropdown to change blending mode
		var dRcontent = container.append('div')
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

		segment_height += 32;
	}
	return segment_height;
}


//////////////
////////////// particle velocity pane constructors below //////////////
//////////////
function createParticleVelocityCheckBoxSegment(container,parent,name,p){
	var segment_height = 30;
	dVcontent = container.append('div')
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
	return segment_height;
}

function createParticleVelocityWidthSliderSegment(container,parent,name,p){
	var segment_height = 30;
	// add width input
	dVWcontent = container.append('div')
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

	createVelWidthSlider(p)
	return segment_height;
}

function createParticleVelocityGradientCheckBoxSegment(container,parent,name,p){
	segment_height = 30;
	dVGcontent = container.append('div')
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
	return segment_height;
}

function createParticleVelocityAnimatorCheckBoxSegment(container,parent,name,p){
	var segment_height = 30;
	// add velocity animator checkbox
	dAVcontent = container.append('div')
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

	if (GUIParams.animateVel[p]){
		elm = document.getElementById(p+'velAnimateCheckBox');
		elm.checked = true;
		elm.value = true;
	}

	return segment_height;
}

function createParticleVelocityAnimatorTextBoxesSegment(container,parent,name,p){
	var segment_height = 30;
	//add velocity animator input text boxes
	dATVcontent = container.append('div')
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
	return segment_height;
}

//////////////
////////////// particle colormap pane constructors below //////////////
//////////////
function createParticleColormapCheckBoxSegment(container,parent,name,p){
	var segment_height = 30;
	// add checkbox to enable colormap

	var this_container = container.append('div')
		.attr('class','NdDiv');

	this_container.append('input')
		.attr('id',p+'colorCheckBox')
		.attr('value','false')
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.on('change',function(){
			if (GUIParams.showParts[p]) checkColormapBox(p, this.checked);
			else this.checked = GUIParams.showColormap[p];
		})
	this_container.append('label')
		.attr('for',p+'colorCheckBox')
		.text('Colormap')

/*
	return segment_height;
}

function createParticleColormapSelectorSegment(container,parent,name,p){
	var segment_height = 0;
*/
	// dropdown to select colormap
	var selectCMap = this_container.append('select')
		.attr('class','selectCMap')
		.attr('id',p+'_SelectCMap')
		.style('margin-left','4px')
		.on('change', selectColormap)

	var options = selectCMap.selectAll('option')
		.data(GUIParams.colormapList).enter()
		.append('option')
			.attr('value',function(d,i){ return i; })
			.text(function (d) { return d; });

/*
	return segment_height;
}

function createParticleColormapVariableSelectorSegment(container,parent,name,p){
	var segment_height = 0;
*/
	// dropdown to select colormap variable
	var selectCMapVar = this_container.append('select')
		.attr('class','selectCMapVar')
		.attr('id',p+'_SelectCMapVar')
		.style('width', (GUIParams.containerWidth - 192) + 'px')
		.on('change',selectColormapVariable)

	var options = selectCMapVar.selectAll('option')
		.data(GUIParams.ckeys[p]).enter()
		.append('option')
			.attr('value',function(d,i){ return i; })
			.text(function (d) { return d; });
	return segment_height;
}

function createParticleColormapSlidersSegment(container,parent,name,p){
	var segment_height = 32;
	// sliders for colormap limits
	GUIParams.ckeys[p].forEach(function(ck){
		if (GUIParams.haveColormapSlider){
			colormapsliders = container.append('div')
				.attr('id',p+'_CK_'+ck+'_END_CMap')
				.attr('class','CMapClass')
				.style('width', (GUIParams.containerWidth - 100) + 'px');

			colormapsliders.append('div')
				.attr('class','CMapClassLabel')

			colormapsliders.append('div')
				.attr('id',p+'_CK_'+ck+'_END_CMapSlider')
				//.style("margin-top","-1px")
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

	createColormapSliders(p);
	showHideColormapFilter(p, GUIParams.colormapVariable[p]);
	return segment_height;
}

function createParticleFilterSlidersSegment(container,parent,name,p){
	var segment_height = 58;
	var filterDiv = container.append('div')
		.attr('style','margin:0px;  padding:5px; height:45px')

	// add filter key selector
	var selectF = filterDiv.append('div')
		.style('height','20px')
		.style('display','inline-block')
		.text('Filters')	
		.append('select')
			.attr('class','selectFilter')
			.attr('id',p+'_SelectFilter')
			.style('width',(GUIParams.containerWidth - 162) + 'px')
			.on('change',selectFilter)

	var options = selectF.selectAll('option')
		.data(GUIParams.fkeys[p]).enter()
		.append('option')
			.text(function (d) { return d; });

	var invFilter = filterDiv.append('span')
		.style('position','absolute')
		.style('right','8px')

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
				//.style("margin-top","-1px")
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

	createFilterSliders(p)

	return segment_height;
}

function createParticleFilterPlaybackSegment(container,parent,name,p){
	var segment_height = 25;
	// add playback checkbox and label
	playback = container.append('div')
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
	return segment_height;
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