var myDistVertexShader = `

attribute float iden;  //attributes cannot be ints

uniform float boxSize;
uniform float texSize; 

varying vec3 vColor;


void main(void) {

	
	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

	float cameraDist = length(mvPosition.xyz);

	vec4 position = projectionMatrix * mvPosition;

	//convert this into a format I can use for a color
	float x = position.x/position.w;
	float y = position.y/position.w;

	//for the z value, I will use the camera distance
	//large camera distance corresponds to large values of z, but I need to normalize this somehow... not sure this is the best way
	float z = cameraDist/(boxSize/2.);

	vColor = vec3(x,y,z);

	gl_PointSize = 1.;

	//get the position based on the unique identity
	float xPos = mod(iden, texSize);
	float yPos = floor((iden - xPos)/texSize); 
	gl_Position = vec4(xPos/texSize, yPos/texSize, 0., 1.); // what do I use for the z position?

}

`;
