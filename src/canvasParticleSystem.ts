/**
 * A particle system that visualizes audio frequency data using physics-based simulation.
 * This class implements several numerical methods including:
 * - Explicit Euler integration (first-order) for position and velocity updates
 * - Inverse square law for force calculations (similar to gravitational fields)
 * - Velocity damping using exponential decay
 * - Boundary collision handling with coefficient of restitution
 * - Linear interpolation for visual effects
 * 
 * Note: Explicit Euler is a simple first-order method that approximates the solution
 * to differential equations. More accurate alternatives would include RK4 (4th-order 
 * Runge-Kutta) or Velocity Verlet integration.
 */
export class CanvasParticleSystem {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private dots: { 
        x: number; 
        y: number; 
        vx: number; 
        vy: number;
        mass: number;  
    }[] = [];
    private DOT_COUNT = 50;
    private RADIUS = 2;
    private DIST_THRESH_MAX = 90;
    private backgroundColor: string = '#000000';
    private audioAnalyser: any;  
    private frequencyBands: { centerFreq: number, intensity: number }[] = [];
    private readonly FORCE_CONSTANT = 10.0;  // Significantly increased for stronger gravitational pull
    private readonly INWARD_PULL = 0.5;  // Gentle force pulling particles back when they stray too far
    private readonly NUM_FREQUENCY_BANDS = 8;
    private readonly DAMPING = 0.99;  // Reduced damping to maintain more energy
    private readonly EDGE_BOUNCE = 0.8;  // Bounce factor when hitting edges
    /** Whether to draw connections between particles */
    private showConnections: boolean = true;

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        this.initializeFrequencyBands();
        this.initializeDots();
    }

    public connectAudioAnalyser(analyser: any) {
        this.audioAnalyser = analyser;
    }

    /**
     * Initializes frequency bands with logarithmically spaced center frequencies.
     * This creates a more perceptually balanced distribution of frequency bands.
     */
    private initializeFrequencyBands() {
        const minFreq = 20;  
        const maxFreq = 2000;  
        for (let i = 0; i < this.NUM_FREQUENCY_BANDS; i++) {
            // Logarithmic spacing of frequencies to match human perception
            const centerFreq = minFreq * Math.pow(maxFreq/minFreq, i/(this.NUM_FREQUENCY_BANDS-1));
            this.frequencyBands.push({ centerFreq, intensity: 0 });
        }
    }

    /**
     * Initializes particles with random positions and velocities.
     */
    private initializeDots() {
        for (let i = 0; i < this.DOT_COUNT; i++) {
            this.dots.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 5,  
                vy: (Math.random() - 0.5) * 5,  
                mass: 0.1 + Math.random() * 0.9  // Random mass affects how particles respond to forces
            });
        }
    }

    private resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    /**
     * Calculates Euclidean distance between two dots.
     * Numerical method: Vector distance calculation
     */
    private distance(dot1: any, dot2: any) {
        const dx = dot1.x - dot2.x;
        const dy = dot1.y - dot2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculates the area of a triangle formed by three dots.
     * Uses the cross product method for area calculation.
     * Numerical method: Geometric calculation using determinants
     */
    private triangleArea(dot1: any, dot2: any, dot3: any) {
        return Math.abs(dot1.x * (dot2.y - dot3.y) + dot2.x * (dot3.y - dot1.y) + dot3.x * (dot1.y - dot2.y)) / 2;
    }

    private drawDots() {
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (const dot of this.dots) {
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.beginPath();
            this.ctx.arc(dot.x, dot.y, this.RADIUS, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    private drawConnections() {
        for (let i = 0; i < this.dots.length; i++) {
            for (let j = i + 1; j < this.dots.length; j++) {
                const dist1 = this.distance(this.dots[i], this.dots[j]);
                if (dist1 < this.DIST_THRESH_MAX) {
                    for (let k = j + 1; k < this.dots.length; k++) {
                        const dist2 = this.distance(this.dots[j], this.dots[k]);
                        const dist3 = this.distance(this.dots[k], this.dots[i]);
                        if (dist2 < this.DIST_THRESH_MAX && dist3 < this.DIST_THRESH_MAX) {
                            const area = this.triangleArea(this.dots[i], this.dots[j], this.dots[k]);
                            const maxArea = (this.DIST_THRESH_MAX * this.DIST_THRESH_MAX) / 4;
                            // Numerical method: Linear interpolation for opacity
                            const opacity = (1 - (area / maxArea)) * 0.02;

                            this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                            this.ctx.beginPath();
                            this.ctx.moveTo(this.dots[i].x, this.dots[i].y);
                            this.ctx.lineTo(this.dots[j].x, this.dots[j].y);
                            this.ctx.lineTo(this.dots[k].x, this.dots[k].y);
                            this.ctx.closePath();
                            this.ctx.fill();
                        }
                    }

                    // Numerical method: Linear interpolation for line opacity
                    this.ctx.strokeStyle = `rgba(255, 255, 255, ${1 - dist1 / this.DIST_THRESH_MAX})`;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.dots[i].x, this.dots[i].y);
                    this.ctx.lineTo(this.dots[j].x, this.dots[j].y);
                    this.ctx.stroke();
                }
            }
        }
    }

    /**
     * Updates frequency band intensities from audio analyzer data.
     * Numerical method: Frequency domain sampling and normalization
     */
    private updateFFTForces() {
        if (!this.audioAnalyser) return;

        const freqData = new Uint8Array(this.audioAnalyser.analyser.frequencyBinCount);
        this.audioAnalyser.analyser.getByteFrequencyData(freqData);

        this.frequencyBands.forEach((band, i) => {
            // Map frequency to FFT bin index using linear interpolation
            const binIndex = Math.floor((band.centerFreq / (this.audioAnalyser.analyser.context.sampleRate/2)) * freqData.length);
            // Normalize intensity to 0-1 range
            band.intensity = freqData[binIndex] / 255.0;  
        });
    }

    /**
     * Applies forces to a particle based on frequency band intensities.
     * Implements several numerical methods:
     * - Inverse square law for force calculation (similar to gravity/electrostatic forces)
     * - Vector force accumulation
     * - Acceleration calculation using F = ma
     * - Explicit Euler method for velocity integration (first-order)
     * - Velocity damping and limiting
     */
    private applyFFTForces(dot: { x: number; y: number; vx: number; vy: number; mass: number }) {
        let totalFx = 0;
        let totalFy = 0;

        // Apply force field forces
        for (let i = 0; i < this.frequencyBands.length; i++) {
            const band = this.frequencyBands[i];
            const angle = (2 * Math.PI * i) / this.NUM_FREQUENCY_BANDS;
            const radius = Math.min(this.canvas.width, this.canvas.height) * 0.25;  // Using 25% of screen size
            const centerX = this.canvas.width/2 + radius * Math.cos(angle);
            const centerY = this.canvas.height/2 + radius * Math.sin(angle);

            const dx = centerX - dot.x;
            const dy = centerY - dot.y;
            const distanceSquared = dx * dx + dy * dy;
            const distance = Math.sqrt(distanceSquared);

            // Skip if we're too close to avoid extreme forces
            if (distance < 1) continue;

            // Numerical method: Inverse square law for force calculation
            // Similar to gravitational or electrostatic forces
            const forceMag = this.FORCE_CONSTANT * band.intensity / (distanceSquared);

            // Normalize direction vectors
            const dirX = dx / distance;
            const dirY = dy / distance;

            // Numerical method: Vector force accumulation
            totalFx += dirX * forceMag;
            totalFy += dirY * forceMag;
        }

        // Numerical method: Acceleration calculation using Newton's Second Law (F = ma)
        const ax = totalFx / dot.mass;
        const ay = totalFy / dot.mass;
        
        // Numerical method: Explicit Euler integration for velocity update (first-order)
        // v(t+dt) = v(t) + a(t)*dt  (with dt = 1 frame)
        dot.vx += ax;
        dot.vy += ay;

        // Numerical method: Exponential damping to simulate energy loss
        dot.vx *= this.DAMPING;
        dot.vy *= this.DAMPING;

        // Numerical method: Velocity limiting to prevent numerical instability
        const speedSquared = dot.vx * dot.vx + dot.vy * dot.vy;
        const maxSpeed = 10;
        if (speedSquared > maxSpeed * maxSpeed) {
            const scale = maxSpeed / Math.sqrt(speedSquared);
            dot.vx *= scale;
            dot.vy *= scale;
        }
    }

    /**
     * Updates particle positions and velocities based on forces.
     * This is the main physics simulation loop implementing several numerical methods:
     * - Force application
     * - Explicit Euler integration for position updates (first-order)
     * - Boundary collision detection and response
     */
    private updateDots() {
        this.updateFFTForces();

        for (const dot of this.dots) {
            this.applyFFTForces(dot);

            // Add gentle inward pull when particles stray too far
            // Numerical method: Distance-based force calculation
            const dx = this.canvas.width/2 - dot.x;
            const dy = this.canvas.height/2 - dot.y;
            const distFromCenter = Math.sqrt(dx * dx + dy * dy);
            const maxDist = Math.min(this.canvas.width, this.canvas.height) * 0.4;  // Start pulling back at 40% of screen size
            
            if (distFromCenter > maxDist) {
                // Numerical method: Linear force scaling based on distance
                const pullFactor = (distFromCenter - maxDist) * this.INWARD_PULL / distFromCenter;
                dot.vx += dx * pullFactor;
                dot.vy += dy * pullFactor;
            }

            // Numerical method: Explicit Euler integration for position update (first-order)
            // x(t+dt) = x(t) + v(t)*dt  (with dt = 1 frame)
            // This is a first-order approximation of the solution to the differential equation of motion
            // More accurate methods would include RK4 (4th-order Runge-Kutta) or Velocity Verlet
            dot.x += dot.vx;
            dot.y += dot.vy;

            // Numerical method: Boundary collision detection and response
            // Implements coefficient of restitution (EDGE_BOUNCE) for energy loss during collision
            if (dot.x < 0) {
                dot.x = 0;
                dot.vx = Math.abs(dot.vx) * this.EDGE_BOUNCE;
            } else if (dot.x > this.canvas.width) {
                dot.x = this.canvas.width;
                dot.vx = -Math.abs(dot.vx) * this.EDGE_BOUNCE;
            }

            if (dot.y < 0) {
                dot.y = 0;
                dot.vy = Math.abs(dot.vy) * this.EDGE_BOUNCE;
            } else if (dot.y > this.canvas.height) {
                dot.y = this.canvas.height;
                dot.vy = -Math.abs(dot.vy) * this.EDGE_BOUNCE;
            }
        }
    }

    public setBackgroundColor(color: string) {
        this.backgroundColor = color;
    }

    /**
     * Visualizes the force fields created by frequency bands.
     * Uses radial gradients to represent force intensity.
     */
    private drawForceFields() {
        if (!this.audioAnalyser) return;

        this.frequencyBands.forEach((band, i) => {
            const angle = (2 * Math.PI * i) / this.NUM_FREQUENCY_BANDS;
            const radius = Math.min(this.canvas.width, this.canvas.height) * 0.25;  // Using 25% of screen size
            const centerX = this.canvas.width/2 + radius * Math.cos(angle);
            const centerY = this.canvas.height/2 + radius * Math.sin(angle);

            // Create a radial gradient
            const gradient = this.ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, radius * band.intensity
            );

            // Color based on frequency (low=red, mid=green, high=blue)
            // Numerical method: Linear mapping from frequency index to color hue
            const hue = (i / this.NUM_FREQUENCY_BANDS) * 360;
            gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, ${band.intensity * 0.5})`);
            gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);

            // Draw the force field
            this.ctx.beginPath();
            this.ctx.fillStyle = gradient;
            this.ctx.arc(centerX, centerY, radius * band.intensity, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw center point
            this.ctx.beginPath();
            this.ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${band.intensity})`;
            this.ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    /**
     * Set the number of particles and reinitialize the dots array.
     */
    public setDotCount(count: number) {
        this.DOT_COUNT = count;
        this.dots = [];
        this.initializeDots();
    }

    /**
     * Get the current number of particles.
     */
    public getDotCount(): number {
        return this.DOT_COUNT;
    }

    /**
     * Set whether to draw connections between particles.
     */
    public setShowConnections(show: boolean) {
        this.showConnections = show;
    }

    /**
     * Get whether connections are being drawn.
     */
    public getShowConnections(): boolean {
        return this.showConnections;
    }

    /**
     * Main animation loop that updates and renders the particle system.
     * This method should be called repeatedly, typically via requestAnimationFrame.
     */
    public animate() {
        this.updateDots();
        this.drawDots();
        this.drawForceFields(); // Draw force fields before connections for better layering
        if (this.showConnections) {
            this.drawConnections();
        }
    }
}