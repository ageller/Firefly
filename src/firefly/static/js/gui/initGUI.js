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

	GUIParams.GUItries = 0;

	GUIParams.waitForInit = setInterval(function(){ 
		var ready = confirmGUIInit();
		if (ready){
			console.log("GUI ready.")
			clearInterval(GUIParams.waitForInit);
	
			if (GUIParams.cameraNeedsUpdate) updateGUICamera();
			createUI();
		}
		// attempt to fix the issue where the GUI and viewer don't connect to the socket
		// this might result in some infinite loop of reloads...
		if (GUIParams.GUItries > GUIParams.autoReloadCount && GUIParams.usingSocket && GUIParams.allowAutoReload){
			console.log('ERROR IN CREATING GUI.  TRYING AGAIN.');
			GUIParams.GUItries = 0;
			location.reload();
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

function confirmGUIInit(keys = ["partsKeys", "partsSizeMultipliers", "plotNmax", "decimate", "stereoSepMax", "friction", "partsColors", "showParts", "showVel", "velopts", "velType", "ckeys", "colormapVals", "colormapLims", "colormapVariable", "colormap", "showColormap", "fkeys", "filterVals", "filterLims"]){
	if (!GUIParams.GUIready) return false;

	var ready = keys.every(function(k,i){
		if (GUIParams[k] == null) {
			GUIParams.GUItries += 1;
			console.log(`Try ${GUIParams.GUItries}: GUI missing ${k}`);
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
	// document.getElementById("inputFilenames").click();
	showFilepathModal();
});

// Create a modal overlay that will hold the input box and button
d3.select("body")
	.append("div")
	.attr("id", "filepath-modal-overlay")
	.style("position", "fixed")
	.style("top", "0")
	.style("left", "0")
	.style("width", "100%")
	.style("height", "100%")
	.style("background-color", "rgba(0, 0, 0, 0.5)")
	.style("display", "flex")
	.style("align-items", "center")
	.style("justify-content", "center")
	.style("z-index", "1000")
	.style("visibility", "hidden");  // Hide initially

// Create a container for the input and button with a modal-like appearance
const filepathModal = d3.select("#filepath-modal-overlay")
	.append("div")
	.attr("id", "filepath-modal-content")
	.style("background-color", "#555555")
	.style("padding", "20px")
	.style("border-radius", "8px")
	.style("box-shadow", "0px 4px 8px rgba(0, 0, 0, 0.2)")
	.style("text-align", "center")
	.style("max-width", "300px")
	.style("width", "80%");

// Append a text input field
filepathModal.append("input")
  .attr("type", "text")
  .attr("id", "filepath-user-input")
  .attr("placeholder", "Enter the path to your data directory")
  .style("margin-bottom", "10px")
  .style("width", "100%")
  .style("padding", "8px")
  .style("box-sizing", "border-box");

// Append a dropdown to select the file type
filetypeDropdown = filepathModal.append("select")
  .attr("id", "filetype-dropdown-menu")
  .style("margin-bottom", "10px")
  .style("width", "100%")
  .style("padding", "8px")
  .style("box-sizing", "border-box")

  // Add the placeholder option
filetypeDropdown.append("option")
  .attr("value", "")
  .attr("disabled", true)
  .attr("selected", true)
  .text("Select the file type");

  filetypeDropdown.selectAll("option.options")
  .data(["Firefly .json", ".hdf5", ".csv"]).enter()
	.append("option")
	.text(d => d);

// Append a submit button
filepathModal.append("button")
  .attr("id", "filepath-submit-button")
  .attr("class", "button")
  .text("Submit")
  .style("padding", "8px 16px")
  .style("margin-top", "10px");

// Show the modal
function showFilepathModal() {
  d3.select("#filepath-modal-overlay").style("visibility", "visible");
}

// Hide the modal
function hideFilepathModal() {
  d3.select("#filepath-modal-overlay").style("visibility", "hidden");
}

// Add event listener for the button
d3.select("#filepath-submit-button").on("click", function () {
	// Hide the modal after submitting
	hideFilepathModal();
	
	// Get the value from the input field
	const filepath = d3.select("#filepath-user-input").property("value");
	const filetype = d3.select("#filetype-dropdown-menu").property("value");
	console.log("User filepath:", filepath);
	console.log("data type:", filetype);

	if (filepath == "" | filetype == "Select the file type"){
		alert("Cannot load data. Please try again.");
	}

	// process the data as needed
	socketParams.socket.emit('input_otherType', {"filepath":filepath,"filetype":filetype});


});


// d3.select('body').append('input')
// 	.attr('type','file')
// 	.attr('id','inputFilenames')
// 	.attr('webkitdirectory', true)
// 	.attr('directory', true)
// 	.attr('mozdirectory', true)
// 	.attr('msdirectory', true)
// 	.attr('odirectory', true)
// 	.attr('multiple', true)
// 	.on('change', function(e){
// 		var foundFile = false;
// 		// search for a filenames.json, if one exists then use it
// 		for (i=0; i<this.files.length; i++){
// 			if (this.files[i].name == "filenames.json" && !foundFile){
// 				foundFile = true;
// 				var file = this.files[i];
// 				var reader = new FileReader();
// 				reader.readAsText(file, 'UTF-8');
// 				reader.onload = function(){
// 					var foo = JSON.parse(this.result);
// 					if (foo != null){
// 						return sendToViewer([{'callLoadData':[foo, 'static/']}])
// 					} else {
// 						alert("Cannot load data. Please select another directory.");
// 					}
// 				}
// 			}
// 		}
// 		// okay, no filenames.json, but maybe there are just csv or hdf5 files then? 
// 		// NOTE: we don't need to support just .ffly files because those would only exist if 
// 		// they had used a reader which would've made a filenames.json file. just JSON files
// 		//  would be weird but they can do that with filenames.json so yeah they should make 1 more .json 
// 		for (i=0; i<this.files.length; i++){
// 			if ((this.files[i].name.includes('.hdf5') || this.files[i].name.includes('.csv')) && !foundFile){
// 				if (GUIParams.usingSocket){
// 					foundFile = true;
// 					var dir = this.files[i].webkitRelativePath.replace(this.files[i].name,'');
// 					console.log('have hdf5 or csv file', dir);
// 					socketParams.socket.emit('input_otherType', dir);
// 				}
// 			}
// 		}
// 		if (i == this.files.length && !foundFile){
// 			alert("Cannot load data. Please select another directory.");
// 		}
// 	})
// 	.style('display','None');
