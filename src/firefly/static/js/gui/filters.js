function selectFilter() {
	var option = d3.select(this)
		.selectAll("option")
		.filter(function (d, i) { 
			return this.selected; 
	});
	selectValue = option.property('value');

	var p = this.id.slice(0,-13)

	// store the "currently shown" filter for later use
	console.log("setting the current filter value to",selectValue)
	GUIParams.currentlyShownFilter[p] = selectValue;
	sendToViewer({'setViewerParamByKey':[selectValue, 'parts',p,'currentlyShownFilter']})

	//console.log("in selectFilter", selectValue, this.id, p)
	for (var i=0; i<GUIParams.fkeys[p].length; i+=1){
		d3.selectAll('#'+p+'_FK_'+GUIParams.fkeys[p][i]+'_END_Filter')
			.style('display','none');
		d3.selectAll('#'+p+'_FK_'+GUIParams.fkeys[p][i]+'_END_InvertFilterCheckBox')
			.style('display','none');
		d3.selectAll('#'+p+'_FK_'+GUIParams.fkeys[p][i]+'_END_InvertFilterCheckBoxLabel')
			.style('display','none');
	}
	d3.selectAll('#'+p+'_FK_'+selectValue+'_END_Filter')
		.style('display','block');
	d3.selectAll('#'+p+'_FK_'+selectValue+'_END_InvertFilterCheckBox')
		.style('display','inline-block');
	d3.selectAll('#'+p+'_FK_'+selectValue+'_END_InvertFilterCheckBoxLabel')
		.style('display','inline-block');
}


///////////////////////////////
///// create the double sliders
///////////////////////////////

// create the individual sliders
function createFilterSliders(){

	GUIParams.partsKeys.forEach(function(p,i){
		GUIParams.fkeys[p].forEach(function(fk, j){
			if (fk != "None"){

				var sliderArgs = {
					start: GUIParams.filterVals[p][fk], 
					connect: true,
					tooltips: [false, false],
					steps: [[0.001,0.001],[0.001,0.001]],
					range: { 
						'min': [GUIParams.filterLims[p][fk][0]],
						'max': [GUIParams.filterLims[p][fk][1]]
					},
					format: wNumb({
						decimals: 3
					})
				}

				var slider = document.getElementById(p+'_FK_'+fk+'_END_FilterSlider');
				var textMin = document.getElementById(p+'_FK_'+fk+'_END_FilterMinT');
				var textMax = document.getElementById(p+'_FK_'+fk+'_END_FilterMaxT');
				text = [textMin, textMax];
				var varArgs = {//'f':'setViewerParamByKey','v':[GUIParams.filterVals[p][fk], "filterVals",p, fk],
							  'f1':'setViewerParamByKey','v1':[GUIParams.filterVals[p][fk], "filterVals",p, fk],
							  'f2':'setViewerParamByKey','v2':[GUIParams.filterLims[p][fk], "filterLims",p, fk],
							  'f3':'setViewerParamByKey','v3':[true,'updateFilter',p]};

				createSlider(slider, text, sliderArgs, varArgs, [2,2], 'double', GUIParams.filterVals[p][fk], GUIParams.filterLims[p][fk]);

				//reformat
				var w = parseInt(d3.select('.FilterClass').style("width").slice(0,-2));
				d3.select('#'+p+'_FK_'+fk+'_END_FilterSlider').select('.noUi-base').style('width',w-10+"px");
				d3.select('#'+p+'_FK_'+fk+'_END_FilterSlider').select('.noUi-connect').style('border-radius','6px 0px 0px 6px');
				d3.select('#'+p+'_FK_'+fk+'_END_FilterSlider').select('.noUi-handle-lower').style('border-radius','6px 0px 0px 6px');
			}
		});
	});

}