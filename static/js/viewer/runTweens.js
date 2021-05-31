function setTweenviewerParams(prefix="static/"){
	viewerParams.inTween = true;
	viewerParams.tweenviewerParams = {};

	viewerParams.tweenFile = prefix + viewerParams.dir[0]+"/"+viewerParams.tweenFileName
	d3.json(viewerParams.tweenFile,  function(val) {
		Object.keys(val).forEach(function(k, jj) {
			viewerParams.tweenviewerParams[k] = val[k]
			if (k == "loop"){ //this should always be the last key
				createTweens()
			}
		});
	});
}

//these are not necessary, but could be modified if we want a more complex tween
// function makePosTween(p1, p2, dur, ease){
// 	var pT = new TWEEN.Tween(p1).to(p2, dur).easing(ease)
// 		.onUpdate(function(object){
// 			viewerParams.camera.position.x = object.x;
// 			viewerParams.camera.position.y = object.y;
// 			viewerParams.camera.position.z = object.z;
// 		});
// 	return pT;
// }
// function makeRotTween(r1, r2, dur, ease){
// 	var rT = new TWEEN.Tween(r1).to(r2, dur).easing(ease)
// 		.onUpdate(function(object){
// 			console.log(viewerParams.camera.rotation)
// 			viewerParams.camera.rotation.x = object.x;
// 			viewerParams.camera.rotation.y = object.y;
// 			viewerParams.camera.rotation.z = object.z;
// 		});
// 	return rT;
// }
function createTweens(){
	//some initial conditions
	//this gets updated in the tween unfortunately, 
	var cRot = {"x":viewerParams.camera.rotation.x, "y":viewerParams.camera.rotation.y, "z":viewerParams.camera.rotation.z };
	var cPos = {"x":viewerParams.camera.position.x, "y":viewerParams.camera.position.y, "z":viewerParams.camera.position.z };
	//these should not be overwritten
	var savePos = Object.assign({}, cPos); 
	var saveRot = Object.assign({}, cRot); 
	var cdur = 3000;


	viewerParams.tweenviewerParams.position.unshift(cPos)
	viewerParams.tweenviewerParams.rotation.unshift(cRot)
	viewerParams.tweenviewerParams.duration.push(cdur)


	//for now, all tweens will have this same easing function
	//could define this outside, or in the tween file
	var ease = TWEEN.Easing.Quintic.InOut

	//set up the tweens

	//first one starts at the current camera location
	var Ntweens = viewerParams.tweenviewerParams.position.length

	//now go through all the tweens
	for (var i=0; i<Ntweens-1; i++){
		var rotTween = new TWEEN.Tween(viewerParams.camera.rotation).to(viewerParams.tweenviewerParams.rotation[i+1], viewerParams.tweenviewerParams.duration[i]).easing(ease)
		viewerParams.tweenRot.push(rotTween)
		var posTween = new TWEEN.Tween(viewerParams.camera.position).to(viewerParams.tweenviewerParams.position[i+1], viewerParams.tweenviewerParams.duration[i]).easing(ease)
		viewerParams.tweenPos.push(posTween)
		// viewerParams.tweenRot[i].onComplete(function(){
		// 	console.log(viewerParams.camera.rotation)
		// });

	}
	//the first one will need to start the rotation automatically (the rest will be chained together)
	viewerParams.tweenPos[0].onStart(function(){
		viewerParams.tweenRot[0].start();
	});

	if (!viewerParams.tweenviewerParams.loop){
		//the last one goes back to the starting point
		//and cancels the inTween boolean
		var rotTween1 = new TWEEN.Tween(viewerParams.camera.rotation).to(saveRot, viewerParams.tweenviewerParams.duration[Ntweens - 1]).easing(ease)
		viewerParams.tweenRot.push(rotTween1)
		var posTween1 = new TWEEN.Tween(viewerParams.camera.position).to(savePos, viewerParams.tweenviewerParams.duration[Ntweens - 1]).easing(ease)
		viewerParams.tweenPos.push(posTween1)
		viewerParams.tweenPos[Ntweens-1].onComplete(function(){
			viewerParams.inTween = false;
			console.log("finished with tween");
		});
	}  

	var Ntweens = viewerParams.tweenPos.length
	for (var i=0; i<Ntweens-1; i++){
		viewerParams.tweenPos[i].chain(viewerParams.tweenPos[i+1], viewerParams.tweenRot[i+1]);
	}
	//loop back to the first entry from the user (recall that I prepended a tween from the current camera position; this will get us back to the first location)
	if (viewerParams.tweenviewerParams.loop){
		viewerParams.tweenPos[Ntweens-1].chain(viewerParams.tweenPos[0], viewerParams.tweenRot[0]);	
	}
	//start the tweens
	viewerParams.tweenPos[0].start();

}
