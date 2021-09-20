var myDistFragmentShader = `

//precision mediump float;
uniform float boxSize;

varying float vPointSize;
varying float vCameraDist;

void main(void) {

	// Get the distance vector from the center
	float dist = 0.;
	vec2 fromCenter = abs(gl_PointCoord - vec2(0.5));
	dist = 2.*length(fromCenter) ;
	float dist2 = dist*dist;
	// fix for the minimum point size imposed by WebGL context gl.ALIASED_POINT_SIZE_RANGE = [1, ~8000]
	float dMax = min(1., vPointSize);

	//set the color based on the distance, but I want to invert it so that the black background is the large distance
	//probably some better way to normalize this number
	gl_FragColor.rgb = vec3(1. - vCameraDist/(boxSize/2.)); 
	//gl_FragColor.rgb = vec3(3. - log(vCameraDist));

	//this doesn't seem to help
	// //I'll try to be a little more careful about precision here
	// //assume that d = 1. - vCameraDist/(boxSize/2.) = 0.123456789
	// //I want rgb = (0.123, 0.456, 0.789);
	// float d = 1. - vCameraDist/(boxSize/2.); //I will assume this is always less than 1
	// float r = floor(d*1000.)/1000.;
	// float g = floor((d - r)*1000000.)/1000.;
	// float b = floor((d - r - g/1000.)*1000000000.)/1000.;
	// gl_FragColor.rgb = vec3(r,g,b);

	// //to reconstruct d = r + g/1000. + b/1000000.

	gl_FragColor.a = 1.;
	if (dist > dMax){
		discard;
	}

}
`;