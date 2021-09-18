var myFragmentShader_texture = `

//to test the texture

varying vec2 vUv;

uniform sampler2D tex;

void main() {
	gl_FragColor = texture2D(tex, vUv);
}


`;
