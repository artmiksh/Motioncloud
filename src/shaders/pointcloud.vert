// pointcloud.vert
uniform sampler2D uMask;     
uniform sampler2D uTexture;  
uniform float uPointSize;    
uniform float uDepthIntensity; 
uniform float uTime;  
uniform float uShowBackground; // 0.0 = Hide Background (Figure Only), 1.0 = Show All

varying vec3 vColor;
varying float vAlpha;

float getLuma(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
    vec2 uv = uv; 

    // 1. Read Mask
    float maskValue = texture2D(uMask, uv).r;

    // 2. Culling Logic
    // If uShowBackground == 0.0 (False), we ONLY show points where mask > 0.1
    // If uShowBackground == 1.0 (True), we show EVERYTHING (maskValue is effectively treated as 1.0 for visibility)
    
    float isVisible = 1.0;
    if (uShowBackground < 0.5) {
        if (maskValue < 0.1) isVisible = 0.0;
    }

    if (isVisible < 0.5) {
        gl_PointSize = 0.0;
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0); 
        return;
    }

    // 3. Read Video Color
    vec3 videoColor = texture2D(uTexture, uv).rgb;

    // 4. Displacement
    float luma = getLuma(videoColor);
    vec3 pos = position;
    
    float noise = sin(uv.x * 20.0 + uTime) * cos(uv.y * 20.0 + uTime) * 0.01;
    pos.z += (luma * uDepthIntensity) + noise;

    // 5. Final Position
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

    // 6. Point Size
    // If background is ON, we don't want the edge fade effect to make everything invisible
    // If background is OFF, we use maskValue for soft edges.
    float sizeMod = (uShowBackground > 0.5) ? 1.0 : smoothstep(0.0, 1.0, maskValue);
    
    gl_PointSize = uPointSize * sizeMod;

    vColor = videoColor;
    vAlpha = maskValue;
}
