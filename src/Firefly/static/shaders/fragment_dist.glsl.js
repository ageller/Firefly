var myDistFragmentShader = `

//precision mediump float;

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



	gl_FragColor.rgb = vec3(log(vCameraDist)/2.); //probably some better way to normalize this number
	gl_FragColor.a = 1.;
	if (dist > dMax){
		discard;
	}

}
`;