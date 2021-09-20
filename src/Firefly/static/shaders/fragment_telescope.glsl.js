var myFragmentShader_telescope = `

varying vec2 vUv;

uniform sampler2D opacityTex;
uniform sampler2D luminTex;
uniform sampler2D reflectTex;


void main() {
	vec4 lumin = texture2D(luminTex, vUv);
	vec4 reflect = texture2D(reflectTex, vUv);
	vec4 opacity = texture2D(opacityTex, vUv);

	//test simply subtracting
	//gl_FragColor = vec4(lumin.rgb + reflect.rgb - opacity.rgb, lumin.a); 
	vec4 color = clamp(lumin + reflect, 0., 1.);
	color.rgb -= opacity.rgb;

	//color = reflect;
	//color = opacity;

	gl_FragColor = color;	
}
`;
