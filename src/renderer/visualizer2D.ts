import * as THREE from 'three';
import { ParticleSystem } from '../simulation/particles';

export class Visualizer2D {
    private particleSystem: ParticleSystem;
    private particleGeometry: THREE.BufferGeometry;
    private particleMaterial: THREE.ShaderMaterial;
    private particlePoints: THREE.Points;
    private scene: THREE.Scene;
    private lastColorUpdateTime: number = 0;

    constructor(scene: THREE.Scene, particleSystem: ParticleSystem) {
        this.scene = scene;
        this.particleSystem = particleSystem;
        
        // Setup particle rendering with custom shaders for better visuals
        this.particleGeometry = new THREE.BufferGeometry();
        
        // Create a shader material for more flexible particle rendering
        const vertexShader = `
            attribute float size;
            attribute vec3 customColor;
            varying vec3 vColor;
            void main() {
                vColor = customColor;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;
        
        const fragmentShader = `
            varying vec3 vColor;
            void main() {
                // Create circular particles
                if (length(gl_PointCoord - vec2(0.5, 0.5)) > 0.5) discard;
                gl_FragColor = vec4(vColor, 1.0);
            }
        `;
        
        this.particleMaterial = new THREE.ShaderMaterial({
            uniforms: {},
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true,
            vertexColors: true
        });
        
        this.particlePoints = new THREE.Points(this.particleGeometry, this.particleMaterial);
        scene.add(this.particlePoints);

        // Position camera
        const camera = scene.parent?.children.find(child => child instanceof THREE.PerspectiveCamera) as THREE.PerspectiveCamera;
        if (camera) {
            camera.position.z = 2;
        }
    }

    update(audioIntensity: number = 0) {
        console.log('Visualizer2D updating with intensity:', audioIntensity);
        
        // Change background color based on audio intensity
        // Map intensity (0-255) to a color (blue to red)
        const r = Math.min(1, audioIntensity / 128);
        const b = Math.max(0, 1 - audioIntensity / 128);
        console.log('Color components:', {r, b});
        
        this.scene.background = new THREE.Color(r, 0, b);
        console.log('Background color updated to:', this.scene.background);
        
        // Update particles
        const particles = this.particleSystem.getParticles();
        console.log('Particle count:', particles.length);
        
        const positions = new Float32Array(particles.length * 3);
        const colors = new Float32Array(particles.length * 3);
        const sizes = new Float32Array(particles.length);
        
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            
            // Position (map from [0,1] to [-1,1])
            positions[i * 3] = p.x * 2 - 1;     
            positions[i * 3 + 1] = p.y * 2 - 1; 
            positions[i * 3 + 2] = 0;
            
            // Color (use particle's color property and audio intensity)
            // Make colors responsive to audio
            const particleHue = (p.color + audioIntensity / 255) % 1.0;
            const color = new THREE.Color().setHSL(particleHue, 1.0, 0.5);
            
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
            
            // Size (based on particle size property and lifetime)
            // Particles fade out as they die
            sizes[i] = p.size * (p.life / 3.0) * (1 + audioIntensity / 255);
        }

        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.particleGeometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
        this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        this.particleGeometry.attributes.position.needsUpdate = true;
        this.particleGeometry.attributes.customColor.needsUpdate = true;
        this.particleGeometry.attributes.size.needsUpdate = true;
    }
} 