var myOctreeVertexShader = `

attribute float pointIndex;

uniform float minPointSize;
uniform float maxToRender;
uniform float pointScale;

varying float vIndex;

const float maxPointSize = 10.;

void main(void) {

	vIndex = pointIndex;

	vec4 mvPosition = modelViewMatrix*vec4( position, 1.0 );

	float cameraDist = length(mvPosition.xyz);
	float pointSize = pointScale/cameraDist;
	pointSize = clamp(pointSize, minPointSize, maxPointSize);
	
	gl_PointSize = pointSize;

	if (pointIndex > maxToRender) gl_PointSize = 0.;
	
	gl_Position = projectionMatrix*mvPosition;


}

`;
