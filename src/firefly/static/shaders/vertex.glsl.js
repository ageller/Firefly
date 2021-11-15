var myVertexShader = `

attribute float radiusScale; //for filtering [0,1]
attribute float alpha;
attribute vec4 velVals;
attribute vec4 colorArray;
attribute float colormapArray;
attribute float pointIndex;

varying float vID;
varying float vTheta;
varying float vColormapMag;
varying float vAlpha;
varying vec2 vUv; //for the column density 
varying float vPointSize;
varying vec4 vColor;
varying float vIndex;

uniform float colormapMax;
uniform float colormapMin;
uniform float oID;
uniform float uVertexScale; //from the GUI
uniform float octreePointScale;
uniform float maxDistance;
uniform vec3 cameraX;
uniform vec3 cameraY;
uniform float minPointScale;
uniform float maxToRender;

const float maxPointScale = 10.;//1000.;
const float PI = 3.1415926535897932384626433832795;
const float sizeFac = 70.5; //trying to make physical sizes, I have NO idea why this number is needed.  This came from trial and error
const float vectorFac = 5.; //so that vectors aren't smaller

void main(void) {
	vID = oID;
	vTheta = 0.;
	vAlpha = alpha;
	vUv = uv;
	vIndex = pointIndex;

	//vVertexScale = uVertexScale;

	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

	float cameraDist = length(mvPosition.xyz);
	float pointScale = 1./cameraDist;//maxDistance/cameraDist;
	pointScale = pointScale * octreePointScale * uVertexScale * radiusScale * sizeFac;

	
	//gl_PointSize = uVertexScale * pointScale * radiusScale;
	gl_PointSize = clamp(pointScale, minPointScale, maxPointScale);

	if (pointIndex > maxToRender) gl_PointSize = 0.;

	// send colormap array to fragment shader
	vColormapMag = clamp(((colormapArray - colormapMin) / (colormapMax - colormapMin)), 0., 1.);

	if (vID > 0.5){ //velocities (==1, but safer this way)
		float vyc= -dot(velVals.xyz,cameraY);
		float vxc = dot(velVals.xyz,cameraX); 
		float vSize = sqrt(vyc*vyc+vxc*vxc)/sqrt(dot(velVals.xyz,velVals.xyz))*velVals[3] * 0.5;
		vTheta = atan(vyc,vxc);
		if (vTheta<0.0){
			vTheta=vTheta+2.0*PI;
		}
		gl_PointSize = gl_PointSize*vSize*vectorFac;

	}

	vPointSize = gl_PointSize;

	vColor = colorArray;

	gl_Position = projectionMatrix * mvPosition;

}

`;
