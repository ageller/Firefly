var myFragmentShader_pass2 = `

varying vec2 vUv;

uniform sampler2D tex;
uniform sampler2D cmap;
uniform float colormap;
uniform float CDmin;
uniform float CDmax;
uniform float lognorm;
uniform float scaleCD;

void main() {
	vec4 color = texture2D(tex, vUv);

	float density_renorm;
	if (lognorm > 0.){
		density_renorm = (log(color.r/scaleCD)/log(10.)-CDmin)/(CDmax-CDmin);
	}
	else{
		density_renorm = (color.r/scaleCD-CDmin)/(CDmax-CDmin);
	}

	// clip renormalized values to be between 0 and 1
	float density_clamp = clamp(density_renorm, 0., 1.);


	// sample the colormap using the renormalized CD values
	gl_FragColor.rgb = texture2D(cmap, vec2(density_clamp, colormap)).rgb;

	
	if (density_clamp <= 0.){
		gl_FragColor.rgb = vec3(0);
	} 
	
	gl_FragColor.a = color.a;
	
}
`;

//could be used to block light from stars if gas is given red color and stars are given blue color
//float density = clamp(color.b - color.r, 0., 1.);
//if (color.b == 0. && color.r == 0.) gl_FragColor.rgba = vec4(0.);