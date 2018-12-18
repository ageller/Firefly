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
	if (ignoreMouseClasses.indexOf(event.target.className) >= 0 || ignoreMouseIds.indexOf(event.target.id) >= 0){

		return;
	}
	if (event.target.hasOwnProperty('id')){
		if (event.target.id.indexOf("splash")  >= 0){
			return;
		}
	}
	if (event.target.hasOwnProperty('className')){
		if (event.target.className.indexOf("noUi")  >= 0 || event.target.className.indexOf("Slider")  >= 0 ) {
			return;
		}
	}

	mouseDown = true;

}
function handleMouseUp(event) {
	mouseDown = false;
}

