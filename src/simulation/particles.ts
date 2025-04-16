interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
    color: number; // For color variation
}

export class ParticleSystem {
    private particles: Particle[] = [];
    private maxParticles: number;

    constructor(maxParticles: number = 1000) {
        this.maxParticles = maxParticles;
    }

    emit(x: number, y: number, vx: number, vy: number) {
        if (this.particles.length < this.maxParticles) {
            // Create particles with more varied properties
            this.particles.push({
                x,
                y,
                vx,
                vy,
                life: 2.0 + Math.random() * 2.0, // Longer lifespan, 2-4 seconds
                size: 0.05 + Math.random() * 0.1, // Varied size
                color: Math.random() // Random color value (0-1)
            });
        }
    }

    update(dt: number) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Move particles
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            
            // Add some gravity effect
            p.vy += 0.001 * dt;
            
            // Add some randomness to motion
            p.vx += (Math.random() - 0.5) * 0.001;
            p.vy += (Math.random() - 0.5) * 0.001;
            
            // Decrease life
            p.life -= dt;

            // Remove dead particles
            if (p.life <= 0 || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) {
                this.particles.splice(i, 1);
            }
        }
    }

    getParticles(): Particle[] {
        return this.particles;
    }
} 