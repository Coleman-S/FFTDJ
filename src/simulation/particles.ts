interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
}

export class ParticleSystem {
    private particles: Particle[] = [];
    private maxParticles: number;

    constructor(maxParticles: number = 1000) {
        this.maxParticles = maxParticles;
    }

    emit(x: number, y: number, vx: number, vy: number) {
        if (this.particles.length < this.maxParticles) {
            this.particles.push({
                x,
                y,
                vx,
                vy,
                life: 1.0
            });
        }
    }

    update(dt: number) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    getParticles(): Particle[] {
        return this.particles;
    }
} 