var myFragmentShader = `

precision mediump float;

varying float vID;
varying float vTheta;
varying float vAlpha;
//varying float vVertexScale;
//varying float glPointSize;

uniform vec4 color;
uniform int SPHrad;
uniform float velType; //0 = line, 1 = arrow, 2 = triangle

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
    if (vID < 0.5){ //normal mode, plotting points (should be vID == 0, but this may be safer)
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
    } else { //velocities, lines (Note: requiring vID == 1. breaks in windows for some reason)

        
        mat4 rot1 = rotationMatrix(vec3(0,0,1), vTheta);
        vec2 posRot = (rot1 * vec4(gl_PointCoord.x-0.5, gl_PointCoord.y-0.5,0., 1.)).xy;
        
        float lW = 0.02;

        // puts tail of vector at -1*lW (half-width offset helps with head-on view)
        if (posRot.x < -1.*lW){
            discard;
        }

        //impose minimum size, it will never be shorter than it is thick
        float vSize = max(0.5,lW);

        //line
        if (velType == 0.){ 
            if (posRot.x > vSize || abs(posRot.y) > lW ){
                discard;
            } 
        }

        //arrow
        float aH = 0.2;
        float aL = 0.75;
        if (velType == 1.){ //arrow
            if (posRot.x > vSize || (posRot.x < vSize*aL && abs(posRot.y) > lW) || (posRot.x > vSize*aL && abs(posRot.y) > (-1.*aH/vSize * posRot.x + aH) )   ){
                discard;
            } 
        }

        //triangle
        float tH = 0.1; 
        if (velType == 2.){ 
            if (posRot.x > vSize || abs(posRot.y) > (-1.*tH/(vSize) * posRot.x + tH)    ){
                discard;
            } 
        } 
        //gl_FragColor.rgb +=  (1. - posRot.x/vSize); //white at tail
        gl_FragColor.rgb +=  0.6*posRot.x/vSize; //whiter at head
        gl_FragColor.a = posRot.x/vSize;
    }
    gl_FragColor.a *= vAlpha;
}
`;
