var myVertexShader = `

attribute float alpha;
attribute vec3 velVals;

varying float vID;
varying float vAlpha;
varying float glPointSize;
varying mat4 mvMatrix;
varying mat2 rotn;
varying vec3 vVelVals;
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
    mvMatrix = projectionMatrix;
	rotn = mat2(cos(normal[0]), sin(normal[0]), -sin(normal[0]), cos(normal[0])); 

    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

    float cameraDist = length(mvPosition.xyz);
    float pointScale = maxDistance/cameraDist;
    pointScale = clamp(pointScale, minPointScale, maxPointScale);
    
    gl_PointSize = uVertexScale * pointScale;
    glPointSize = gl_PointSize;

    gl_Position = projectionMatrix * mvPosition;

}

`;