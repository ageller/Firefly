function fullscreen(){
	THREEx.FullScreen.request()
	// ABG: Let's not hide the button because it breaks the height of the UI. It's fine the way it is.
	//document.getElementById("fullScreenButton").style.display = "none";//visibility = "hidden"
}

if (document.addEventListener){
	document.addEventListener('webkitfullscreenchange', exitHandler, false);
	document.addEventListener('mozfullscreenchange', exitHandler, false);
	document.addEventListener('fullscreenchange', exitHandler, false);
	document.addEventListener('MSFullscreenChange', exitHandler, false);
}
function exitHandler(){
	var elem = document.getElementById('ContentContainer');

	if (!THREEx.FullScreen.activated()){
		document.getElementById("fullScreenButton").style.display = "inline";
	}

}


//handle Mouse events
var ignoreMouseClasses = ["pTextInput", "sp-preview-inner", "dropbtn", "FilterMaxTClass", "FilterMinTClass" , "select", "bar1", "bar2", "bar3", "button-div", "pLabelDiv", "selectFilter", "selectVelType",  "NMaxTClass",  "PMaxTClass", "NSliderClass", "PSliderClass", "slideroo", "sp-choose", "sp-input", "select-style"];
var ignoreMouseIds = ["UItopbar", "ControlsText", "Hamburger", "renderButton", "CenterCheckDiv", "CenterCheckBox", "CenterCheckLabel", "splash"];
function handleMouseDown(event) {
	if (ignoreMouseClasses.indexOf(event.target.className) >= 0 || ignoreMouseIds.indexOf(event.target.id) >= 0) return;
	
	if (event.target.hasOwnProperty('id')){
		if (event.target.id.indexOf("splash")  >= 0) return;
	}
	if (event.target.hasOwnProperty('className')){
		if (event.target.className.indexOf("noUi")  >= 0 || event.target.className.indexOf("Slider")  >= 0 ) return;
	}


}

//hide the splash screen
function showSplash(show=true){

	//don't hide the screen if the user clicked on a button from the screen (e.g., to load new data)
	if (event){
		if (event.clientX){
			var x = event.clientX;
			var y = event.clientY;
			var elementMouseIsOver = document.elementFromPoint(x, y);
			if (!elementMouseIsOver.id.includes("splash")) show = true;		
		}
	}


	//only hide if the data is loaded
	if (typeof viewerParams !== 'undefined') if (!viewerParams.loaded) show = true;

	var fdur = 700.;

	var splash = d3.select("#splash");

	if (show) splash.classed("hidden",false);

	var op = 1;
	if (!show) {
		op = 0. 
	}

	splash.transition()
		.ease(d3.easeLinear)
		.duration(fdur)
		.style("opacity", op)

		.on("end", function(d){
			if (!show) splash.classed("hidden",true);
		})
}


function showSleep(){

	var fdur = 700
	var splash = d3.select("#sleep");
	
	splash.style("display","block");

	splash.transition()
		.ease(d3.easeLinear)
		.duration(fdur)
		.style("opacity", 0.95);

}

function hideSleep(){
	var fdur = 700.;

	var splash = d3.select("#sleep");

	splash.transition()
		.ease(d3.easeLinear)
		.duration(fdur)
		.style("opacity", 0)

		.on("end", function(d){
			splash.style("display","none");
		})
	// startup the app and reset the time-- maybe I should move this stuff to the top 
	//	of animate? hmm...
	var currentTime = new Date();
	var seconds = currentTime.getTime()/1000;
	viewerParams.currentTime = seconds;
	viewerParams.pauseAnimation = false;
}

function changeSnapSizes(){
	if (typeof viewerParams !== 'undefined') {
		if (viewerParams.haveUI){
			//size of the snapshot (from text input)
			var oldW = 0+viewerParams.renderWidth;
			var oldH = 0+viewerParams.renderHeight;

			viewerParams.renderWidth = window.innerWidth;
			viewerParams.renderHeight = window.innerHeight;

			if (oldW != viewerParams.renderWidth || oldH != viewerParams.renderHeight){
				var forGUI = [];
				forGUI.push({'setGUIParamByKey':[viewerParams.renderWidth, 'renderWidth']});
				forGUI.push({'setGUIParamByKey':[viewerParams.renderHeight, 'renderHeight'] });

				forGUI.push({'changeUISnapSizes':null});

				sendToGUI(forGUI);
			}
		}
	}
}
window.addEventListener('resize', changeSnapSizes);


