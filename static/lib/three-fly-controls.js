/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 * @author paulirish / http://paulirish.com/
 */

//edited by Aaron Geller to only allow WASDRF movements, and enable the movementSpeedMultiplier


    THREE.FlyControls = function ( object, domElement, opts ) {

        this.object = object;

        opts = opts || {};

        this.domElement = ( domElement !== undefined ) ? domElement : document;
        if ( domElement ) this.domElement.setAttribute( 'tabindex', -1 );

        // API

        this.movementSpeed = (opts.movementSpeed === undefined) ? 1.0 : opts.movementSpeed;
        this.rollSpeed = (opts.rollSpeed === undefined) ? 0.005 : opts.rollSpeed;

        this.movementSpeedMultiplier = 1.

        this.dragToLook = true;
        this.autoForward = false;

        // disable default target object behavior

        // internals

        this.tmpQuaternion = new THREE.Quaternion();

        this.mouseStatus = 0;

        this.moveState = { up: 0, down: 0, left: 0, right: 0, forward: 0, back: 0, pitchUp: 0, pitchDown: 0, yawLeft: 0, yawRight: 0, rollLeft: 0, rollRight: 0 };
        this.moveVector = new THREE.Vector3( 0, 0, 0 );
        this.rotationVector = new THREE.Vector3( 0, 0, 0 );
        this.event0;

        var prevTime = Date.now();


        this.handleEvent = function ( event ) {

            if ( typeof this[ event.type ] == 'function' ) {

                this[ event.type ]( event );

            }

        };

        this.keydown = function( event ) {

            if ( event.altKey ) {

                return;

            }

            

            switch ( event.keyCode ) {

                case 16: /* shift */ this.movementSpeedMultiplier = .1; break;

                case 87: /*W*/ this.moveState.forward = 1; break;
                case 83: /*S*/ this.moveState.back = 1; break;

                case 65: /*A*/ this.moveState.left = 1; break;
                case 68: /*D*/ this.moveState.right = 1; break;

                case 82: /*R*/ this.moveState.up = 1; break;
                case 70: /*F*/ this.moveState.down = 1; break;

                //case 38: /*up*/ this.moveState.pitchUp = 1; break;
                //case 40: /*down*/ this.moveState.pitchDown = 1; break;

                //case 37: /*left*/ this.moveState.yawLeft = 1; break;
                //case 39: /*right*/ this.moveState.yawRight = 1; break;

                //case 81: /*Q*/ this.moveState.rollLeft = 1; break;
                //case 69: /*E*/ this.moveState.rollRight = 1; break;

            }
            
            var surpress = [38, 40, 37, 39];

            if(surpress.indexOf(event.keyCode) > -1) {
                event.preventDefault();
            }

            this.updateMovementVector();
            this.updateRotationVector();

        };

        this.keyup = function( event ) {

            switch( event.keyCode ) {

                case 16: /* shift */ this.movementSpeedMultiplier = 1; break;

                case 87: /*W*/ this.moveState.forward = 0; break;
                case 83: /*S*/ this.moveState.back = 0; break;

                case 65: /*A*/ this.moveState.left = 0; break;
                case 68: /*D*/ this.moveState.right = 0; break;

                case 82: /*R*/ this.moveState.up = 0; break;
                case 70: /*F*/ this.moveState.down = 0; break;

                case 38: /*up*/ this.moveState.pitchUp = 0; break;
                case 40: /*down*/ this.moveState.pitchDown = 0; break;

                case 37: /*left*/ this.moveState.yawLeft = 0; break;
                case 39: /*right*/ this.moveState.yawRight = 0; break;

                case 81: /*Q*/ this.moveState.rollLeft = 0; break;
                case 69: /*E*/ this.moveState.rollRight = 0; break;

            }

            this.updateMovementVector();
            this.updateRotationVector();

        };

        this.mousedown = function( event ) {

            if ( this.domElement !== document ) {

                this.domElement.focus();

            }

            event.preventDefault();
            event.stopPropagation();
            this.event0 = event;

            if ( this.dragToLook ) {

                this.mouseStatus ++;

            } else {

                switch ( event.button ) {

                    case 0: this.moveState.forward = 1; break;
                    case 2: this.moveState.back = 1; break;

                }

                this.updateMovementVector();

            }

        };

        this.mousemove = function( event ) {
            if ( !this.dragToLook || this.mouseStatus > 0 ) {

                var container = this.getContainerDimensions();
                var halfWidth  = container.size[ 0 ] / 2;
                var halfHeight = container.size[ 1 ] / 2;

                // this.moveState.yawLeft   = - ( ( event.pageX - container.offset[ 0 ] ) - halfWidth  ) / halfWidth;
                // this.moveState.pitchDown =   ( ( event.pageY - container.offset[ 1 ] ) - halfHeight ) / halfHeight;
                
                this.moveState.yawLeft   = - ( ( event.pageX - this.event0.pageX )  ) / halfWidth;
                this.moveState.pitchDown =   ( ( event.pageY - this.event0.pageY )  ) / halfHeight;

                this.updateRotationVector();

            }

        };


        this.mouseout = function( event ) {

            event.preventDefault();
            event.stopPropagation();
            this.moveState = { up: 0, down: 0, left: 0, right: 0, forward: 0, back: 0, pitchUp: 0, pitchDown: 0, yawLeft: 0, yawRight: 0, rollLeft: 0, rollRight: 0 };
            this.updateRotationVector();
            this.updateMovementVector();
        };

        this.mouseup = function( event ) {

            event.preventDefault();
            event.stopPropagation();

            if ( this.dragToLook ) {

                //this.mouseStatus --;
                this.mouseStatus = 0;

                this.moveState.yawLeft = this.moveState.pitchDown = 0;

            } else {

                switch ( event.button ) {

                    case 0: this.moveState.forward = 0; break;
                    case 2: this.moveState.back = 0; break;

                }

                this.updateMovementVector();

            }

            this.updateRotationVector();

        };

        this.update = function( delta ) {
            
            var time = Date.now();
            var delta = ( time - prevTime ) / 10;

            var moveMult = delta * this.movementSpeed * this.movementSpeedMultiplier;
            var rotMult = delta * this.rollSpeed;// * this.movementSpeedMultiplier;

            this.object.translateX( this.moveVector.x * moveMult );
            this.object.translateY( this.moveVector.y * moveMult );
            this.object.translateZ( this.moveVector.z * moveMult );

            this.tmpQuaternion.set( this.rotationVector.x * rotMult, this.rotationVector.y * rotMult, this.rotationVector.z * rotMult, 1 ).normalize();
            this.object.quaternion.multiply( this.tmpQuaternion );

            // expose the rotation vector for convenience
            this.object.rotation.setFromQuaternion( this.object.quaternion, this.object.rotation.order );

            prevTime = time;
        };

        this.updateMovementVector = function() {

            var forward = ( this.moveState.forward || ( this.autoForward && !this.moveState.back ) ) ? 1 : 0;

            this.moveVector.x = ( -this.moveState.left    + this.moveState.right );
            this.moveVector.y = ( -this.moveState.down    + this.moveState.up );
            this.moveVector.z = ( -forward + this.moveState.back );

            //console.log( 'move:', [ this.moveVector.x, this.moveVector.y, this.moveVector.z ] );

        };

        this.updateRotationVector = function() {

            this.rotationVector.x = ( -this.moveState.pitchDown + this.moveState.pitchUp );
            this.rotationVector.y = ( -this.moveState.yawRight  + this.moveState.yawLeft );
            this.rotationVector.z = ( -this.moveState.rollRight + this.moveState.rollLeft );

            //console.log( 'rotate:', [ this.rotationVector.x, this.rotationVector.y, this.rotationVector.z ] );

        };

        this.getContainerDimensions = function() {

            if ( this.domElement != document ) {

                return {
                    size    : [ this.domElement.offsetWidth, this.domElement.offsetHeight ],
                    offset  : [ this.domElement.offsetLeft,  this.domElement.offsetTop ]
                };

            } else {

                return {
                    size    : [ window.innerWidth, window.innerHeight ],
                    offset  : [ 0, 0 ]
                };

            }

        };



        function bind( scope, fn ) {

            return function () {

                fn.apply( scope, arguments );

            };

        };

        this.dispose = function() {

            this.domElement.removeEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );

            this.domElement.removeEventListener( 'mousemove', bind( this, this.mousemove ), false );
            this.domElement.removeEventListener( 'mousedown', bind( this, this.mousedown ), false );
            this.domElement.removeEventListener( 'mouseup',   bind( this, this.mouseup ), false );
            this.domElement.removeEventListener( 'mouseout',   bind( this, this.mouseout ), false );

            this.domElement.removeEventListener( 'keydown', bind( this, this.keydown ), false );
            this.domElement.removeEventListener( 'keyup',   bind( this, this.keyup ), false );

            document.removeEventListener( 'mousemove', bind( this, this.mousemove ), false );
            document.removeEventListener( 'mouseup', bind( this, this.mouseup ), false );

            window.removeEventListener( 'keydown', bind( this, this.keydown ), false );
            window.removeEventListener( 'keyup', bind( this, this.keyup ), false );


        }

        this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );

        this.domElement.addEventListener( 'mousemove', bind( this, this.mousemove ), false );
        this.domElement.addEventListener( 'mousedown', bind( this, this.mousedown ), false );
        this.domElement.addEventListener( 'mouseup',   bind( this, this.mouseup ), false );
        this.domElement.addEventListener( 'mouseout',   bind( this, this.mouseout ), false );

        this.domElement.addEventListener( 'keydown', bind( this, this.keydown ), false );
        this.domElement.addEventListener( 'keyup',   bind( this, this.keyup ), false );

        this.updateMovementVector();
        this.updateRotationVector();
    };

