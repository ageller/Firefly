var myFragmentShader = `

//precision mediump float;

varying vec2 vUv;

varying float vID;
varying float vTheta;
varying float vColormapMag;
varying float vAlpha;
varying float vPointSize;
varying vec4 vColor;
varying float vCameraDist;
varying vec4 vPosition;

uniform bool showColormap;
uniform float colormap;
uniform vec4 color;
uniform int SPHrad;
uniform float velType; //0 = line, 1 = arrow, 2 = triangle
uniform sampler2D colormapTexture;

uniform bool opacityImage;
uniform sampler2D distTex;
uniform float boxSize;

uniform bool columnDensity;
uniform float scaleCD;

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

	// Get the distance vector from the center
	float dist = 0.;
	vec2 fromCenter = abs(gl_PointCoord - vec2(0.5));
	dist = 2.*length(fromCenter) ;
	float dist2 = dist*dist;
	// fix for the minimum point size imposed by WebGL context gl.ALIASED_POINT_SIZE_RANGE = [1, ~8000]
	float dMax = min(1., vPointSize);


	// if colormap is requested, apply appropriate colormap to appropriate variable
	if (showColormap){
		if (vID > -1.){
			vec2 pos = vec2(vColormapMag, colormap);
			vec3 c = texture2D(colormapTexture, pos).rgb;
			gl_FragColor.rgb = c;

		}
	}

	if (vID < 0.5){ //normal mode, plotting points (should be vID == 0, but this may be safer)
		if (showColormap){
			if (dist > dMax){
				discard;
			}
		} else {
			if (SPHrad == 1){
				// best fit quartic to SPH kernel (unormalized)
				float alpha_SPH =  -4.87537494*dist2*dist2 + 11.75074987*dist2*dist - 8.14117164*dist2 + 0.2657967*dist + 0.99328463;
				gl_FragColor.a *= alpha_SPH;
			} 
			else {
				gl_FragColor.a *= dMax - dist;
			}
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
		gl_FragColor.rgb +=  0.4*posRot.x/vSize; //whiter at head
		//gl_FragColor.a = posRot.x/vSize;
	}
	gl_FragColor.a *= vAlpha;

	if (columnDensity){
		gl_FragColor.rgb *= scaleCD; //need some factor here so that it adds up progressively
	}


	if (opacityImage){
		//read the distance from the texture
		float x = vPosition.x/vPosition.w;
		float y = vPosition.y/vPosition.w;
		vec2 texCoord = vec2(0.5*x + 0.5, 0.5*y + 0.5);
		vec4 d = texture2D(distTex, texCoord);
		//reconstruct the distance from the tex color
		//float distFromTex = d.r + d.g/1000. + d.b/1000000.;
		float distFromTex = d.r;
		//decide whether to include gas (using the same normalization for distance as for distMap... which should be improved)
		float invDist = 1. - vCameraDist/(boxSize/2.); 
		if ( invDist < distFromTex ){
			discard;
		}

		// gl_FragColor.rgb =  vec3(texCoord,0.);//distFromTex;
		// gl_FragColor =  distFromTex;
	}


	//I think this is for setting individual colors(?)
	if (vColor[3] >= 0.) {
		gl_FragColor.rgb = vColor.rgb;
		gl_FragColor.a *= vColor[3];
	}

}
`;