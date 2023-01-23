function selectColormap() {
	var option = d3.select(this)
		.selectAll('option')
		.filter(function (d, i) { 
			return this.selected; 
	});
	selectValue = parseInt(option.property('value'));

	var p = this.id.slice(0,-11)

	// update colormap
	GUIParams.colormap[p] = (selectValue + 0.5) * (8/256);
	sendToViewer({'setViewerParamByKey':[GUIParams.colormap, 'colormap']});	

	//console.log(p, ' selected colormap:', GUIParams.colormapList[selectValue], GUIParams.colormap[p])

	// redraw particle type if colormap is on
	if (GUIParams.showColormap[p] && GUIParams.showParts[p]){
		//createPartsMesh(pDraw = [p]);
		populateColormapImage(p);
	}
}

function showHideColormapFilter(p, selectValue){
	for (var i=0; i<GUIParams.ckeys[p].length; i+=1){
		d3.selectAll('#'+p+'_CK_'+GUIParams.ckeys[p][i]+'_END_CMap').style('display','none');
	}
	if (selectValue >=0 ) {
		d3.selectAll('#'+p+'_CK_'+GUIParams.ckeys[p][selectValue]+'_END_CMap').style('display','block');
	}
}

function selectColormapVariable() {
	var option = d3.select(this)
		.selectAll('option')
		.filter(function (d, i) { 
			return this.selected; 
	});
	selectValue = parseInt(option.property('value'));

	var p = this.id.slice(0,-14)

	showHideColormapFilter(p, selectValue);

	// update colormap variable here and for the viewer
	GUIParams.colormapVariable[p] = selectValue;
	if (GUIParams.showColormap[p] && GUIParams.showParts[p]) createColormapSVG(p);

	// tell the viewer the colormapVariable was changed, so it can 
	//  update the colormap variable for p's meshes on the next render pass
	var toViewer = []
	toViewer.push({'setViewerParamByKey':[selectValue, 'colormapVariable', p]});
	toViewer.push({'setViewerParamByKey':[true, 'updateColormapVariable', p]})
	sendToViewer(toViewer);
}

//turn on/off the colormap
function checkColormapBox(p, checked){
	if (excluded('colorbarcontainer')) return;
	GUIParams.showColormap[p] = checked;
	if (GUIParams.showColormap[p]) {
		//show the colormap div
		d3.select('#colormap_outer_container').style('visibility','visible');
		//create the colormap for this particle
		createColormapSVG(p);
	}
	else removeColorbar(p);

	forViewer = [];
	forViewer.push({'setViewerParamByKey':[GUIParams.showColormap[p], 'showColormap', p]});
	// don't change blending for column density
	if (p!= GUIParams.CDkey) forViewer.push({'changeBlendingForColormap':[p, checked]});
	sendToViewer(forViewer);
	updateUIBlending([p,checked]);
}

function removeColorbar(p){
	var w = 76; //I think this is the width of the colormap, but how do I get this from the DOM?
	var w0 = parseFloat(d3.select('#colormap_container').style('height'));
	d3.select('#' + p + 'colormapDiv').remove();
	d3.select('#colormap_container').style('height',(w0 - w) + 'px')
	//var trans = parseTranslateStyle(d3.select('#colormap_outer_container'));
	var m0 = parseFloat(d3.select('#colormap_outer_container').style('margin-left'));
	d3.select('#colormap_outer_container').style('margin-left', (m0 - w) + 'px');
	//also subtract 16 off the tranlateY styles for all the other colormaps (again I wish I could get 16 from the DOM)
	Object.keys(GUIParams.showColormap).forEach(function(k){
		var elem = d3.select('#' + k + 'colormapDiv');
		if (elem.node()) {
			var trans = parseTranslateStyle(elem);
			console.log('checking', k, trans)
			if (parseFloat(trans.y) > 20) elem.style('transform','scale('+trans.sx + ',' + trans.sy + ')translate(' + trans.x + ',' + (parseFloat(trans.y) - 16) + 'px)')
		}
	})
	// if there are no visible colormapped particles need to hide the colorbar container
	var hide = true;
	Object.keys(GUIParams.showColormap).forEach(function(k){
		hide = hide && (!GUIParams.showColormap[k] || (GUIParams.showColormap[k] && !GUIParams.showParts[k]));
	})
	if (hide){
		//hide the colomap div
		if (d3.select('#colormap_outer_container').classed('show')) expandColormapTab();
		d3.select('#colormap_outer_container').style('visibility','hidden');
	}
}

