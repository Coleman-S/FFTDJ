export class Fluid2D {
    private width: number;
    private height: number;
    private density: Float32Array;
    private velocityX: Float32Array;
    private velocityY: Float32Array;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        const size = width * height;
        this.density = new Float32Array(size);
        this.velocityX = new Float32Array(size);
        this.velocityY = new Float32Array(size);
    }

    update(dt: number) {
        // Basic diffusion step
        this.diffuse(dt);
        // Project step to maintain incompressibility
        this.project();
        // Advection step
        this.advect(dt);
    }

    private diffuse(dt: number) {
        // Simple diffusion implementation
        const diff = 0.1; // Diffusion rate
        const a = dt * diff;
        
        for (let i = 0; i < this.width * this.height; i++) {
            const x = i % this.width;
            const y = Math.floor(i / this.width);
            
            if (x > 0 && x < this.width - 1 && y > 0 && y < this.height - 1) {
                const left = this.density[i - 1];
                const right = this.density[i + 1];
                const top = this.density[i - this.width];
                const bottom = this.density[i + this.width];
                
                this.density[i] += a * (left + right + top + bottom - 4 * this.density[i]);
            }
        }
    }

    private project() {
        // Simplified projection step
        // This would normally make the fluid incompressible
        // For visualization purposes, we'll skip the complex math for now
    }

    private advect(dt: number) {
        // Simple advection implementation
        const temp = new Float32Array(this.density);
        
        for (let i = 0; i < this.width * this.height; i++) {
            const x = i % this.width;
            const y = Math.floor(i / this.width);
            
            if (x > 0 && x < this.width - 1 && y > 0 && y < this.height - 1) {
                const vx = this.velocityX[i];
                const vy = this.velocityY[i];
                
                const newX = x - vx * dt;
                const newY = y - vy * dt;
                
                // Simple bilinear interpolation
                const x0 = Math.floor(newX);
                const y0 = Math.floor(newY);
                const x1 = x0 + 1;
                const y1 = y0 + 1;
                
                const s1 = newX - x0;
                const s0 = 1 - s1;
                const t1 = newY - y0;
                const t0 = 1 - t1;
                
                const idx00 = y0 * this.width + x0;
                const idx10 = y0 * this.width + x1;
                const idx01 = y1 * this.width + x0;
                const idx11 = y1 * this.width + x1;
                
                temp[i] = s0 * (t0 * this.density[idx00] + t1 * this.density[idx01]) +
                         s1 * (t0 * this.density[idx10] + t1 * this.density[idx11]);
            }
        }
        
        this.density.set(temp);
    }

    addForce(x: number, y: number, fx: number, fy: number) {
        const index = Math.floor(y) * this.width + Math.floor(x);
        if (index >= 0 && index < this.density.length) {
            this.velocityX[index] += fx;
            this.velocityY[index] += fy;
            this.density[index] += 0.5; // Add some density where force is applied
        }
    }

    getDensity(): Float32Array {
        return this.density;
    }

    getVelocity(): { x: Float32Array, y: Float32Array } {
        return {
            x: this.velocityX,
            y: this.velocityY
        };
    }

    getWidth(): number {
        return this.width;
    }

    getHeight(): number {
        return this.height;
    }
} 