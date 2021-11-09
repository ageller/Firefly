var myOctreeFragmentShader = `

uniform vec4 color;
uniform float maxToRender;

varying float vIndex;

void main(void) {

	gl_FragColor = color;

	// Get the distance vector from the center
	vec2 fromCenter = abs(gl_PointCoord - vec2(0.5));
	float dist = 2.*length(fromCenter) ;


	gl_FragColor.a *= (1. - dist);


	if (vIndex > maxToRender) {
		discard;
		gl_FragColor = vec4(0,0,0,0);
	}

}
`;