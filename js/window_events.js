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
//hide the splash screen
function hideSplash(){
    if (loaded){
        helpMessage = 0;
        var fdur = 700.;

        var splash = d3.select("#splash");

        splash.transition()
            .ease(d3.easeLinear)
            .duration(fdur)
            .style("opacity", 0)

            .on("end", function(d){
                splash.style("display","none");
            })
    }
}

//hide the splash screen
function showSplash(){
    if (loaded){
        helpMessage = 1;
        var fdur = 700.;

        var splash = d3.select("#splash");
        splash.style("display","block");

        splash.transition()
            .ease(d3.easeLinear)
            .duration(fdur)
            .style("opacity", 0.8);
    }
    
}



//handle Mouse events
var ignoreMouseClasses = ["pTextInput", "sp-preview-inner", "dropbtn", "FilterMaxTClass", "FilterMinTClass" , "select", "bar1", "bar2", "bar3", "button-div", "pLabelDiv", "selectFilter", "selectVelType",  "NMaxTClass",  "PMaxTClass", "NSliderClass", "PSliderClass", "slideroo", "sp-choose", "sp-input", "select-style"];
var ignoreMouseIds = ["UItopbar", "ControlsText", "Hamburger", "renderButton", "CenterCheckDiv", "CenterCheckBox", "CenterCheckLabel", "splash"];
function handleMouseDown(event) {
    if (ignoreMouseClasses.indexOf(event.target.className) >= 0 || ignoreMouseIds.indexOf(event.target.id) >= 0 ||  event.target.className.indexOf("noUi")  >= 0 || event.target.className.indexOf("Slider")  >= 0 || event.target.id.indexOf("splash")  >= 0){

        return;
    }
    mouseDown = true;

}
function handleMouseUp(event) {
    mouseDown = false;
}


function renderImage() {  
//https://stackoverflow.com/questions/26193702/three-js-how-can-i-make-a-2d-snapshot-of-a-scene-as-a-jpg-image   
//this sometimes breaks in Chrome when rendering takes too long
//best to use Firefox to render images  
    var imgData, imgNode;
    var strDownloadMime = "image/octet-stream";
    var strMime = "image/png";
    var screenWidth = window.innerWidth;
    var screenHeight = window.innerHeight;
    var aspect = screenWidth / screenHeight;

    var saveFile = function (strData, filename) {
        var link = document.createElement('a');
        if (typeof link.download === 'string') {
            document.body.appendChild(link); //Firefox requires the link to be in the body
            link.download = filename;
            link.href = strData;
            link.click();
            document.body.removeChild(link); //remove the link when done
        } else {
            console.log("can't save image");
            return;
            //location.replace(uri);
        }

    }


    try {
        //resize
        renderer.setSize(renderWidth, renderHeight);
        camera.aspect = renderWidth / renderHeight;
        camera.updateProjectionMatrix();
        renderer.render( scene, camera );

        //save image
        imgData = renderer.domElement.toDataURL(strMime);

        saveFile(imgData.replace(strMime, strDownloadMime), "image.png");


        //back to original size
        renderer.setSize(screenWidth, screenHeight);
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
        renderer.render( scene, camera );

    } catch (e) {
        console.log(e);
        return;
    }




}




