import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class Three3DVisualizer {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private analyser: AnalyserNode;
    private frequencyData: Uint8Array;
    private timeData: Uint8Array;
    private bufferLength: number;
    private lastTime: number = 0;
    private hueOffset: number = 0;
    
    // 3D objects
    private frequencyBars: THREE.Mesh[] = [];
    private waveformCurve: THREE.Line | null = null;
    private waveformPoints: THREE.Vector3[] = [];
    private terrain: THREE.Mesh | null = null;
    private terrainSize = 64;
    private terrainHistory: number[][] = [];
    private historyLength = 32;
    
    constructor(canvasId: string, analyserNode: AnalyserNode) {
        // Initialize Three.js scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000011);
        this.scene.fog = new THREE.FogExp2(0x000011, 0.0025);
        
        // Initialize camera
        this.camera = new THREE.PerspectiveCamera(
            75, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        this.camera.position.set(0, 30, 50);
        this.camera.lookAt(0, 0, 0);
        
        // Initialize renderer
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.renderer = new THREE.WebGLRenderer({ 
            canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // Add orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2;
        
        // Set up audio analyzer
        this.analyser = analyserNode;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.frequencyData = new Uint8Array(this.bufferLength);
        this.timeData = new Uint8Array(this.bufferLength);
        
        // Initialize terrain history
        for (let i = 0; i < this.historyLength; i++) {
            this.terrainHistory.push(new Array(this.terrainSize).fill(0));
        }
        
        // Add lights
        this.addLights();
        
        // Create 3D objects
        this.createFrequencyBars();
        this.createWaveform();
        this.createTerrain();
        
        // Add grid for reference
        const grid = new THREE.GridHelper(100, 20, 0x444444, 0x222222);
        this.scene.add(grid);
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }
    
    private addLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x222222);
        this.scene.add(ambientLight);
        
        // Directional light (sun-like)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
        
        // Add point lights that will react to audio
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
        for (let i = 0; i < 4; i++) {
            const light = new THREE.PointLight(colors[i], 1, 50);
            const angle = (i / 4) * Math.PI * 2;
            light.position.set(
                Math.cos(angle) * 30,
                10,
                Math.sin(angle) * 30
            );
            this.scene.add(light);
        }
    }
    
    private createFrequencyBars() {
        // We'll use fewer bars for better performance
        const barCount = 64;
        const barWidth = 0.5;
        const barSpacing = 0.2;
        const totalWidth = barCount * (barWidth + barSpacing);
        
        for (let i = 0; i < barCount; i++) {
            const geometry = new THREE.BoxGeometry(barWidth, 1, barWidth);
            
            // Create a material with a unique color based on position
            const hue = (i / barCount) * 360;
            const material = new THREE.MeshPhongMaterial({
                color: new THREE.Color(`hsl(${hue}, 100%, 50%)`),
                shininess: 100,
                emissive: new THREE.Color(`hsl(${hue}, 100%, 20%)`)
            });
            
            const bar = new THREE.Mesh(geometry, material);
            
            // Position bars in a circle
            const angle = (i / barCount) * Math.PI * 2;
            const radius = 20;
            bar.position.x = Math.cos(angle) * radius;
            bar.position.z = Math.sin(angle) * radius;
            
            this.scene.add(bar);
            this.frequencyBars.push(bar);
        }
    }
    
    private createWaveform() {
        // Create a line geometry for the waveform
        const waveformGeometry = new THREE.BufferGeometry();
        
        // Create points for the waveform
        this.waveformPoints = [];
        const segments = 128; // Use fewer points for better performance
        
        for (let i = 0; i < segments; i++) {
            this.waveformPoints.push(new THREE.Vector3(
                ((i / segments) - 0.5) * 40, // x position
                0, // y position (will be updated)
                0  // z position
            ));
        }
        
        waveformGeometry.setFromPoints(this.waveformPoints);
        
        // Create a line material
        const material = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            linewidth: 2
        });
        
        // Create the line
        this.waveformCurve = new THREE.Line(waveformGeometry, material);
        this.scene.add(this.waveformCurve);
    }
    
    private createTerrain() {
        // Create a plane geometry for the terrain
        const geometry = new THREE.PlaneGeometry(
            40, 40,
            this.terrainSize - 1, this.historyLength - 1
        );
        
        // Rotate to be horizontal
        geometry.rotateX(-Math.PI / 2);
        
        // Create a material with wireframe
        const material = new THREE.MeshPhongMaterial({
            color: 0x0088ff,
            wireframe: true,
            shininess: 100,
            side: THREE.DoubleSide
        });
        
        // Create the mesh
        this.terrain = new THREE.Mesh(geometry, material);
        this.terrain.position.set(0, -10, 0);
        this.scene.add(this.terrain);
    }
    
    private updateTerrain() {
        if (!this.terrain) return;
        
        // Shift history forward
        this.terrainHistory.pop();
        
        // Add new data at the front
        const newRow: number[] = [];
        for (let i = 0; i < this.terrainSize; i++) {
            const dataIndex = Math.floor((i / this.terrainSize) * this.bufferLength);
            newRow.push(this.frequencyData[dataIndex] / 255);
        }
        this.terrainHistory.unshift(newRow);
        
        // Update the terrain geometry
        const geometry = this.terrain.geometry as THREE.PlaneGeometry;
        const positionAttribute = geometry.getAttribute('position');
        
        for (let z = 0; z < this.historyLength; z++) {
            for (let x = 0; x < this.terrainSize; x++) {
                const index = z * this.terrainSize + x;
                const height = this.terrainHistory[z][x] * 10; // Scale height
                positionAttribute.setY(index, height);
            }
        }
        
        positionAttribute.needsUpdate = true;
        geometry.computeVertexNormals();
    }
    
    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    public animate() {
        const now = performance.now();
        const dt = now - this.lastTime;
        this.lastTime = now;
        
        // Update hue offset for color cycling
        this.hueOffset = (this.hueOffset + dt * 0.01) % 360;
        
        // Get audio data
        this.analyser.getByteFrequencyData(this.frequencyData);
        this.analyser.getByteTimeDomainData(this.timeData);
        
        // Calculate overall intensity for effects
        let totalIntensity = 0;
        for (let i = 0; i < this.bufferLength; i++) {
            totalIntensity += this.frequencyData[i];
        }
        const avgIntensity = totalIntensity / this.bufferLength / 255;
        
        // Update frequency bars
        const barCount = this.frequencyBars.length;
        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor((i / barCount) * this.bufferLength);
            const value = this.frequencyData[dataIndex] / 255;
            
            // Update height
            const height = value * 20 + 0.1; // Add small offset to always show bars
            this.frequencyBars[i].scale.y = height;
            this.frequencyBars[i].position.y = height / 2;
            
            // Update color based on intensity and position
            const hue = (i / barCount * 360 + this.hueOffset) % 360;
            const material = this.frequencyBars[i].material as THREE.MeshPhongMaterial;
            material.color.set(new THREE.Color(`hsl(${hue}, 100%, ${50 + value * 50}%)`));
            material.emissive.set(new THREE.Color(`hsl(${hue}, 100%, ${value * 30}%)`));
        }
        
        // Update waveform
        if (this.waveformCurve) {
            const positions = this.waveformCurve.geometry.getAttribute('position');
            const segmentCount = positions.count;
            
            for (let i = 0; i < segmentCount; i++) {
                const dataIndex = Math.floor((i / segmentCount) * this.bufferLength);
                const value = (this.timeData[dataIndex] / 128.0 - 1) * 10; // Scale for visibility
                
                positions.setY(i, value);
            }
            
            positions.needsUpdate = true;
            
            // Rotate waveform for effect
            this.waveformCurve.rotation.y += 0.005;
        }
        
        // Update terrain
        this.updateTerrain();
        
        // Update camera for subtle movement based on audio
        this.camera.position.y = 30 + avgIntensity * 5;
        
        // Update controls
        this.controls.update();
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}
