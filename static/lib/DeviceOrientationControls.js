/**
 * @author richt / http://richt.me
 * @author WestLangley / http://github.com/WestLangley
 * updates from Aaron M Geller (AMG)
 *
 * W3C Device Orientation control (http://w3c.github.io/deviceorientation/spec-source-orientation.html)
 */

THREE.DeviceOrientationControls = function( object ) {

	var scope = this;

	this.object = object;
	this.object.rotation.reorder( "YXZ" );

	this.enabled = true;

	this.deviceOrientation = {};
	this.screenOrientation = 0;

	this.alpha = 0;
	this.alphaOffsetAngle = 0;
	this.betaOffsetAngle = 0;
	this.gammaOffsetAngle = 0;

	//added by AMG
	this.deviceMotion = {};
	// store every two acceleration and implied velocity and position,
	// starting from these initial conditions
	this.accPosition = [
		{
			position: new THREE.Vector3(0,0,0),
			velocity: new THREE.Vector3(0,0,0),
			acceleration: new THREE.Vector3(0,0,0),
			time: undefined
		}
	];
	this.moveMult = new THREE.Vector3(25,10,10);


	var onDeviceOrientationChangeEvent = function( event ) {

		scope.deviceOrientation = event;


	};

	var onScreenOrientationChangeEvent = function() {

		scope.screenOrientation = window.orientation || 0;

	};


	var onDeviceMotionChangeEvent = function(){
		//added by AMG 
		scope.deviceMotion = event;

	}

	// The angles alpha, beta and gamma form a set of intrinsic Tait-Bryan angles of type Z-X'-Y''

	var setObjectQuaternion = function() {

		var zee = new THREE.Vector3( 0, 0, 1 );

		var euler = new THREE.Euler();

		var q0 = new THREE.Quaternion();

		var q1 = new THREE.Quaternion( - Math.sqrt( 0.5 ), 0, 0, Math.sqrt( 0.5 ) ); // - PI/2 around the x-axis

		return function( quaternion, alpha, beta, gamma, orient ) {

			euler.set( beta, alpha, - gamma, 'YXZ' ); // 'ZXY' for the device, but 'YXZ' for us

			quaternion.setFromEuler( euler ); // orient the device

			quaternion.multiply( q1 ); // camera looks out the back of the device, not the top

			quaternion.multiply( q0.setFromAxisAngle( zee, - orient ) ); // adjust for screen orientation

		};

	}();

	//added by AMG to allow movement in position
	// https://bl.ocks.org/micahstubbs/0d7ac58c57c9cd663de5ae136e8bc405
	// euler double integration
	var eulerStep = function(state0, state1) {
		var dt = (state1.time - state0.time) / 1000; // convert ms to s
		if (dt) {
			state1.position.x = state0.position.x + state0.velocity.x*dt;
			state1.velocity.x = state0.velocity.x + state0.acceleration.x*dt;
			
			state1.position.y = state0.position.y + state0.velocity.y*dt;
			state1.velocity.y = state0.velocity.y + state0.acceleration.y*dt;

			state1.position.z = state0.position.z + state0.velocity.z*dt;
			state1.velocity.z = state0.velocity.z + state0.acceleration.z*dt;
		}
		return Object.assign({}, state1);
	};
	// step forward with new acceleration, applying some very crude filtering & friction
	this.accelerate = function(a, t) {

		var newPosition = {
			position: new THREE.Vector3(0,0,0),
			velocity: new THREE.Vector3(0,0,0),
			acceleration: new THREE.Vector3(0,0,0),
			time: t
		}
		newPosition = eulerStep(this.accPosition[0], newPosition);
		newPosition.acceleration.x = Math.abs(a.x) > .1 ? a.x : 0; // noise filter
		newPosition.acceleration.y = Math.abs(a.y) > .1 ? a.y : 0; // noise filter
		newPosition.acceleration.z = Math.abs(a.z) > .1 ? a.z : 0; // noise filter

		newPosition.velocity.multiplyScalar(.9); // friction
		newPosition.velocity.x = Math.abs(newPosition.velocity.x) < .01 ? 0 : newPosition.velocity.x; // noise filter
		newPosition.velocity.y = Math.abs(newPosition.velocity.y) < .01 ? 0 : newPosition.velocity.y; // noise filter
		newPosition.velocity.z = Math.abs(newPosition.velocity.z) < .01 ? 0 : newPosition.velocity.z; // noise filter
		//newPosition.position.multiplyScalar(.999); // tend back to zero

		this.accPosition.unshift(newPosition);


		if (this.accPosition.length >= 2) {
			//added by AMG to apply the move
			var dPosition = this.accPosition[1].position.clone();
			dPosition.sub(this.accPosition[0].position);
			dPosition.multiplyScalar(moveMult);

			//console.log(dPosition, this.accPosition[1].position, this.accPosition[0].position)
			this.object.translateX( dPosition.x*this.moveMult.x );
			this.object.translateY( dPosition.y*this.moveMult.y );
			this.object.translateZ( dPosition.z*this.moveMult.z );
			//added by AMG to remove the last z so that the array doesn't get too long
			if (this.accPosition.length > 2) this.accPosition.pop();
		}


	};

	this.connect = function() {

		onScreenOrientationChangeEvent(); // run once on load

		window.addEventListener( 'orientationchange', onScreenOrientationChangeEvent, false );
		window.addEventListener( 'deviceorientation', onDeviceOrientationChangeEvent, false );
		//added by AMG
		window.addEventListener( 'devicemotion', onDeviceMotionChangeEvent, false );

		scope.enabled = true;

	};

	this.disconnect = function() {

		window.removeEventListener( 'orientationchange', onScreenOrientationChangeEvent, false );
		window.removeEventListener( 'deviceorientation', onDeviceOrientationChangeEvent, false );
		//added by AMG
		window.removeEventListener( 'devicemotion', onDeviceMotionChangeEvent, false );

		scope.enabled = false;

	};


	this.update = function() {

		if ( scope.enabled === false ) return;

		var alpha = scope.deviceOrientation.alpha ? THREE.Math.degToRad( scope.deviceOrientation.alpha ) + this.alphaOffsetAngle : 0; // Z
		var beta = scope.deviceOrientation.beta ? THREE.Math.degToRad( scope.deviceOrientation.beta ) + this.betaOffsetAngle : 0; // X'
		var gamma = scope.deviceOrientation.gamma ? THREE.Math.degToRad( scope.deviceOrientation.gamma ) + this.gammaOffsetAngle : 0; // Y''
		var orient = scope.screenOrientation ? THREE.Math.degToRad( scope.screenOrientation ) : 0; // O
		setObjectQuaternion( scope.object.quaternion, alpha, beta, gamma, orient );
		this.alpha = alpha;


		if ('acceleration' in scope.deviceMotion)this.accelerate(scope.deviceMotion.acceleration, scope.deviceMotion.timeStamp);

	};

	this.updateAlphaOffsetAngle = function( angle ) {

		this.alphaOffsetAngle = angle;
		this.update();

	};

	this.updateBetaOffsetAngle = function( angle ) {

		this.betaOffsetAngle = angle;
		this.update();

	};

	this.updateGammaOffsetAngle = function( angle ) {

		this.gammaOffsetAngle = angle;
		this.update();

	};

	//added by AMG
	this.updateMoveMult = function( mult ) {

		this.moveMult = mult;
		this.update();

	};
	this.dispose = function() {

		this.disconnect();

	};

	this.connect();

};
