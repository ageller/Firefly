function fullscreen(){
	THREEx.FullScreen.request()
	document.getElementById("fullScreenButton").style.display = "none";//visibility = "hidden"

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
