var myFragmentShader_pass2 = `

varying vec2 vUv;

uniform sampler2D tex;
uniform sampler2D cmap;
uniform float colormap;

void main() {
	vec4 color = texture2D(tex, vUv);

	float density = clamp(length(color.rgb), 0., 1.);

	//could be used to block light from stars if gas is given red color and stars are given blue color
	//float density = clamp(color.b - color.r, 0., 1.);

	gl_FragColor.rgb = texture2D(cmap, vec2(density, colormap)).rgb;

	//if (color.b == 0. && color.r == 0.) gl_FragColor.rgba = vec4(0.);
	
	if (density <= 0.){
		gl_FragColor.rgb = vec3(0);
	} 
	
	gl_FragColor.a = color.a;
	
}
`;
