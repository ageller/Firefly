var myDistVertexShader = `

attribute float radiusScale;
attribute float alpha;
attribute vec4 velVals;
attribute vec4 colorArray;
attribute float colormapArray;

uniform float uVertexScale;

varying float vPointSize;
varying float vCameraDist;

const float minPointScale = 0.0;//1;
const float maxPointScale = 1000.;
const float sizeFac = 70.5; //trying to make physical sizes, I have NO idea why this number is needed.  This came from trial and error

void main(void) {

	
	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

	float cameraDist = length(mvPosition.xyz);
	vCameraDist = cameraDist;

	float pointScale = 1./cameraDist;
	pointScale = clamp(pointScale, minPointScale, maxPointScale);
	gl_PointSize = pointScale * uVertexScale * radiusScale * sizeFac;
	vPointSize = gl_PointSize;

	gl_Position = projectionMatrix * mvPosition;

}

`;
