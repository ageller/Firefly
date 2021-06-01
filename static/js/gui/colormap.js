function selectColormap() {
	var option = d3.select(this)
		.selectAll("option")
		.filter(function (d, i) { 
			return this.selected; 
	});
	selectValue = parseInt(option.property('value'));

	var p = this.id.slice(0,-11)

	// update colormap
	GUIParams.colormap[p] = (selectValue + 0.5) * (8/256);
	sendToViewer({'setViewerParamByKey':[GUIParams.colormap, "colormap"]});	

	console.log(p, " selected colormap:", GUIParams.colormapList[selectValue], GUIParams.colormap[p])

	// redraw particle type if colormap is on
	if (GUIParams.showColormap[p]){
		//drawScene(pDraw = [p]);
		fillColorbarContainer(p);
	}
}

function showHideColormapFilter(p, selectValue){
	for (var i=0; i<GUIParams.ckeys[p].length; i+=1){
		d3.selectAll('#'+p+'_CK_'+GUIParams.ckeys[p][i]+'_END_CMap')
			.style('display','none');
	}
	if (selectValue >=0 ) d3.selectAll('#'+p+'_CK_'+GUIParams.ckeys[p][selectValue]+'_END_CMap').style('display','block');
}

function selectColormapVariable() {
	var option = d3.select(this)
		.selectAll("option")
		.filter(function (d, i) { 
			return this.selected; 
	});
	selectValue = parseInt(option.property('value'));

	var p = this.id.slice(0,-14)

	showHideColormapFilter(p, selectValue);

	// update colormap variable
	GUIParams.colormapVariable[p] = selectValue;
	sendToViewer({'setViewerParamByKey':[GUIParams.colormapVariable[p], "colormapVariable",p]});

	console.log(p, "colored by:", GUIParams.ckeys[p][GUIParams.colormapVariable[p]])

	// redraw particle type if colormap is on
	if (GUIParams.showColormap[p]){
		sendToViewer({'drawScene':[[p]]})
		fillColorbarContainer(p);
	}
}

///////////////////////////////
///// create the double sliders
///////////////////////////////

// create the individual sliders
function createColormapSliders(){

	GUIParams.partsKeys.forEach(function(p,i){
		GUIParams.ckeys[p].forEach(function(ck, j){
			if (ck != "None"){
				var sliderArgs = {
					start: GUIParams.colormapVals[p][ck], 
					connect: true,
					tooltips: [false, false],
					steps: [[0.001,0.001],[0.001,0.001]],
					range: { 
						'min': [GUIParams.colormapLims[p][ck][0]],
						'max': [GUIParams.colormapLims[p][ck][1]]
					},
					format: wNumb({
						decimals: 3
					})
				}

				var slider = document.getElementById(p+'_CK_'+ck+'_END_CMapSlider');
				var textMin = document.getElementById(p+'_CK_'+ck+'_END_CMapMinT');
				var textMax = document.getElementById(p+'_CK_'+ck+'_END_CMapMaxT');


				text = [textMin, textMax];
				//not sure this is the best way to handle this.
				var evalString = 'GUIParams.colormapVals.'+p+'.'+ck+'[i] = parseFloat(value); if (GUIParams.showColormap.'+p+') fillColorbarContainer("'+p+'"); ';
				var varArgs = {//'f':'setViewerParamByKey','v':[initialValueMin, "colormapVals",p, ck],
							  'f1':'setViewerParamByKey','v1':[GUIParams.colormapVals[p][ck], "colormapVals",p, ck],
							  'f2':'setViewerParamByKey','v2':[GUIParams.colormapLims[p][ck], "colormapLims",p, ck],
  							  'f3':'setViewerParamByKey','v3':[true,'updateColormap',p],
							  'f4':'setViewerParamByKey','v4':[true,'updateFilter',p],
							  'evalString':evalString};

				createSlider(slider, text, sliderArgs, varArgs, [2,2], 'double', GUIParams.colormapVals[p][ck], GUIParams.colormapLims[p][ck]);

				//reformat
				var w = parseInt(d3.select('.CMapClass').style("width").slice(0,-2));
				d3.select('#'+p+'_CK_'+ck+'_END_CMapSlider').select('.noUi-base').style('width',w-10+"px");
				d3.select('#'+p+'_CK_'+ck+'_END_CMapSlider').select('.noUi-connect').style('border-radius','6px 0px 0px 6px');
				d3.select('#'+p+'_CK_'+ck+'_END_CMapSlider').select('.noUi-handle-lower').style('border-radius','6px 0px 0px 6px');
			}
		});
	});

}


////////////////////
/// floating color scale div
////////////////////
//from https://www.w3schools.com/howto/howto_js_draggable.asp
function dragColorbarElement(elm, e) {
	var elmnt = document.getElementById("colorbar_container");
	var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
	dragMouseDown(e);

	function dragMouseDown(e) {
		e = e || window.event;
		// get the mouse cursor position at startup:
		pos3 = e.clientX;
		pos4 = e.clientY;
		document.addEventListener('mouseup', closeDragElement);
		document.addEventListener('mousemove', elementDrag);

	}

	function elementDrag(e) {
		GUIParams.movingUI = true;
		e = e || window.event;
		// calculate the new cursor position:
		pos1 = pos3 - e.clientX;
		pos2 = pos4 - e.clientY;
		pos3 = e.clientX;
		pos4 = e.clientY;

		// set the element's new position:
		var top = parseInt(elmnt.style.top);
		var left = parseInt(elmnt.style.left);
		elmnt.style.top = (top - pos2) + "px";
		elmnt.style.left = (left - pos1) + "px";
	}

	function closeDragElement(e) {
		/* stop moving when mouse button is released:*/
		e.stopPropagation();
		GUIParams.movingUI = false;
		document.removeEventListener('mouseup', closeDragElement);
		document.removeEventListener('mousemove', elementDrag);

	}
}