///////////////////////////////
///// create a new SVG for the colormap
///////////////////////////////
function createColormapSVG(particle_group_UIname){
	//Note: many if the width/height values are reversed because the image is rotated by 90 degrees


	//destroy the svg if it exists
	//d3.select('#' + particle_group_UIname + 'colormap').remove();

	//check if the colormap for this particle already exists, if not then a new one will be created, otherwise this contianer will be used
	var cbar = d3.select('#' + particle_group_UIname + 'colormapDiv');

	var n = GUIParams.colormapList.length;
	//could set actual cbar dimensions in params
	var actualCbarHeight = GUIParams.colormapImageY; 
	var actualCbarWidth = GUIParams.colormapImageX/n; //number of pixels for each colormap slice on the image, 

	//check the offset (in case there are already other UIs)
	nCB = d3.selectAll('.colormap').size()
	if (!cbar.node()) nCB += 1; //if we're creating a new one, add this to the count 

	if (!excluded('colorbarcontainer')){
		//extend the colormap_container
		var bbox = d3.select('#colormap_container').node().getBoundingClientRect()
		d3.select('#colormap_container')
			.style('width', actualCbarHeight*GUIParams.colormapScale + 'px') //since it's rotated, this is actually the height
			.style('height', nCB*(actualCbarWidth*GUIParams.colormapScale + 70) + 'px') //to allow for the labels
			.style('padding','0px 10px');
	}
 
	//create a container that can be scaled and translated
	if (!cbar.node()) {
		cbar = d3.select('#colormap_container').append('div')
			.attr('id',particle_group_UIname + 'colormapDiv')
			.attr('class','colormap')
			.style('width', actualCbarHeight + 'px') //since it's rotated, this is actually the height
			.style('height', actualCbarWidth + 50 + 'px') //to allow for the labels
			.style('transform','scale(' + GUIParams.colormapScale + ',' + GUIParams.colormapScale + ')translate(' + 29*GUIParams.colormapScale + 'px,' + ((nCB-1)*actualCbarWidth*GUIParams.colormapScale + 20) + 'px)') //not sure why this needs to move down
	}

	//create the svg
	//check if svg already exits
	var svg = d3.select('#' + particle_group_UIname + 'colormapSVG');
	if (!svg.node()) {
		svg = cbar.append('svg')
			.attr('id',particle_group_UIname + 'colormapSVG')
			.attr('width', actualCbarHeight + 10 + 'px') //since it's rotated, this is actually the height, allow for a few extra pixels on each end for labels
			.attr('height', actualCbarWidth + 50 + 'px') //+10 to allow for the labels
			.append('g')
				.attr('transform','translate(5,0)')
	}

	var imgContainer = d3.select('#' + particle_group_UIname + 'colormapImgContainer');
	if (!imgContainer.node()) imgContainer = svg.append('g').attr('id',particle_group_UIname + 'colormapImgContainer')

	if (GUIParams.showParts[particle_group_UIname]) populateColormapImage(particle_group_UIname);


	// Add the X Axis
	var color = getComputedStyle(document.body).getPropertyValue('--UI-extension-text-color');
	var axis = d3.select('#' + particle_group_UIname + 'colormapAxis');
	if (!axis.node()){
		axis = svg.append('g')
			.attr('class', 'axis')
			.attr('id',particle_group_UIname + 'colormapAxis')
			.style('font-size', 12/GUIParams.colormapScale + 'px')
	}

	// add the axis label
	var label = d3.select('#' + particle_group_UIname + 'colormapLabel');
	if (!label.node()){
		label = svg.append('text')
			.attr('id',particle_group_UIname + 'colormapLabel')
			.attr('text-anchor','middle')
			.attr('x',GUIParams.colormapImageX/2.)
			.attr('y',6)
			.attr('dy', 1.7*GUIParams.colormapScale + 'em')
			.attr('fill',color)
			.style('font-size', 14/GUIParams.colormapScale + 'px')
	}

	// fill in the axis and label
	populateColormapAxis(particle_group_UIname)


	// show it
	if (!excluded('colorbarcontainer')) expandColormapTab(true);
}

function populateColormapImage(particle_group_UIname){
	if (excluded('colorbarcontainer')) return;

	//remove any image already in there
	var imgContainer  = d3.select('#' + particle_group_UIname + 'colormapImgContainer');
	imgContainer.node().innerHTML = '';

	//get the colormap number
	var n = GUIParams.colormapList.length;
	var n_colormap = n*(1. - GUIParams.colormap[particle_group_UIname]) + 0.5
	var actualCbarWidth = GUIParams.colormapImageX/n; //number of pixels for each colormap slice on the image, 

	//add the colormap image
	//include the true size of the image here, but move the image so that only the current colormap is in the right position
	var img = imgContainer.append('image')
		.attr('xlink:href', GUIParams.colormapImage)
		.attr('width', GUIParams.colormapImageY + 'px') 
		.attr('height', GUIParams.colormapImageX + 'px') 
		.attr('y',-(n_colormap*actualCbarWidth) + 'px') 
		.attr('x',-(GUIParams.colormapImageX) + 'px')
	if (viewerParams.colormapReversed[particle_group_UIname]){
		// 8px is necessary for some reason :| i don't like it but it works
		img.style('translate',(GUIParams.colormapImageX) + 'px ' + (8) + 'px')
	}
	else img.style('transform','rotate(180deg)');

	//add the clip path to only use the correct portion of the image
	imgContainer.append('clipPath')
		.attr('id','colormapClipPath')
		.append('rect')
			.attr('id','colormapClipRect')
			.attr('x','0px')
			.attr('y','0px')
			.attr('width', GUIParams.colormapImageY + 'px')
			.attr('height', (actualCbarWidth - 1) + 'px') //subtract 1 because the edge pixels can bleed over to the next colormap

	imgContainer.attr('clip-path', 'url(#colormapClipPath)')
}

