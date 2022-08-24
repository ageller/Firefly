///////////////////////////
// wait at splash until GUI and viewer are ready w/ callbacks
///////////////////////////
function makeUI(local=false){
	document.getElementById('UIcontainer').style.visibility = 'hidden';
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
	
			if (GUIParams.cameraNeedsUpdate) updateGUICamera();
			createUI();
		}
	}, 1000);


	// check that all the expected DOM elements exist in the GUI
	GUIParams.waitForBuild = setInterval(function(){
		var ready = confirmGUIBuild(GUIParams.GUIState);
		// check also that the width has stabilized
		var width = document.getElementById('UIcontainer').getBoundingClientRect().width;
		if (width != GUIParams.GUIWidth || width < 10) ready = false;
		GUIParams.GUIWidth = width;
		if (ready){
			clearInterval(GUIParams.waitForBuild);
			finalizeGUIInitialization();
			// reveal the result!
			document.getElementById('UIcontainer').style.visibility = 'visible'
			// handle detached socket case, draw a cube
			if (!local) {
				createCube();
				sendToViewer([{'clearloading':true}]);
				showSplash(false);
			}
			else clearloading(true);
		}
	},1500);
}

function confirmGUIInit(keys = ["partsKeys", "PsizeMult", "plotNmax", "decimate", "stereoSepMax", "friction", "Pcolors", "showParts", "showVel", "velopts", "velType", "ckeys", "colormapVals", "colormapLims", "colormapVariable", "colormap", "showColormap", "fkeys", "filterVals", "filterLims"]){
	if (!GUIParams.GUIready) return false;

	var ready = keys.every(function(k,i){
		if (GUIParams[k] == null) {
			console.log("GUI missing ", k)
			return false;
		}
		return true;
	});

	return ready
}

function confirmGUIBuild(parent){

	var has_url = parent.hasOwnProperty('url')
	var this_excluded = excluded(parent.url)
	// either there's nothing to build or we have already built it and set the parent.built attribute
	var built = (
		has_url && this_excluded || // not intending to build
		!parent.hasOwnProperty('builder') || // nothing to build
		parent.built); // actually was built

	var children = Object.keys(parent).filter(function(key){
		return !GUIParams.GUIState_variables.includes(key)});
	// do we have children we need to check? 
	if (built && children.length > 0 && !this_excluded){
		// check until we find the first unbuilt child
		built = children.every(function (child){
			var child_built = confirmGUIBuild(parent[child]);
			//console.log(parent.id,child,child_built);
			return built && child_built;
		})
	}
	return built;
}

/*
function confirmGUIBuild(ids){
	//check that all the DOM elements have been created
	if (!GUIParams.GUIready) return false;
	if (GUIParams.GUIIDs.length == 0) return false;

	var ready = GUIParams.GUIIDs.every(function(id){
		
		var elem = document.getElementById(id);
		if (!elem) {
			console.log("GUI build missing ", id)
			//return false;
		}
		return true;
	})

	// also check that the width has stabilized
	if (ready){
		var width = document.getElementById('UIcontainer').getBoundingClientRect().width;
		if (width != GUIParams.GUIWidth) ready = false;
		GUIParams.GUIWidth = width;
	}

	return ready;
}
*/


function clearGUIinterval(){
	clearInterval(GUIParams.waitForInit);
	clearInterval(GUIParams.waitForBuild);
}

// if there are initialization steps that are needed after the GUI is created, then go here
function finalizeGUIInitialization(){

	// collapse the UI initially
	setTimeout(function(){
		var hamb = document.getElementById('Hamburger');
			hamb.classList.toggle("change");
			if (GUIParams.collapseGUIAtStart){
				GUIParams.UIhidden = false;
				hideUI.call(hamb);
			}
		}, 100);

	// and now reveal the result
	//d3.select('#UIcontainer').classed('hidden', false)

	//check for an initial colormap and make adjustments if needed
	if (!excluded('colorbarContainer')){
		GUIParams.partsKeys.forEach(function(p){
			if (GUIParams.showColormap[p]) initialColormap(p);
		})
	}

	addGUIlisteners();


	// tell the viewer the UI has been initialized
	sendToViewer([{'setViewerParamByKey':[true, "haveUI"]}]);

	GUIParams.GUIbuilt = true;

	console.log('GUI built.')
}

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
