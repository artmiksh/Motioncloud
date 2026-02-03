// pointcloud.frag
uniform vec3 uColor; 

varying vec3 vColor; 
varying float vAlpha; 

void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    if(length(coord) > 0.5) discard;

    // Use 100% Selected Color. No mixing.
    vec3 finalColor = uColor;

    // vAlpha comes from the Mask.
    // If AI fails, vAlpha is 1.0 everywhere.
    // If AI works, vAlpha is high on person.
    
    gl_FragColor = vec4(finalColor, vAlpha);
}
