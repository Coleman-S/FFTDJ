import React from 'react';
import { createRoot } from 'react-dom/client';
import { AudioManager } from './audio/audioContext';
import { AudioAnalyser } from './audio/analyser';
import { ParticleSystem } from './simulation/particles';
import { ThreeRenderer } from './renderer/threeSetup';
import { Visualizer2D } from './renderer/visualizer2D';

class App {
    private audioManager: AudioManager;
    private analyser: AudioAnalyser;
    private particles: ParticleSystem;
    private renderer: ThreeRenderer;
    private visualizer: Visualizer2D;
    private animationFrameId: number | null = null;

    constructor() {
        this.audioManager = new AudioManager();
        this.analyser = new AudioAnalyser(this.audioManager.getContext());
        this.particles = new ParticleSystem(1); // Just one particle
        this.renderer = new ThreeRenderer(document.getElementById('app')!);
        this.visualizer = new Visualizer2D(this.renderer.getScene(), this.particles);
        
        this.initialize();
    }

    private async initialize() {
        try {
            console.log('Starting initialization...');
            const source = await this.audioManager.initialize();
            this.analyser.connect(source);
            console.log('Audio setup complete, starting animation...');
            this.animate();
        } catch (error) {
            console.error('Failed to initialize:', error);
        }
    }

    private animate = () => {
        const audioIntensity = this.analyser.getAudioIntensity();
        console.log('Audio intensity:', audioIntensity);
        
        if (this.analyser.isSoundDetected()) {
            console.log('Sound detected! Intensity:', audioIntensity);
            // Emit a single particle in the center
            this.particles.emit(0.5, 0.5, 0, 0);
        }
        
        // Update and render
        this.particles.update(1/60);
        this.visualizer.update(audioIntensity);
        this.renderer.render();
        
        this.animationFrameId = requestAnimationFrame(this.animate);
    }
}

// Start the application
new App(); 