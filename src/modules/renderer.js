// src/modules/renderer.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class Renderer {
    constructor(config) {
        this.config = config;
        this.canvas = document.getElementById(config.canvasId);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(config.clearColor);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 0, 2);

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.5;

        this.objects = {};

        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        });

        this.videoTexture = null;
        this.maskTexture = null;
    }

    async init(sceneGraphConfig) {
        const loadShader = async (path) => {
            const res = await fetch(`./src/shaders/${path}`);
            return await res.text();
        };

        for (const objConfig of sceneGraphConfig.objects) {
            if (objConfig.type === 'Particles') {
                await this.createPointCloud(objConfig, loadShader);
            }
        }
    }

    async createPointCloud(config, loadShader) {
        const { geometry: geoConfig, material: matConfig } = config;

        const geometry = new THREE.PlaneGeometry(3 * (16 / 9), 3, 400, 400);

        const vert = await loadShader(matConfig.vertexShader);
        const frag = await loadShader(matConfig.fragmentShader);

        const uniforms = {
            resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
        };

        for (const [key, spec] of Object.entries(matConfig.uniforms)) {
            if (key === 'uColor') {
                // Fix: Use THREE.Color for color uniform so .set(hex) works in UI
                uniforms[key] = { value: new THREE.Color(...spec.value) };
            } else if (spec.type === 'vec3') {
                uniforms[key] = { value: new THREE.Vector3(...spec.value) };
            } else if (spec.type === 'float') {
                uniforms[key] = { value: spec.value };
            } else if (spec.type === 'sampler2D') {
                uniforms[key] = { value: null };
            }
        }

        const material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vert,
            fragmentShader: frag,
            transparent: true,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });

        const points = new THREE.Points(geometry, material);
        points.name = config.id;

        points.rotation.z = 0;
        points.rotation.y = Math.PI;

        this.scene.add(points);
        this.objects[config.id] = points;
    }

    setExternalTextures(videoElement) {
        this.videoTexture = new THREE.VideoTexture(videoElement);
        this.videoTexture.minFilter = THREE.LinearFilter;
        this.videoTexture.magFilter = THREE.LinearFilter;

        const size = 512;
        // Default white mask
        const data = new Float32Array(size * size).fill(1.0);

        this.maskTexture = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.FloatType);
        this.maskTexture.needsUpdate = true;

        for (const obj of Object.values(this.objects)) {
            const uniforms = obj.material.uniforms;
            if (uniforms.uTexture) uniforms.uTexture.value = this.videoTexture;
            if (uniforms.uMask) uniforms.uMask.value = this.maskTexture;
        }
    }

    updateMask(maskData, width, height) {
        if (!this.maskTexture) return;
        this.maskTexture.image.data = maskData;
        this.maskTexture.needsUpdate = true;
    }

    render(time) {
        this.controls.update();

        for (const obj of Object.values(this.objects)) {
            if (obj.material.uniforms.uTime) {
                obj.material.uniforms.uTime.value = time * 0.001;
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    getBinding(path) {
        const obj = Object.values(this.objects)[0];
        if (!obj) return null;

        if (path.includes("uColor")) return obj.material.uniforms.uColor;
        if (path.includes("uPointSize")) return obj.material.uniforms.uPointSize;
        if (path.includes("uDepthIntensity")) return obj.material.uniforms.uDepthIntensity;
        if (path.includes("uShowBackground")) return obj.material.uniforms.uShowBackground;

        return null;
    }
}
