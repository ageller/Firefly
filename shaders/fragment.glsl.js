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
uniform vec3 cameraRot;

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

        } else {
            gl_FragColor.a *= 1. - dist;
        }


 
    } 
    if (vID == 1.){ //velocities, lines
        vec2 pos = 2.*(gl_PointCoord - vec2(0.5));
        //vec2 posRot;
        //vec3 axis = vec3(1. - cos(cameraRot[1]), 0., cos(cameraRot[1]));

        mat4 rot1 = rotationMatrix(cameraRot, vVelVals[1]);
        mat4 rot2 = rotationMatrix(vec3(0., 0., 1.), vVelVals[1]);
        vec2 posRot = (rot1 * vec4(pos, 0., 1.)).xy;
        
        //vec2 maxSize = (rot2 * vec4(1., 0., 0., 1.)).xy;

        //posRot.x =     pos.x*cos(ang) + pos.y*sin(ang);
        //posRot.y = -1.*pos.x*sin(ang) + pos.y*cos(ang);
        float maxX = 1. - abs(cameraRot.x);
        float maxY = 1. - abs(cameraRot.y);
        //vec4 pos = mvMatrix * vec4(2.*(gl_PointCoord - vec2(0.5)), 0., 1.);
        //vec2 center = vec2(0.5);
        //vec2 pos = rotn * (gl_PointCoord - center) + center;
        
        float fac = 1. - (length(cameraRot.yz) + 1.)/2.;
        gl_FragColor.rgb +=  abs(fac - posRot.x );

        //if (gl_PointCoord.x > maxSize.x){
        //    discard;
        //}

        //if (gl_PointCoord.x > maxX){
        //    discard;
        //}

        if (abs(posRot.y) > 0.2/vVertexScale || posRot.x < 0.){
            discard;
        }
        //if (abs(pos.y) > 0.05 || abs(pos.x) > 0.5){
        //if (length(pos.xy) > length(size.xy)){
        //    discard;
        //}

    }

    gl_FragColor.a *= vAlpha;
}

`;