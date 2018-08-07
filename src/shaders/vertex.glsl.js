var myVertexShader = `

attribute float radiusScale;
attribute float alpha;
attribute vec4 velVals;

varying float vID;
varying float vTheta;
varying float vAlpha;
//varying float vVertexScale;
//varying float glPointSize;

uniform float oID;
uniform float uVertexScale;
uniform float maxDistance;
uniform vec3 cameraX;
uniform vec3 cameraY;

const float minPointScale = 0.01;
const float maxPointScale = 1000.;
const float PI = 3.1415926535897932384626433832795;


void main(void) {
    vID = oID;
    vTheta = 0.;
    vAlpha = alpha;
    
    //vVertexScale = uVertexScale;

    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

    float cameraDist = length(mvPosition.xyz);
    float pointScale = maxDistance/cameraDist;
    pointScale = clamp(pointScale, minPointScale, maxPointScale);
    
    gl_PointSize = uVertexScale * pointScale * radiusScale;

    if (vID > 0.5){ //velocities (==1, but safer this way)
        float vyc = -dot(velVals.xyz,cameraY);
        float vxc = dot(velVals.xyz,cameraX); 
        float vSize = sqrt(vyc*vyc+vxc*vxc)/sqrt(dot(velVals.xyz,velVals.xyz))*velVals[3] * 0.5;
        vTheta = atan(vyc,vxc);
        if (vTheta<0.0){
            vTheta=vTheta+2.0*PI;
        }
		gl_PointSize = gl_PointSize*vSize;

    }

    //glPointSize = gl_PointSize;

    gl_Position = projectionMatrix * mvPosition;

}

`;
