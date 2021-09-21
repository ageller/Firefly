var myTelescopeFragmentShader = `

varying vec3 vPosition;

uniform float texSize; 
uniform sampler2D distTex;
uniform vec4 opacity;
uniform vec4 color;

//unfortunately, we need a const for the for loop.  I will make this a relatively large number, but it may need to be increased if we have very large data sets
const float loopMax = 100.;

void main() {

	gl_FragColor = color;

	//find any particles in dist tex that overlap with this pixel position (x,y) and are in front
	float distTol = 0.1; //normalized distance must be less than this to be counted as an overlap
	for(float i = 0.; i < loopMax; i++) {
		for(float j = 0.; j < loopMax; j++) {
			if (i < texSize && j < texSize){
				vec4 starPos = texture2D(distTex, vec2(i/texSize, j/texSize));
				float d = length(starPos.xy - vPosition.xy);
				if (d < distTol && starPos.z > vPosition.z){
					gl_FragColor.rgb -= opacity.rgb*opacity.a;
				}
			}
		}
	}


}
`;
