var myFragmentShader_pass2 = `

varying vec2 vUv;

uniform sampler2D tex;
uniform sampler2D cmap;
uniform float colormap;

void main() {
	vec4 color = texture2D(tex, vUv);

	float density = clamp(length(color.rgb), 0., 1.);
	//gl_FragColor = vec4(density, 0, 0, 1);
	gl_FragColor.rgb = texture2D(cmap, vec2(density, colormap)).rgb;
	//gl_FragColor.rgb = vec3(density,colormap, 0);

	gl_FragColor.a = color.a;
	
}
`;