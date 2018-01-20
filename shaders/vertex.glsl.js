var myVertexShader = `

attribute float alpha;
attribute vec4 velVals;

varying float vID;
varying float vAlpha;
varying float glPointSize;
varying vec4 vVelVals;
varying float vVertexScale;

uniform float oID;
uniform float uVertexScale;
uniform float maxDistance;

const float minPointScale = 0.01;
const float maxPointScale = 1000.;


void main(void) {
    vID = oID;
    vAlpha = alpha;
    vVelVals = velVals;
    vVertexScale = uVertexScale;

    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

    float cameraDist = length(mvPosition.xyz);
    float pointScale = maxDistance/cameraDist;
    pointScale = clamp(pointScale, minPointScale, maxPointScale);
    
    gl_PointSize = uVertexScale * pointScale;
    glPointSize = gl_PointSize;

    gl_Position = projectionMatrix * mvPosition;

}

`;