// for the fly controls explainer tab

function showFlyExplainer(clicked=false){
	var elem = d3.select('#flyExplainer');
	if (elem.node()){
		if (viewerParams.controlsName == 'FlyControls') elem.node().innerHTML = '<b>You are currently in "fly" controls.</b>  To move the camera in [direction] use the following "key" : [left] "a", [right]  "d", [forward] "w", [backward] "s", [down] "f", [up] "r".  Hold "shift" with any of these to reduce the speed.  Increase or decrease the default speed by pressing "+" or "-".  You can also use the mouse left-click + drag to control the camera pitch and yaw.  To switch to "trackball" controls and place the anchor rotation at the current camera location, hit the [space bar].';
		else elem.node().innerHTML = '<b>You are currently in "trackball" controls.</b>  To rotate the camera, click and hold the [left mouse button] and drag the mouse.  To zoom in or out, [scroll up] or [scroll down] using the scroll wheel. To pan, click and hold the [right mouse button] and drag the mouse.  To switch to "fly" controls and change the rotation anchor point, hit the [space bar].'
		var bbox = elem.node().getBoundingClientRect();
		elem
			.style('z-index', 3)
			.classed('flyExplainerShown',true)
			.transition().style('transform', 'translate(0px,0px)');

		var elem2 = d3.select('#flyExplainerHider');
		elem2
			.style('z-index', 3)
			.transition()
				.style('transform', 'translate(0px,0px)')
				.style('margin-bottom', parseFloat(bbox.height) + 'px');

		// only auto-hide if the user didn't click to show
		if (!clicked){
			d3.select('#flyExplainerHiderContent').transition().style('transform', 'rotate(0deg)')
				.transition().duration(viewerParams.controlsExplainerDelay_sec*1e3).on('end',hideFlyExplainer);
		}
		else d3.select('#flyExplainerHiderContent').transition().style('transform', 'rotate(0deg)');
	}
}

function hideFlyExplainer(){
	var elem = d3.select('#flyExplainer');
	if (elem.node()){

		var bbox = elem.node().getBoundingClientRect();
		elem
			.classed('flyExplainerShown',false)
			.transition()
				.style('transform', 'translate(0px,' + parseFloat(bbox.height) + 'px)')
				.on('end', function(){
					elem.style('z-index', 0)
				});

		d3.select('#flyExplainerHider').transition()
			.style('transform', 'translate(0px,' + parseFloat(bbox.height) + 'px)')
			.style('margin-bottom', parseFloat(bbox.height) + 'px');

		d3.select('#flyExplainerHiderContent').transition().style('transform', 'rotate(180deg)');
	}

}

function removeFlyExplainer(){
	var elem = d3.select('#flyExplainer');
	if (elem.node()){
		var bbox = elem.node().getBoundingClientRect();

		elem
			.classed('flyExplainerShown',false)
			.style('transform', 'translate(0px,' + parseFloat(bbox.height) + 'px)')
			.style('z-index', 0);

		d3.select('#flyExplainerHider')
			.style('transform', 'translate(0px,' + parseFloat(bbox.height) + 'px)')
			.style('margin-bottom', parseFloat(bbox.height) + 'px')
			.style('z-index', 0);
	}
}

d3.select('#flyExplainerHider').on('click', function(){
	var elem = d3.select('#flyExplainer');
	if (elem.node()){
		if (elem.classed('flyExplainerShown')) {
			hideFlyExplainer();
		} else {
			showFlyExplainer(true)
		}
	}
	
})
window.addEventListener('resize', function(){
	var elem = d3.select('#flyExplainer');
	if (elem.node()){
		var bbox = elem.node().getBoundingClientRect();
		d3.select('#flyExplainerHider').style('margin-bottom', parseFloat(bbox.height) + 'px');
	}
});
