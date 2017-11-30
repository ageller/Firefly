//check if all the particles are drawn
function checkalldrawn(){
    for (var i=0; i< partsKeys.length; i++){
    if (pposMax[i] < parts[partsKeys[i]].Coordinates.length){
            return false;
        }
    }
    return true;
}

//check if the data is loaded
function clearloading(){
    loaded = true;
    // stop spin.js loader
    spinner.stop();

    //show the rest of the page
    d3.select("#ContentContainer").style("visibility","visible")

    console.log("loaded")
    d3.select("#loader").style("display","none")
    d3.select("#splashdiv5").text("Click to begin.");

}

function checkzeros(element, index, array){
    return element == 0;
}