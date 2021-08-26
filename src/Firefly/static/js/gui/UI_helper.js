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
	selectValue = option.property('value');

	var p = this.id.slice(0,-14)
	sendToViewer([{'setViewerParamByKey':[selectValue, "velType",p]}]);
}

function changeUISnapSizes(){
	//size of the snapshot (from text input)
	document.getElementById("RenderXText").value = GUIParams.renderWidth;
	document.getElementById("RenderYText").value = GUIParams.renderHeight;
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
			UIc.style.width = GUIParams.containerWidth + 'px';
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

function expandDropdown(handle) {
	var offset = 5;

	// find the position in the partsKeys list
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