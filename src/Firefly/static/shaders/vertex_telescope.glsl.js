var myTelescopeVertexShader = `

attribute float radiusScale;

uniform float boxSize;
uniform sampler2D distTex;
uniform float uVertexScale;

varying vec3 vPosition;

const float minPointScale = 0.0;
const float maxPointScale = 1000.;
const float sizeFac = 70.5; //trying to make physical sizes, I have NO idea why this number is needed.  This came from trial and error

void main(void) {


	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

	float cameraDist = length(mvPosition.xyz);

	float pointScale = 1./cameraDist;
	pointScale = clamp(pointScale, minPointScale, maxPointScale);
	gl_PointSize = pointScale * uVertexScale * radiusScale * sizeFac;

	vec4 position = projectionMatrix * mvPosition;

	//convert the position into the same format I used for the distance texture
	float x = position.x/position.w;
	float y = position.y/position.w;
	float z = cameraDist/(boxSize/2.);
	vec3 vPosition = vec3(x,y,z);

	gl_Position = projectionMatrix * mvPosition;

}

`;
