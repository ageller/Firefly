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

	//console.log(p, " selected colormap:", GUIParams.colormapList[selectValue], GUIParams.colormap[p])

	// redraw particle type if colormap is on
	if (GUIParams.showColormap[p]){
		//createPartsMesh(pDraw = [p]);
		createColormapSVG(p);
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

	// update colormap variable here and for the viewer
	GUIParams.colormapVariable[p] = selectValue;
	sendToViewer({'setViewerParamByKey':[selectValue, "colormapVariable", p]});
	// tell the viewer the colormapVariable was changed, so it can 
	//  update the colormap variable for p's meshes on the next render pass
	sendToViewer({'setViewerParamByKey':[true, "updateColormapVariable", p]});
}

//turn on/off the colormap
function checkColormapBox(p, checked){
	GUIParams.showColormap[p] = checked;
	if (GUIParams.showColormap[p]) {
		//show the colormap div
		d3.select('#colorbar_outer_container').style('visibility','visible');
		//create the colormap for this particle
		createColormapSVG(p);
	} else {
		//hide the colomap div
		d3.select('#colorbar_outer_container').style('visibility','hidden');
		//destroy the colormap for this particle (TO DO)

	}

	forViewer = [];
	forViewer.push({'setViewerParamByKey':[GUIParams.showColormap[p], "showColormap", p]});
	if (GUIParams.showColormap[p]) {
		forViewer.push({'changeBlendingForColormap':[p, checked]});
	}
	sendToViewer(forViewer);
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
				var evalString = 'GUIParams.colormapVals.'+p+'.'+ck+'[i] = parseFloat(value); if (GUIParams.showColormap.'+p+') createColormapSVG("'+p+'"); ';
				var varArgs = {//'f':'setViewerParamByKey','v':[initialValueMin, "colormapVals",p, ck],
							  'f1':'setViewerParamByKey','v1':[GUIParams.colormapVals[p][ck], "colormapVals",p, ck],
							  'f2':'setViewerParamByKey','v2':[GUIParams.colormapLims[p][ck], "colormapLims",p, ck],
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

///////////////////////////////
///// create a new SVG for the colormap
///////////////////////////////
function createColormapSVG(particle_group_UIname){
	//Note: many if the width/height values are reversed because the image is rotated by 90 degrees

	//for now so that I can see it
	d3.select('#UIcontainer').style('clip-path', 'inset(-20px -500px -20px 0px')
	d3.select('#colorbar_outer_container').style('margin-left', '200px')

	//destroy the svg if it exists
	d3.select('#' + particle_group_UIname + 'colorbar').remove();

	// I could make this taller
	var bbox = d3.select('#colorbar_outer_container').node().getBoundingClientRect();

	var n = GUIParams.colormapList.length;
	//could set actual cbar dimensions in params
	var actualCbarHeight = 256; 
	var actualCbarWidth = 256/n; //number of pixels for each colormap slice on the image
	var desiredCbarWidth = 50; //px, desired width of the final colorbar svg
	var desiredCbarHeight = 512; //px, desired height of the final colorbar svg

	//get the colormap number
	var n_colormap = (n - 1) - (GUIParams.colormap[particle_group_UIname]*n - 0.5);

	//create the svg
	//this will be the full size of the image, and then I will scale it with the transform property later
	var svg = d3.select('#colorbar_container').append('svg')
		.attr('id',particle_group_UIname + 'colorbar')
		.attr('width', '256px') //since it's rotated, this is actually the height
		.attr('height', '256px') 
		.attr('transform','scale(' + desiredCbarHeight/actualCbarHeight + ',' + desiredCbarHeight/actualCbarHeight + ')translate(0,' + 30/(desiredCbarHeight/actualCbarHeight) + ')')
		.style('transform-box','fill-box')
		.style('transform-origin', 'top left')

	//add the colormap image
	//include the true size of the image here, but move the image so that only the current colormap is in the right position
	svg.append('image')
		.attr('xlink:href', 'static/textures/colormap.png')
		.attr('width', actualCbarHeight + 'px') 
		.attr('height', actualCbarHeight + 'px') 
		.attr('y',-n_colormap*actualCbarWidth + 'px')


	//add the clip path to only use the correct portion of the image
	svg.append('clipPath')
		.attr('id','colorbarClipPath')
		.append('rect')
			.attr('id','colorbarClipRect')
			.attr('x','0px')
			.attr('y','0px')
			.attr('width', '256px')
			.attr('height', actualCbarWidth + 'px')

	svg.attr('clip-path', 'url(#colorbarClipPath)')

	// //change the image
	// var colorbar_box = d3.select("#colorbar_box");
	// colorbar_box.html("<img src=static/textures/colormap.png"+ 
	// 	" height="+ parseFloat(colorbar_box.style("height"))*32 +
	// 	" width="+ parseFloat(colorbar_box.style("width")) +
	// 	' style="'+
	// 	' position:relative;'+
	// 	' top:'+'-'+n_colormap*parseFloat(colorbar_box.style("height"))+'px;'+
	// 	' transform:scaleX(-1);'+ //because I'm rotating the whole div
	// 	'pointer-events: none' + // literally why
	// 	'"' + 
	// 	'draggable="false"'+ // is it so hard
	// 	+'onmousedown="if (event.preventDefault) event.preventDefault()"'+ // to make it not drag the image
	// 	"></img>")


	// //update the axes
	// var colorbar_container = d3.select('#colorbar_container');
	// var minmax = GUIParams.colormapVals[particle_group_UIname][GUIParams.ckeys[particle_group_UIname][GUIParams.colormapVariable[particle_group_UIname]]]
	// var xmin = minmax[0]
	// var xmax = minmax[1]
	// // set the ranges
	// var x = d3.scaleLinear().range([parseFloat(colorbar_container.style('margin-left')), parseFloat(colorbar_box.style("width"))+parseFloat(colorbar_container.style('margin-left'))]);

	// // Scale the range of the data
	// //x.domain([xmin,xmax]);
	// x.domain([xmax,xmin]); //because I'm rotating

	// d3.select('#colorbar_container').select('.axis')
	// 	.call(d3.axisBottom(x).ticks(10))
	// 	.selectAll("text")  
	// 		.style("text-anchor", "end")
	// 		.attr("transform", "translate("+parseFloat(colorbar_container.style('margin-left'))+",0)")
	// 		.attr("dx", "-.8em")
	// 		.attr("dy", ".15em")
	// 		.attr("transform", "rotate(-65)")

	// //change the label
	// var colorbar_label = particle_group_UIname + ' ' +  GUIParams.ckeys[particle_group_UIname][GUIParams.colormapVariable[particle_group_UIname]]
	// d3.select('.colorbar_label').html(colorbar_label)

	// //show/hide the colorbardiv
	// d3.select('#colorbar_container').classed('hidden', !GUIParams.showColormap[particle_group_UIname])
	// if (!GUIParams.showColormap[particle_group_UIname]) d3.select('#colorbar_container').style('visibility','hidden' );
	// else d3.select('#colorbar_container').style('visibility','visible' );
}
