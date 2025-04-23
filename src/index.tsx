import React from 'react';
import { createRoot } from 'react-dom/client';
import { AudioManager } from './audio/audioContext';
import { AudioAnalyser } from './audio/analyser';
import { CanvasParticleSystem } from './canvasParticleSystem';
import { CanvasLineVisualizer } from './canvasLineVisualizer';

class App {
    private audioManager: AudioManager;
    private analyser: AudioAnalyser;
    private particleSystem: CanvasParticleSystem;
    private lineVisualizer: CanvasLineVisualizer;
    private currentMode: 'particles' | 'waveform' = 'particles';
    private animationFrameId: number | null = null;
    private isRunning: boolean = false;

    constructor() {
        this.audioManager = new AudioManager();
        this.analyser = new AudioAnalyser(this.audioManager.getContext());
        this.particleSystem = new CanvasParticleSystem('particleCanvas');
        this.lineVisualizer = new CanvasLineVisualizer('lineCanvas', this.analyser.getAnalyserNode());
        
        // Initialize particle system

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

    private setupTestModeButton() {
        const controlsDiv = document.getElementById('controls');
        if (!controlsDiv) return;
        
        const testModeButton = document.createElement('button');
        testModeButton.textContent = 'Toggle Test Mode';
        testModeButton.style.padding = '10px';
        testModeButton.style.margin = '10px';
        testModeButton.style.backgroundColor = '#00aaff';
        testModeButton.style.color = 'white';
        testModeButton.style.border = 'none';
        testModeButton.style.borderRadius = '5px';
        testModeButton.style.cursor = 'pointer';
        
        let testModeEnabled = false;
        
        testModeButton.addEventListener('click', () => {
            testModeEnabled = !testModeEnabled;
            if (testModeEnabled) {
                this.analyser.enableTestMode(this.audioManager.getContext());
                testModeButton.textContent = 'Disable Test Mode';
            } else {
                this.analyser.disableTestMode();
                testModeButton.textContent = 'Enable Test Mode';
            }
        });
        
        controlsDiv.appendChild(testModeButton);
    }

    /**
     * Setup slider control for adjusting particle count.
     */
    private setupParticleCountControl() {
        const controlsDiv = document.getElementById('controls');
        if (!controlsDiv) return;

        const group = document.createElement('div');
        group.className = 'control-group';

        const label = document.createElement('label');
        label.textContent = 'Particle Count:';
        group.appendChild(label);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '10';
        slider.max = '200';
        slider.step = '1';
        slider.value = this.particleSystem.getDotCount().toString();
        group.appendChild(slider);

        const valueDisplay = document.createElement('span');
        valueDisplay.textContent = slider.value;
        valueDisplay.style.marginLeft = '8px';
        group.appendChild(valueDisplay);

        slider.addEventListener('input', () => {
            const count = parseInt(slider.value, 10);
            valueDisplay.textContent = slider.value;
            this.particleSystem.setDotCount(count);
        });

        controlsDiv.appendChild(group);
    }

    /**
     * Setup toggle control for drawing connections between particles.
     */
    private setupShowConnectionsControl() {
        const controlsDiv = document.getElementById('controls');
        if (!controlsDiv) return;

        const group = document.createElement('div');
        group.className = 'control-group';

        const label = document.createElement('label');
        label.textContent = 'Show Connections';
        group.appendChild(label);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = this.particleSystem.getShowConnections();
        group.appendChild(checkbox);

        checkbox.addEventListener('change', () => {
            this.particleSystem.setShowConnections(checkbox.checked);
        });

        controlsDiv.appendChild(group);
    }

    /**
     * Setup a gear icon button to toggle the visibility of the controls panel.
     */
    private setupControlsToggle() {
        const appDiv = document.getElementById('app');
        const controlsDiv = document.getElementById('controls');
        if (!appDiv || !controlsDiv) return;

        // Hide controls initially
        controlsDiv.style.display = 'none';

        // Create toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'controls-toggle';
        toggleBtn.textContent = '⚙️';
        Object.assign(toggleBtn.style, {
            position: 'absolute', top: '20px', right: '20px', zIndex: '11',
            background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none',
            borderRadius: '5px', padding: '8px', cursor: 'pointer', fontSize: '16px'
        });
        toggleBtn.addEventListener('click', () => {
            controlsDiv.style.display = controlsDiv.style.display === 'none' ? 'block' : 'none';
        });

        appDiv.appendChild(toggleBtn);
    }

    /**
     * Setup select control to choose visualization mode.
     */
    private setupVisualizationModeControl() {
        const controlsDiv = document.getElementById('controls');
        if (!controlsDiv) return;
        const group = document.createElement('div');
        group.className = 'control-group';
        const label = document.createElement('label');
        label.textContent = 'Visualization Mode:';
        group.appendChild(label);
        const select = document.createElement('select');
        ['particles','waveform'].forEach(mode => {
            const opt = document.createElement('option');
            opt.value = mode;
            opt.text = mode.charAt(0).toUpperCase()+mode.slice(1);
            select.appendChild(opt);
        });
        select.value = this.currentMode;
        select.addEventListener('change', () => {
            this.currentMode = select.value as any;
            document.getElementById('particleCanvas')!.style.display = this.currentMode==='particles'?'':'none';
            document.getElementById('lineCanvas')!.style.display = this.currentMode==='waveform'?'':'none';
        });
        group.appendChild(select);
        controlsDiv.appendChild(group);
    }

    private async initialize() {
        // Init controls toggle before adding control elements
        this.setupControlsToggle();
        try {
            console.log('Starting initialization...');
            const source = await this.audioManager.initialize();
            this.analyser.connect(source);
            // Connect the analyser to the particle system
            this.particleSystem.connectAudioAnalyser(this.analyser);
            
            // Add UI controls
            this.setupTestModeButton();
            this.setupParticleCountControl();
            this.setupShowConnectionsControl();
            this.setupVisualizationModeControl();
            
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

        if (this.currentMode === 'particles') {
            this.particleSystem.setBackgroundColor(backgroundColor);
            this.particleSystem.animate();
        } else {
            this.lineVisualizer.animate();
        }

        // Continue animation
        this.animationFrameId = requestAnimationFrame(this.animate);
    };
}

// Start the application
const appInstance = new App();