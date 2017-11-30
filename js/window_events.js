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
    var buttonDiv = document.getElementById("button-div");

    saveWidth = canvas.width;
    saveHeight = canvas.height;

//resize

    canvas.width = renderWidth;
    canvas.height = renderHeight;
    gl.viewportWidth = renderWidth;;
    gl.viewportHeight = renderHeight;
    applyFilterDecimate(reset=true);
    mat4.perspective(fov, gl.viewportWidth / gl.viewportHeight, zmin, zmax, pMatrix);
    drawScene();


    //https://stackoverflow.com/questions/11112321/how-to-save-canvas-as-png-image
    var w = window.open('about:blank','image from canvas');
    w.onload = function() {
        w.document.body.innerHTML = 'Loading image ... <br/> After the image loads, right click to download.'

    };
    
    var i = setInterval(function(){
        if (checkalldrawn()) {
            //get the image and open in new browser tab
            var d = canvas.toDataURL("image/png");
            //var url = d.replace(/^data:image\/[^;]/, 'data:application/octet-stream');
            //window.open(url);
            w.document.write("<img src='" + d + "' alt='from canvas'/>");

            //now reset the view
            canvas.width = saveWidth;
            canvas.height = saveHeight;
            gl.viewportWidth = saveWidth;
            gl.viewportHeight = saveHeight;
            applyFilterDecimate(reset=true);
            mat4.perspective(fov, gl.viewportWidth / gl.viewportHeight, zmin, zmax, pMatrix);
            drawScene()

            clearInterval(i);
        }
    }, 200);


}

