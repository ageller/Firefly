var myFragmentShader = `
precision mediump float;

varying float vID;
varying float vAlpha;
varying float glPointSize;
varying mat4 mvMatrix;
varying mat2 rotn;
varying vec3 vVelVals;
varying float vVertexScale;

uniform vec4 color;

uniform int SPHrad;
uniform vec3 cameraNegZ;
uniform vec3 cameraX;
uniform vec3 cameraY;

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

        
        float vyc = dot(vVelVals,cameraY);
        // why is this negative? 
        float vxc = -dot(vVelVals,cameraX); 

        float vSize = sqrt(vyc*vyc+vxc*vxc)/sqrt(dot(vVelVals,vVelVals));
        float theta = atan(vyc,vxc);
        if (theta<0.0){
            theta=theta+2.0*PI;
        }
        
        mat4 rot1 = rotationMatrix(vec3(0,0,1), theta);
        vec2 posRot = (rot1 * vec4(gl_PointCoord.x-0.5, gl_PointCoord.y-0.5,0., 1.)).xy;
        posRot.x+=0.5;

        if (abs(posRot.x) > vSize || abs(posRot.y)>0.05){
            discard;
        }

        gl_FragColor.r=1.;
        gl_FragColor.g=1.-posRot.x/vSize;
        gl_FragColor.b=1.-posRot.x/vSize;
        gl_FragColor.a=posRot.x/vSize;
}

    gl_FragColor.a *= vAlpha;
}

`;