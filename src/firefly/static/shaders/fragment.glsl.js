var myFragmentShader = `

//precision mediump float;

uniform float vID;
varying float vTheta;
varying float vColormapMag;
varying float vAlpha;
varying float vPointSize;
varying vec4 vColor;

uniform bool showColormap;
uniform float colormap;
uniform vec4 color;
uniform int SPHrad;
uniform float velType; //0 = line, 1 = arrow, 2 = triangle
uniform sampler2D colormapTexture;
uniform bool columnDensity;
uniform float scaleCD;

uniform float velVectorWidth;
uniform float velGradient;
uniform float useDepth;

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

	//check vID because we use this to turn particle off
	if (vID <= -1.){
		discard;
	} else {
		// hijack color for making a projection
		if (columnDensity){
			gl_FragColor.r = 1.;
			gl_FragColor.g = 0.;
			gl_FragColor.b = 0.;
			gl_FragColor.a = 1.;
		}
		// if colormap is requested, apply appropriate colormap to appropriate variable
		//  this should have priority over everything else (so long)
		else if (showColormap){
			// if you want to reverse colormap: vec2 pos = vec2(1.-vColormapMag, colormap);
			vec2 pos = vec2(vColormapMag, colormap);
			vec3 c = texture2D(colormapTexture, pos).rgb;
			gl_FragColor.rgb = c;
			gl_FragColor.a = 1.;
		}
		// use passed RGBA color
		else if (vColor[3] >= 0.) { 
			gl_FragColor.rgb = vColor.rgb;
			gl_FragColor.a = vColor[3];
		}
		// use fixed color as a last resort
		else gl_FragColor = color;

		float dist = 0.;
		if (vID < 0.5){ //normal mode, plotting points (should be vID == 0, but this may be safer)
			// Get the distance vector from the center
			vec2 fromCenter = abs(gl_PointCoord - vec2(0.5));
			dist = 2.*length(fromCenter) ;
			float dist2 = dist*dist;
			// fix for the minimum point size imposed by WebGL context gl.ALIASED_POINT_SIZE_RANGE = [1, ~8000]
			float dMax = min(1., vPointSize);
			if (useDepth > 0.5){
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
					if (vPointSize > 1.) gl_FragColor.a *= dMax - dist;
					//if (dist > dMax){ discard; }
				}
			}
		} else { //velocities, lines (Note: requiring vID == 1. breaks in windows for some reason)

			
			mat4 rot1 = rotationMatrix(vec3(0,0,1), vTheta);
			vec2 posRot = (rot1 * vec4(gl_PointCoord.x-0.5, gl_PointCoord.y-0.5,0., 1.)).xy;
			
			float lW = 0.02*velVectorWidth;

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
			float aH = 0.2*velVectorWidth;
			float aL = 0.75;
			if (velType == 1.){ //arrow
				if (posRot.x > vSize || (posRot.x < vSize*aL && abs(posRot.y) > lW) || (posRot.x > vSize*aL && abs(posRot.y) > (-1.*aH/vSize * posRot.x + aH) )   ){
					discard;
				} 
			}

			//triangle
			float tH = 0.1*velVectorWidth; 
			if (velType == 2.){ 
				if (posRot.x > vSize || abs(posRot.y) > (-1.*tH/(vSize) * posRot.x + tH)    ){
					discard;
				} 
			} 

			if (velGradient > 0.5){
				//gl_FragColor.rgb +=  (1. - posRot.x/vSize); //white at tail
				gl_FragColor.rgb +=  0.4*posRot.x/vSize; //whiter at head
			}
			//gl_FragColor.a = posRot.x/vSize;
		}

		// need some factor here so that it adds up progressively
		//  it will be divided out in the second pass so long as it doesn't saturate.
		if (columnDensity){
			gl_FragColor.rgb *= scaleCD; 
		}

		gl_FragColor.a *= vAlpha;

	}
}
`;