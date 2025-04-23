export class CanvasLineVisualizer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private analyser: AnalyserNode;
    private dataArray: Uint8Array;
    private frequencyData: Uint8Array;
    private bufferLength: number;
    private splinePoints: { x: number, y: number }[] = [];
    private splineCoefficients: { a: number, b: number, c: number, d: number }[] = [];
    private lastTime: number = 0;
    private hueOffset: number = 0;

    constructor(canvasId: string, analyserNode: AnalyserNode) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.analyser = analyserNode;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        this.frequencyData = new Uint8Array(this.bufferLength);
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas.bind(this));
    }

    private resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    /**
     * Cubic spline interpolation
     * Computes natural cubic spline coefficients for a set of points
     */
    private computeSplineCoefficients(points: { x: number, y: number }[]) {
        const n = points.length - 1;
        if (n < 2) return []; // Need at least 3 points for cubic spline

        // Step 1: Calculate h values (differences between x coordinates)
        const h: number[] = [];
        for (let i = 0; i < n; i++) {
            h.push(points[i + 1].x - points[i].x);
        }

        // Step 2: Set up the tridiagonal system for computing second derivatives
        const alpha: number[] = new Array(n).fill(0);
        for (let i = 1; i < n; i++) {
            alpha[i] = (3 / h[i]) * (points[i + 1].y - points[i].y) - 
                       (3 / h[i - 1]) * (points[i].y - points[i - 1].y);
        }

        // Step 3: Solve the tridiagonal system using Thomas algorithm
        const l: number[] = new Array(n + 1).fill(0);
        const mu: number[] = new Array(n + 1).fill(0);
        const z: number[] = new Array(n + 1).fill(0);
        
        for (let i = 1; i < n; i++) {
            l[i] = 2 * (points[i + 1].x - points[i - 1].x) - h[i - 1] * mu[i - 1];
            mu[i] = h[i] / l[i];
            z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
        }

        // Step 4: Compute the second derivatives
        const c: number[] = new Array(n + 1).fill(0);
        for (let j = n - 1; j >= 0; j--) {
            c[j] = z[j] - mu[j] * c[j + 1];
        }

        // Step 5: Compute the coefficients for each segment
        const coefficients: { a: number, b: number, c: number, d: number }[] = [];
        for (let i = 0; i < n; i++) {
            const a = points[i].y;
            const b = (points[i + 1].y - points[i].y) / h[i] - h[i] * (c[i + 1] + 2 * c[i]) / 3;
            const d = (c[i + 1] - c[i]) / (3 * h[i]);
            
            coefficients.push({ a, b, c: c[i], d });
        }

        return coefficients;
    }

    /**
     * Evaluate the cubic spline at a specific x value
     */
    private evaluateSpline(x: number, points: { x: number, y: number }[], coeffs: { a: number, b: number, c: number, d: number }[]) {
        // Find the appropriate segment
        let i = 0;
        while (i < points.length - 1 && x > points[i + 1].x) {
            i++;
        }
        
        if (i >= coeffs.length) return points[points.length - 1].y;
        
        // Calculate the value using the cubic polynomial
        const dx = x - points[i].x;
        return coeffs[i].a + coeffs[i].b * dx + coeffs[i].c * dx * dx + coeffs[i].d * dx * dx * dx;
    }

    /**
     * Draws the waveform based on current audio data with cubic spline interpolation.
     */
    public animate() {
        const now = performance.now();
        const dt = now - this.lastTime;
        this.lastTime = now;
        
        // Update hue offset for color cycling
        this.hueOffset = (this.hueOffset + dt * 0.02) % 360;
        
        // Get time-domain and frequency data
        this.analyser.getByteTimeDomainData(this.dataArray);
        this.analyser.getByteFrequencyData(this.frequencyData);

        // Clear canvas with a dark background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Sample points for the spline (we don't need all data points)
        // Using fewer points makes the computation more efficient
        const sampleRate = Math.max(1, Math.floor(this.bufferLength / 100));
        this.splinePoints = [];
        
        for (let i = 0; i < this.bufferLength; i += sampleRate) {
            const x = (i / this.bufferLength) * this.canvas.width;
            const v = this.dataArray[i] / 128.0;
            const y = (v * this.canvas.height) / 2;
            this.splinePoints.push({ x, y });
        }
        
        // Add the last point if not included
        if ((this.bufferLength - 1) % sampleRate !== 0) {
            const i = this.bufferLength - 1;
            const x = (i / this.bufferLength) * this.canvas.width;
            const v = this.dataArray[i] / 128.0;
            const y = (v * this.canvas.height) / 2;
            this.splinePoints.push({ x, y });
        }
        
        // Compute spline coefficients
        this.splineCoefficients = this.computeSplineCoefficients(this.splinePoints);
        
        // Draw the spline with gradient colors based on frequency data
        this.ctx.lineWidth = 3;
        
        // Create a gradient based on frequency data
        const steps = 50;
        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            const startX = t * this.canvas.width;
            const endX = (i + 1) / (steps - 1) * this.canvas.width;
            
            // Get frequency data for this segment
            const freqIndex = Math.floor(t * (this.frequencyData.length - 1));
            const intensity = this.frequencyData[freqIndex] / 255;
            
            // Create a path for this segment
            this.ctx.beginPath();
            
            // Draw the segment with spline interpolation
            const segmentSteps = 10;
            for (let j = 0; j <= segmentSteps; j++) {
                const x = startX + (endX - startX) * (j / segmentSteps);
                const y = this.evaluateSpline(x, this.splinePoints, this.splineCoefficients);
                
                if (j === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            
            // Color based on frequency intensity and position
            const hue = (t * 360 + this.hueOffset) % 360;
            const saturation = 80 + intensity * 20;
            const lightness = 40 + intensity * 30;
            this.ctx.strokeStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            this.ctx.stroke();
        }
        
        // Draw frequency bars at the bottom
        const barWidth = this.canvas.width / 64;
        const barHeight = this.canvas.height / 4;
        
        for (let i = 0; i < 64; i++) {
            const freqIndex = Math.floor(i * (this.frequencyData.length / 64));
            const intensity = this.frequencyData[freqIndex] / 255;
            const height = intensity * barHeight;
            
            const hue = (i * 5 + this.hueOffset) % 360;
            this.ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${0.5 + intensity * 0.5})`;
            this.ctx.fillRect(
                i * barWidth, 
                this.canvas.height - height, 
                barWidth - 1, 
                height
            );
        }
    }
}
