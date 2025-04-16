import React from 'react';
import { createRoot } from 'react-dom/client';
import { AudioManager } from './audio/audioContext';
import { AudioAnalyser } from './audio/analyser';
import { CanvasParticleSystem } from './canvasParticleSystem';

class App {
    private audioManager: AudioManager;
    private analyser: AudioAnalyser;
    private particleSystem: CanvasParticleSystem;
    private animationFrameId: number | null = null;
    private isRunning: boolean = false;

    constructor() {
        this.audioManager = new AudioManager();
        this.analyser = new AudioAnalyser(this.audioManager.getContext());
        this.particleSystem = new CanvasParticleSystem('particleCanvas');

        // Start particle animation
        this.particleSystem.animate();

        this.setupEventListeners();
        this.initialize();
    }

    private setupEventListeners() {
        document.addEventListener('click', () => {
            if (this.audioManager.getContext().state === 'suspended') {
                this.audioManager.getContext().resume().then(() => {
                    console.log('AudioContext resumed from user interaction');
                });
            }
        });
    }

    private async initialize() {
        try {
            console.log('Starting initialization...');
            const source = await this.audioManager.initialize();
            this.analyser.connect(source);
            console.log('Audio setup complete, starting animation...');
            this.isRunning = true;
            this.animate();
        } catch (error) {
            console.error('Failed to initialize:', error);
        }
    }

    private animate = () => {
    if (!this.isRunning) return;

    const audioIntensity = this.analyser.getAudioIntensity();
    console.log('Audio intensity:', audioIntensity);

    // Base color: dark blue (rgb(0, 0, 50))
    const baseR = 0; // Red component stays constant
    const baseG = 0; // Green component stays constant
    const baseB = 50; // Blue component starts at 50

    // Adjust the blue component based on audio intensity
    const intensityFactor = audioIntensity / 255; // Normalize intensity to [0, 1]
    const bgR = Math.min(50, baseR + intensityFactor * 50); // Red increases slightly
    const bgG = Math.min(50, baseG + intensityFactor * 50); // Green increases slightly
    const bgB = Math.min(255, baseB + intensityFactor * 200); // Blue becomes brighter

    const backgroundColor = `rgb(${Math.floor(bgR)}, ${Math.floor(bgG)}, ${Math.floor(bgB)})`;

    // Update the particle system's background color
    this.particleSystem.setBackgroundColor(backgroundColor);

    // Continue animation
    this.animationFrameId = requestAnimationFrame(this.animate);
};
}

// Start the application
const appInstance = new App();