function setTweenParams(){
	params.inTween = true;
	params.tweenParams = {};

	params.tweenFile = params.dir[0]+"/"+params.tweenFileName
	d3.json(params.tweenFile,  function(val) {
		Object.keys(val).forEach(function(k, jj) {
			params.tweenParams[k] = val[k]
			if (k == "duration"){ //this should always be the last key
				createTweens()
			}
		});
	});
}

function makePosTween(p1, p2, dur, ease){
	var pT = new TWEEN.Tween(p1).to(p2, dur).easing(ease)
		.onUpdate(function(object){
			params.camera.position.x = object.x;
			params.camera.position.y = object.y;
			params.camera.position.z = object.z;
		});
	return pT;
}
function makeRotTween(r1, r2, dur, ease){
	var rT = new TWEEN.Tween(r1).to(r2, dur).easing(ease)
		.onUpdate(function(object){
			params.camera.rotation.x = object.x;
			params.camera.rotation.y = object.y;
			params.camera.rotation.z = object.z;
		});
	return rT;
}
function createTweens(loop = true){
	//some initial conditions
	//this gets updated in the tween unfortunately, 
	var cRot = {"x":params.camera.rotation.x, "y":params.camera.rotation.y, "z":params.camera.rotation.z };
	var cPos = {"x":params.camera.position.x, "y":params.camera.position.y, "z":params.camera.position.z };
	//these should not be overwritten
	var savePos = Object.assign({}, cPos); 
	var saveRot = Object.assign({}, cRot); 
	var cdur = 3000;


	params.tweenParams.position.unshift(cPos)
	params.tweenParams.rotation.unshift(cRot)
	params.tweenParams.duration.push(cdur)


	//for now, all tweens will have this same easing function
	//could define this outside, or in the tween file
	var ease = TWEEN.Easing.Quintic.InOut

	//set up the tweens

	//first one starts at the current camera location
	var Ntweens = params.tweenParams.position.length

	//now go through all the tweens
	for (var i=0; i<Ntweens-1; i++){
		var rotTween = makeRotTween(params.tweenParams.rotation[i], params.tweenParams.rotation[i+1], params.tweenParams.duration[i], ease)
		params.tweenRot.push(rotTween)
		// var posTween = makePosTween(params.tweenParams.position[i], params.tweenParams.position[i+1], params.tweenParams.duration[i], ease)
		var posTween = makePosTween(params.camera.position, params.tweenParams.position[i+1], params.tweenParams.duration[i], ease)
		params.tweenPos.push(posTween)

	}
	//the first one will need to start the rotation automatically (the rest will be chained together)
	params.tweenPos[0].onStart(function(){
		params.tweenRot[0].start();
	});

	if (!loop){

		//the last one goes back to the starting point
		//and cancels the inTween boolean
		var rotTween1 = makeRotTween(params.tweenParams.rotation[Ntweens - 1], saveRot, params.tweenParams.duration[Ntweens - 1], ease)
		params.tweenRot.push(rotTween1)
		var posTween1 = makePosTween(params.camera.position, savePos, params.tweenParams.duration[Ntweens - 1], ease)
		params.tweenPos.push(posTween1)
		params.tweenPos[Ntweens-1].onComplete(function(){
			if (!loop){
				params.inTween = false;
				console.log("finished with tween");
			} 
		});
	}  

	var Ntweens = params.tweenPos.length
	for (var i=0; i<Ntweens-1; i++){
		params.tweenPos[i].chain(params.tweenPos[i+1], params.tweenRot[i+1]);
	}
	//loop back to the first entry from the user (recall that I prepended the initial camera position, but for some reason I still need to go back to position 0??)
	if (loop){
		params.tweenPos[Ntweens-1].chain(params.tweenPos[0], params.tweenRot[0]);	
	}
	//start the tweens
	params.tweenPos[0].start();

}
