var myFragmentShader_telescope = `

varying vec2 vUv;

uniform sampler2D opacityTex;
uniform sampler2D luminTex;


void main() {
	vec4 opacity = texture2D(opacityTex, vUv);
	vec4 lumin = texture2D(luminTex, vUv);

	//test simply subtracting
	gl_FragColor = vec4(lumin.rgb - opacity.rgb, lumin.a); 
	//gl_FragColor = lumin;
	
}
`;
