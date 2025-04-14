import * as THREE from 'three';
import { ParticleSystem } from '../simulation/particles';

export class Visualizer2D {
    private particleSystem: ParticleSystem;
    private particleGeometry: THREE.BufferGeometry;
    private particleMaterial: THREE.PointsMaterial;
    private particlePoints: THREE.Points;

    constructor(scene: THREE.Scene, particleSystem: ParticleSystem) {
        this.particleSystem = particleSystem;
        
        // Setup particle rendering
        this.particleGeometry = new THREE.BufferGeometry();
        this.particleMaterial = new THREE.PointsMaterial({
            size: 0.1,
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        this.particlePoints = new THREE.Points(this.particleGeometry, this.particleMaterial);
        scene.add(this.particlePoints);

        // Position camera
        const camera = scene.parent?.children.find(child => child instanceof THREE.PerspectiveCamera) as THREE.PerspectiveCamera;
        if (camera) {
            camera.position.z = 2;
        }
    }

    update() {
        const particles = this.particleSystem.getParticles();
        const positions = new Float32Array(particles.length * 3);
        
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            positions[i * 3] = p.x * 2 - 1;     // Scale to [-1, 1] range
            positions[i * 3 + 1] = p.y * 2 - 1; // Scale to [-1, 1] range
            positions[i * 3 + 2] = 0;
        }

        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.particleGeometry.attributes.position.needsUpdate = true;
    }
} 