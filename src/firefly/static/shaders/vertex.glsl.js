var myVertexShader = `

attribute float radiusScale; //for filtering [0,1]
attribute float alpha;
attribute vec4 rgbaColor;
attribute float colormapField;

uniform float vID;
attribute vec4 velVals;
varying float vTheta;
varying float vColormapMag;
varying float vAlpha;
varying float vPointSize;
varying vec4 vColor;

varying vec2 vUv; //for the column density 

uniform float colormapMax;
uniform float colormapMin;
uniform vec3 cameraX;
uniform vec3 cameraY;
uniform float minPointScale;
uniform float maxPointScale;
uniform float uVertexScale; //from the GUI

uniform float velTime;

const float PI = 3.1415926535897932384626433832795;
// vectors are substantially smaller (b.c. they're built by discarding) so we need to scale them 
// to compensate, otherwise they are /tiny/
const float velVectorSizeFac = 50.; 

void main(void) {
	vTheta = 0.;
	vAlpha = alpha;
	vUv = uv;

	//vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
	vec4 mvPosition = modelViewMatrix * vec4( position + velVals.xyz*velTime, 1.0 );

	float cameraDist = length(mvPosition.xyz);
	float pointScale = 1./cameraDist * uVertexScale * radiusScale;

	
	//gl_PointSize = uVertexScale * pointScale * radiusScale;
	gl_PointSize = clamp(pointScale, minPointScale, maxPointScale);

	// send colormap array to fragment shader
	vColormapMag = clamp(((colormapField - colormapMin) / (colormapMax - colormapMin)), 0., 1.);

	if (vID > 0.5){ //velocities (==1, but safer this way)
		float vyc= -dot(velVals.xyz,cameraY);
		float vxc = dot(velVals.xyz,cameraX); 
		float vSize = sqrt(vyc*vyc+vxc*vxc)/sqrt(dot(velVals.xyz,velVals.xyz))*velVals[3] * 0.5;
		vTheta = atan(vyc,vxc);
		if (vTheta<0.0){
			vTheta=vTheta+2.0*PI;
		}
		gl_PointSize = gl_PointSize*vSize*velVectorSizeFac;

	}

	vPointSize = gl_PointSize;

	vColor = rgbaColor;

	gl_Position = projectionMatrix * mvPosition;

}

`;