function defineColorbarContainer(particle_group_UIname){
    GUIParams.definedColorbarContainer = true
	var text_height = 40;
	var container_margin = {"top":10,"side":15}
	var container_width = 300 
	var container_height = 30
	var cbar_bounds = {'width':container_width,'height':container_height}

	//trying to position this next to the UI, but where do these numbers come from?? both depend on the container_width and container_height...
	var container_top = 138; 
	var container_left = 188;

	d3.select('#colorbar_container').classed('hidden', true);

	var colorbar_container = d3.select("#colorbar_container")
		.html("")
		.classed('colorbar', true)
		.style("height",cbar_bounds.height+container_margin.top*2+text_height+"px")
	// contianer_margin : +*2 for the margins themselves, +1 for the offset of the content...?
		.style("width",cbar_bounds.width+container_margin.side*2+container_margin.side+"px")
		.style("top",container_top+"px")
		.style("left",container_left+"px")
		.style('position','absolute')
		.style('transform','rotate(90deg)')
		.attr('onmousedown','dragColorbarElement(this, event);');

		// this is the box that contains the colorbar image node, which fills this div
	var colorbar_box = colorbar_container.append('div')
		.attr('id','colorbar_box')
		.style("position","relative")
		.style("width",cbar_bounds.width+container_margin.side)
		.style("height",cbar_bounds.height)
		.style("left",container_margin.side+"px")
		.style("top","10px")
		.style("overflow","hidden")

	var svg = colorbar_container.append("svg")
		.attr("width", parseFloat(colorbar_box.style("width"))+2*container_margin.side) 
		.attr("height",text_height)
		//.style("background-color","green") // debug background from the axis ticks
		.style("position","relative")
		.style("top",container_margin.top+"px")
		//.style("left",container_margin.side+"px")
		.style("left","0px")
		.append("g")
		.attr("class","cbar_svg")

    
    if (particle_group_UIname == null){
        var xmin = 0;
        var xmax = 1;
    }
    else{
        var minmax = GUIParams.colormapVals[particle_group_UIname][GUIParams.ckeys[particle_group_UIname][GUIParams.colormapVariable[particle_group_UIname]]]
        var xmin = minmax[0]
        var xmax = minmax[1]
    }

	// set the ranges
	var x = d3.scaleLinear().range([parseFloat(colorbar_container.style('margin-left')), parseFloat(colorbar_box.style("width"))+parseFloat(colorbar_container.style('margin-left'))]);
    
	// Scale the range of the data
	//x.domain([xmin,xmax]);
	x.domain([xmax,xmin]); //because I'm rotating

	// Add the X Axis
	svg.append("g")
		.attr("class", "axis")
		.call(d3.axisBottom(x).ticks(10))
		.selectAll("text")  
			.style("text-anchor", "end")
			.attr("transform", "translate("+container_margin.side+",0)")
			.attr("dx", "-.8em")
			.attr("dy", ".15em")
			.attr("transform", "rotate(-65)")

	colorbar_container.append('div')
		.style("text-align","center")
		.style("position",'relative')
		.style("height",text_height + "px")
		.attr('class','colorbar_label') // hardcode background color in index.css, why isn't this inherited??

}

function fillColorbarContainer( particle_group_UIname){
	var n_colormap = 31-(GUIParams.colormap[particle_group_UIname]*32-0.5)
	//change the image
	var colorbar_box = d3.select("#colorbar_box");
	colorbar_box.html("<img src=static/textures/colormap.png"+ 
		" height="+ parseFloat(colorbar_box.style("height"))*32 +
		" width="+ parseFloat(colorbar_box.style("width")) +
		' style="'+
		' position:relative;'+
		' top:'+'-'+n_colormap*parseFloat(colorbar_box.style("height"))+'px;'+
		' transform:scaleX(-1);'+ //because I'm rotating the whole div
		'pointer-events: none' + // literally why
		'"' + 
		'draggable="false"'+ // is it so hard
		+'onmousedown="if (event.preventDefault) event.preventDefault()"'+ // to make it not drag the image
		"></img>")


	//update the axes
	var colorbar_container = d3.select('#colorbar_container');
	var minmax = GUIParams.colormapVals[particle_group_UIname][GUIParams.ckeys[particle_group_UIname][GUIParams.colormapVariable[particle_group_UIname]]]
	var xmin = minmax[0]
	var xmax = minmax[1]
	// set the ranges
	var x = d3.scaleLinear().range([parseFloat(colorbar_container.style('margin-left')), parseFloat(colorbar_box.style("width"))+parseFloat(colorbar_container.style('margin-left'))]);

	// Scale the range of the data
	//x.domain([xmin,xmax]);
	x.domain([xmax,xmin]); //because I'm rotating

	d3.select('#colorbar_container').select('.axis')
		.call(d3.axisBottom(x).ticks(10))
		.selectAll("text")  
			.style("text-anchor", "end")
			.attr("transform", "translate("+parseFloat(colorbar_container.style('margin-left'))+",0)")
			.attr("dx", "-.8em")
			.attr("dy", ".15em")
			.attr("transform", "rotate(-65)")

	//change the label
	var colorbar_label = particle_group_UIname + ' ' +  GUIParams.ckeys[particle_group_UIname][GUIParams.colormapVariable[particle_group_UIname]]
	d3.select('.colorbar_label').html(colorbar_label)

	//show/hide the colorbardiv
	d3.select('#colorbar_container').classed('hidden', !GUIParams.showColormap[particle_group_UIname])

}
