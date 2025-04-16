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
    private isRunning: boolean = false;

    constructor() {
        this.audioManager = new AudioManager();
        this.analyser = new AudioAnalyser(this.audioManager.getContext());
        this.particles = new ParticleSystem(100); // Increased particle count
        this.renderer = new ThreeRenderer(document.getElementById('app')!);
        this.visualizer = new Visualizer2D(this.renderer.getScene(), this.particles);
        
        this.setupEventListeners();
        this.initialize();
    }

    private setupEventListeners() {
        // Add an event to resume audio context on user interaction
        document.addEventListener('click', () => {
            if (this.audioManager.getContext().state === 'suspended') {
                this.audioManager.getContext().resume().then(() => {
                    console.log('AudioContext resumed from user interaction');
                });
            }
        });

        // Listen for audio source created events
        document.addEventListener('audioSourceCreated', ((e: CustomEvent) => {
            console.log('Received audio source created event');
            if (e.detail && e.detail.source) {
                this.analyser.connect(e.detail.source);
                console.log('Reconnected analyser to new audio source');
            }
        }) as EventListener);

        // Add test button and instructions
        const controlsDiv = document.getElementById('controls');
        if (controlsDiv) {
            // Add instructions
            const instructions = document.createElement('div');
            instructions.innerHTML = `
                <div style="margin-bottom: 15px; color: white; text-align: center; padding: 10px; background: rgba(0,0,0,0.5); border-radius: 5px;">
                    <h3>Audio Visualizer</h3>
                    <p>Click anywhere or press any key to activate audio.</p>
                    <p>If no sound is detected, use the button below.</p>
                </div>
            `;
            controlsDiv.appendChild(instructions);
            
            // Add test button
            const testButton = document.createElement('button');
            testButton.innerText = 'Generate Test Sound';
            testButton.style.padding = '8px';
            testButton.style.marginTop = '10px';
            testButton.style.width = '100%';
            testButton.addEventListener('click', this.generateTestSound.bind(this));
            controlsDiv.appendChild(testButton);
        }
    }

    private generateTestSound() {
        const ctx = this.audioManager.getContext();
        // Create an oscillator for testing
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4 note
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        // Also connect to the analyzer
        gainNode.connect(this.analyser.getAnalyserNode());
        
        oscillator.start();
        oscillator.stop(ctx.currentTime + 1); // Play for 1 second
        
        console.log('Test sound generated');
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
        
        if (this.analyser.isSoundDetected()) {
            console.log('Sound detected! Intensity:', audioIntensity);
            // Emit multiple particles in random positions for better effect
            for (let i = 0; i < 5; i++) {
                const x = Math.random();
                const y = Math.random();
                const vx = (Math.random() - 0.5) * 0.01;
                const vy = (Math.random() - 0.5) * 0.01;
                this.particles.emit(x, y, vx, vy);
            }
        }
        
        // Update and render
        this.particles.update(1/60);
        this.visualizer.update(audioIntensity);
        this.renderer.render();
        
        this.animationFrameId = requestAnimationFrame(this.animate);
    }
}

// Start the application
const appInstance = new App(); 