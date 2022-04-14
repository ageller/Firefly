///////////////////////////
// wait at splash until GUI and viewer are ready w/ callbacks
///////////////////////////
function makeUI(local=false){
	if (!local){
		initGUIScene();
		if (!GUIParams.animating) animateGUI();
	}
	
	console.log("waiting for GUI init...")
	clearInterval(GUIParams.waitForInit);

	GUIParams.waitForInit = setInterval(function(){ 
		var ready = confirmGUIInit();
		if (ready){
			console.log("GUI ready.")
			clearInterval(GUIParams.waitForInit);

			// handle detached socket case, draw a cube
			if (!local) {
				showSplash(false);
				createCube();
			}
			if (GUIParams.cameraNeedsUpdate) updateGUICamera();
			createUI();
		}
	}, 1000);

	// check that the width stabilizes before revealing the UI
	UIcontainer = d3.select('#UIContainer')
	var bbox = UIcontainer.node().getBoundingClientRect();
	prev_count = bbox.width;//countNodes(UIcontainer.node());
	waitForBuild = setInterval(function(){
		var bbox = UIcontainer.node().getBoundingClientRect();
		next_count = bbox.width;//countNodes(UIcontainer.node());
		//console.log('UI width:',prev_count,next_count)
		if (prev_count == next_count && next_count > 10){
			clearInterval(waitForBuild);
			// collapse the UI initially, but wait a bit to make sure the full UI has been created
			hideUI.call(document.getElementById('Hamburger'));
			// and now reveal the result
			UIcontainer.classed('hidden', false)
		}
		prev_count = next_count;
	},100);
}

function confirmGUIInit(){
	if (!GUIParams.GUIready) return false;

	var keys = ["partsKeys", "PsizeMult", "plotNmax", "decimate", "stereoSepMax", "friction", "Pcolors", "showParts", "showVel", "velopts", "velType", "ckeys", "colormapVals", "colormapLims", "colormapVariable", "colormap", "showColormap", "fkeys", "filterVals", "filterLims"];
	var ready = keys.every(function(k,i){
		if (GUIParams[k] == null) {
			//console.log("GUI missing ", k)
			return false;
		}
		return true;
	});
	return ready
}

function clearGUIinterval(){ clearInterval(GUIParams.waitForInit); }

// show the button on the splash screen
function showLoadingButton(id){
	var screenWidth = parseFloat(window.innerWidth);
	var width = parseFloat(d3.select(id).style('width'));
	d3.select(id)
		.style('display','inline')
		.style('margin-left',(screenWidth - width)/2);
}

// for loading and reading a startup file with multiple entries
function selectFromStartup(prefix=""){
	var screenWidth = parseFloat(window.innerWidth);

	var dirs = [];
	Object.keys(GUIParams.dir).forEach(function(d, i) {
		dirs.push(GUIParams.dir[i]);
	});

//https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog
//https://www.w3schools.com/howto/howto_css_modals.asp
	var dialog = d3.select('#splashdivLoader').append('div');
	dialog.attr('id','startupModal').attr('class','modal');

	var form = dialog.append('div')
		.attr('class','modal-content')

	var section = form.append('div')
	section.append('div')
		.attr('class','modal-header')
		.html('Select the startup directory : <br />');

	var mid = section.append('div')
		.attr('class','modal-body')
		.style('height','20px')

	var select = mid.append('select')
		.attr('id','selectedStartup');

	var options = select.selectAll('option')
		.data(dirs).enter()
			.append('option')
				.text(function (d) { return d; });

	var menu = form.append('div').attr('class','modal-footer');
	menu.append('button')
		.attr('id','cancelSelection')
		.attr('class', 'button')
		.style('width','100px')
		.append('span')
			.text('Cancel');
	menu.append('button')
		.attr('id','submitSelection')
		.attr('class', 'button')
		.style('width','100px')
		.append('span')
			.text('Confirm');

	var updateButton = document.getElementById('selectStartupButton');
	var cancelButton = document.getElementById('cancelSelection');
	var submitButton = document.getElementById('submitSelection');
	var startupModal = document.getElementById('startupModal');
	var selection = document.getElementById('selectedStartup');

	selection.value = dirs[0]
	selection.defaultValue = dirs[0]

	// Update button opens a modal dialog
	updateButton.addEventListener('click', function() {
		startupModal.style.display = "block";
	});

	// Form cancel button closes the modal box
	cancelButton.addEventListener('click', function() {
		startupModal.style.display = "none";
	});

	// submit fires the loader
	submitButton.addEventListener('click', function() {
		startupModal.style.display = "none";
		var f = prefix + selection.value+'/filenames.json';
		d3.json(f,  function(files) {
			if (files != null){
				console.log('==loading data', files, prefix)
				sendToViewer([{'callLoadData':[files, prefix]}])
			} else {
				alert("Cannot load data. Please select another directory.");
			}
		});

	});

}
/////////////////////
//this is an input file that will fire if there is no startup.json in the data directory
d3.select('#loadDataButton').on('click', function(){
	document.getElementById("inputFilenames").click();
});


d3.select('body').append('input')
	.attr('type','file')
	.attr('id','inputFilenames')
	.attr('webkitdirectory', true)
	.attr('directory', true)
	.attr('mozdirectory', true)
	.attr('msdirectory', true)
	.attr('odirectory', true)
	.attr('multiple', true)
	.on('change', function(e){
		var foundFile = false;
		// search for a filenames.json, if one exists then use it
		for (i=0; i<this.files.length; i++){
			if (this.files[i].name == "filenames.json" && !foundFile){
				foundFile = true;
				var file = this.files[i];
				var reader = new FileReader();
				reader.readAsText(file, 'UTF-8');
				reader.onload = function(){
					var foo = JSON.parse(this.result);
					if (foo != null){
						return sendToViewer([{'callLoadData':[foo, 'static/']}])
					} else {
						alert("Cannot load data. Please select another directory.");
					}
				}
			}
		}
		// okay, no filenames.json, but maybe there are just csv or hdf5 files then? 
		// NOTE: we don't need to support just .ffly files because those would only exist if 
		// they had used a reader which would've made a filenames.json file. just JSON files
		//  would be weird but they can do that with filenames.json so yeah they should make 1 more .json 
		for (i=0; i<this.files.length; i++){
			if ((this.files[i].name.includes('.hdf5') || this.files[i].name.includes('.csv')) && !foundFile){
				if (GUIParams.usingSocket){
					foundFile = true;
					var dir = this.files[i].webkitRelativePath.replace(this.files[i].name,'');
					console.log('have hdf5 or csv file', dir);
					socketParams.socket.emit('input_otherType', dir);
				}
			}
		}
		if (i == this.files.length && !foundFile){
			alert("Cannot load data. Please select another directory.");
		}
	})
	.style('display','None');
