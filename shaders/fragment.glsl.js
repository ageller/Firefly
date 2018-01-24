var myFragmentShader = `
precision mediump float;
varying float vID;
varying float vAlpha;
varying float glPointSize;
varying vec4 vVelVals;
varying float vVertexScale;
uniform vec4 color;
uniform int SPHrad;
uniform vec3 cameraNegZ;
uniform vec3 cameraX;
uniform vec3 cameraY;
uniform float velType; //0 = line, 1 = arrow, 2 = triangle
const float PI = 3.1415926535897932384626433832795;
//http://www.neilmendoza.com/glsl-rotation-about-an-arbitrary-axis/
mat4 rotationMatrix(vec3 axis, float angle)
{
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                0.0,                                0.0,                                0.0,                                1.0);
}
void main(void) {
    gl_FragColor = color;
    float dist = 0.;
    if (vID == 0.){ //normal mode, plotting points
        // Get the distance vector from the center
        vec2 fromCenter = abs(gl_PointCoord - vec2(0.5));
        dist = 2.*length(fromCenter) ;
        float dist2 = dist*dist;
        // best fit quartic to SPH kernel (unormalized)
        if (SPHrad == 1){
            float alpha_SPH =  -4.87537494*dist2*dist2 + 11.75074987*dist2*dist - 8.14117164*dist2 + 0.2657967*dist + 0.99328463;
            gl_FragColor.a *= alpha_SPH;
        } 
        else {
            gl_FragColor.a *= 1. - dist;
        }
    } 
    if (vID == 1.){ //velocities, lines
        // why is this negative? 
        vec3 velVals = vVelVals.xyz;
        float vyc = -dot(velVals,cameraY);
        float vxc = dot(velVals,cameraX); 
        float vSize = sqrt(vyc*vyc+vxc*vxc)/sqrt(dot(velVals,velVals))*vVelVals[3];
        float theta = atan(vyc,vxc);
        if (theta<0.0){
            theta=theta+2.0*PI;
        }
        
        mat4 rot1 = rotationMatrix(vec3(0,0,1), theta);
        vec2 posRot = (rot1 * vec4(gl_PointCoord.x-0.5, gl_PointCoord.y-0.5,0., 1.)).xy;
        
        // puts tail of vector at -0.02 (half-width offset helps with head-on view)
        if (posRot.x < -0.02){
            discard;
        }
        //impose minimum size, it will never be shorter than it is thick
        vSize=max(vSize,0.02);

        if (velType == 0.){ //line
            if (posRot.x > vSize || abs(posRot.y) > 0.02 ){
                discard;
            } 
        }
        if (velType == 1.){ //arrow
            discard;
        }
        float tH = 0.05; 
        if (velType == 2.){ //triangle
            if (posRot.x > vSize || abs(posRot.y) > abs(tH/vSize * posRot.x - tH)   ){
                discard;
            } 
        } 
        //gl_FragColor.rgb +=  (1. - posRot.x/vSize); //white at tail
        gl_FragColor.rgb +=  0.5*posRot.x/vSize; //white at head
        gl_FragColor.a = posRot.x/vSize;
        // maybe arrow?
}
    gl_FragColor.a *= vAlpha;
}
`;