///////////////////////////
// wait at splash until GUI and viewer are ready w/ callbacks
///////////////////////////
function makeUI(local=false){
	document.getElementById('UIcontainer').style.visibility = 'hidden';

	// same function reference every time, so repeat calls don't stack listeners
	document.addEventListener('keydown', GUIKeyDown);

	if (!local){
		initGUIScene();
		if (!GUIParams.animating) animateGUI();
	}
	
	console.log("waiting for GUI init...")
	// both intervals, or the previous waitForBuild keeps running forever: only
	//  the newest handle is stored, so an orphaned one can never clear itself
	//  and would go on re-running finalizeGUIInitialization()
	clearInterval(GUIParams.waitForInit);
	clearInterval(GUIParams.waitForBuild);

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
				// the cube is decoration; don't let a failure here stop us from
				//  telling the viewer we're done (it waits on that to drop its
				//  splash and mark itself loaded)
				try {
					createCube();
				} catch (err) {
					console.error('Could not create the GUI cube:', err);
				}
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

// in a GUI-only window nothing is watching the keyboard -- update_keypress lives
//  in the viewer's render loop -- so handle "h" here to bring the data picker
//  back. gated to that window: anywhere the viewer shares the page, its own
//  handler already has this key.
function GUIKeyDown(event){
	if (typeof viewerParams !== 'undefined') return;
	if (event.key != 'h' && event.key != 'H') return;
	if (event.metaKey || event.ctrlKey || event.altKey) return;

	// don't hijack the key while the user is typing into the GUI
	var t = event.target;
	if (t && (t.isContentEditable || ['INPUT','TEXTAREA','SELECT'].indexOf(t.tagName) >= 0)) return;

	showDataPickerAgain();
}