function populateColormapAxis(particle_group_UIname){

	var color = getComputedStyle(document.body).getPropertyValue('--UI-extension-text-color');
	var actualCbarWidth = GUIParams.colormapImageX/GUIParams.colormapList.length; //number of pixels for each colormap slice on the image, 

	//create the axes
	if (particle_group_UIname == null){
		var xmin = 0;
		var xmax = 1;
	}
	else{
		var minmax = GUIParams.colormapVals[particle_group_UIname][GUIParams.ckeys[particle_group_UIname][GUIParams.colormapVariable[particle_group_UIname]]]
		var xmin = minmax[0]
		var xmax = minmax[1]
	}

	// set the range
	var x = d3.scaleLinear().range([0, GUIParams.colormapImageY]).domain([xmax,xmin]);//.nice(); //because I'm rotating

	//get the axis and create the ticks
	var axis = d3.select('#' + particle_group_UIname + 'colormapAxis');

	//I need to do something to format the tick labels and ensure they are not too long
	if ((Math.abs(xmax) < 0.01 && Math.abs(xmin) < 0.01) || (Math.abs(xmax) > 1000 && Math.abs(xmin) > 1000)) {
		axis.call(d3.axisBottom(x).ticks(10).tickFormat(d3.format('.0e')))
		axis.selectAll('text')  
			.attr('text-anchor', 'end')
			.attr('dx', '0em')
			.attr('dy', '0em')
			.attr('transform', 'rotate(-60)')
			.attr('fill',color)
	} else {
		axis.call(d3.axisBottom(x).ticks(10))
		axis.selectAll('text')  
			.attr('text-anchor', 'end')
			.attr('dx', '-0.8em')
			.attr('dy', -0.55*GUIParams.colormapScale + 'em')

			.attr('transform', 'rotate(-90)')
			.attr('fill',color)
	}


	axis.attr('transform','translate(0,' + actualCbarWidth*0.9 + ')')

	axis.selectAll('line')
		.attr('y2',8/GUIParams.colormapScale)
		.style('stroke',color)

	// update the label
	if (particle_group_UIname!=GUIParams.CDkey){
		d3.select('#' + particle_group_UIname + 'colormapLabel')
			.text(particle_group_UIname + ' ' +  GUIParams.ckeys[particle_group_UIname][GUIParams.colormapVariable[particle_group_UIname]])
	}
	else{
		clabel = GUIParams.ckeys[particle_group_UIname][GUIParams.colormapVariable[particle_group_UIname]]
		d3.select('#' + particle_group_UIname + 'colormapLabel')
			.text(GUIParams.CDlognorm ? 'log10('+clabel+')' :clabel)
	}

}


function initialColormap(p){
	// if colormap should be enabled at startup : 
	//   pre-checking the box
	//   setting the initial colormap
	//   extending the colormap SVG container
	//   changing the blending mode and depth for that particle

	console.log('initial colormap for ',p)
	var forViewer = [];

	//check the box
	var elm = document.getElementById(p+'colorCheckBox');
	if (elm){
		elm.checked = true;
		elm.value = true;
	}

	//set the initial colormap
	var idx = parseInt(Math.round(GUIParams.colormap[p]*256/8 - 0.5));
	elm = document.getElementById(p+'_SelectCMap')
	if (elm) elm.value = idx.toString();
	elm = document.getElementById(p+'_SelectCMapVar')
	if (elm) elm.value = GUIParams.colormapVariable[p].toString();

	//create and extend the colormap SVG
	createColormapSVG(p);
	d3.select('#colormap_outer_container').style('visibility','visible');

	//set the blending mode
	forViewer.push({'setViewerParamByKey':[GUIParams.blendingMode[p], "blendingMode", p]});
	elm = document.getElementById(p+'_selectBlendingMode');
	if (elm) elm.value = GUIParams.blendingMode[p];
	forViewer.push({'setBlendingMode':[GUIParams.blendingMode[p], p]});

	//set the depth mode to True
	elm = document.getElementById(p+'_depthCheckBox');
	if (elm){
		elm.checked = GUIParams.depthTest[p];
		elm.value = GUIParams.depthTest[p];
	}
	forViewer.push({'setDepthMode':[p, GUIParams.depthTest[p]]})

	sendToViewer(forViewer);
}