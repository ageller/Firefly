function runTweens(){
	
	params.inTween = true;

	//some initial conditions
	//this gets updated in the tween unfortunately, 
	var Rot0 = {x:params.camera.rotation.x, y:params.camera.rotation.y, z:params.camera.rotation.z };
	var Pos0 = {x:params.camera.position.x, y:params.camera.position.y, z:params.camera.position.z };
	var dur4 = 3000;

	var Pos1 = {x: -19.744956838173927, y: 15.455853916693579, z: -16.277443897768208 };
	var Rot1 = {x: -2.6170443904060248, y: -0.23596432285678665, z: 0.022431492272463913};
	var dur1 = 5000;

	var Pos2 = {x: -3.0133393793838064, y: 1.9573575609821188, z: -35.29382116766788};
	var Rot2 = {x: -3.086190477009067, y: -0.0850420619130238, z: 0.21704567689878831};
	var dur2 = 10000;

	var Pos3 = {x: 22.30222309308597, y: -42.86419581562794, z: -6.174430674062557};
	var Rot3 = {x: 1.7138586035003753, y: 0.47556299870784857, z: 0.7042020284793505};
	var dur3 = 1000;

	var savePos0 = Object.assign({}, Pos0);
	var saveRot0 = Object.assign({}, Rot0);
	console.log(Pos0)
	//set up the tweens
	var rotTween1 = new TWEEN.Tween(Rot0).to(Rot1,dur1).easing(TWEEN.Easing.Quintic.InOut)
		.onUpdate(function(object){
			params.camera.rotation.x = object.x;
			params.camera.rotation.y = object.y;
			params.camera.rotation.z = object.z;
		})
	var posTween1 = new TWEEN.Tween(params.camera.position).to(Pos1, dur1).easing(TWEEN.Easing.Quintic.InOut)
		.onUpdate(function(object){
			params.camera.position.x = object.x;
			params.camera.position.y = object.y;
			params.camera.position.z = object.z;
		})
		.onStart(function(){
			rotTween1.start();
		});

	var rotTween2 = new TWEEN.Tween(Rot1).to(Rot2,dur2).easing(TWEEN.Easing.Quintic.InOut)
		.onUpdate(function(object){
			params.camera.rotation.x = object.x;
			params.camera.rotation.y = object.y;
			params.camera.rotation.z = object.z;
		});
	var posTween2 = new TWEEN.Tween(Pos1).to(Pos2, dur2).easing(TWEEN.Easing.Quintic.InOut)
		.onUpdate(function(object){
			params.camera.position.x = object.x;
			params.camera.position.y = object.y;
			params.camera.position.z = object.z;
		});

	var rotTween3 = new TWEEN.Tween(Rot2).to(Rot3,dur3).easing(TWEEN.Easing.Quintic.InOut)
		.onUpdate(function(object){
			params.camera.rotation.x = object.x;
			params.camera.rotation.y = object.y;
			params.camera.rotation.z = object.z;
		});
	var posTween3 = new TWEEN.Tween(Pos2).to(Pos3, dur3).easing(TWEEN.Easing.Quintic.InOut)
		.onUpdate(function(object){
			params.camera.position.x = object.x;
			params.camera.position.y = object.y;
			params.camera.position.z = object.z;
		});

	var rotTween4 = new TWEEN.Tween(Rot3).to(saveRot0,dur4).easing(TWEEN.Easing.Quintic.InOut)
		.onUpdate(function(object){
			params.camera.rotation.x = object.x;
			params.camera.rotation.y = object.y;
			params.camera.rotation.z = object.z;
		});
	var posTween4 = new TWEEN.Tween(Pos3).to(savePos0, dur4).easing(TWEEN.Easing.Quintic.InOut)
		.onUpdate(function(object){
			params.camera.position.x = object.x;
			params.camera.position.y = object.y;
			params.camera.position.z = object.z;
		})
		.onComplete(function(){
			params.inTween = false;
		})

	//chain the tweens together
	posTween1.chain(posTween2, rotTween2);
	posTween2.chain(posTween3, rotTween3);
	posTween3.chain(posTween4, rotTween4);
	posTween1.start();
}