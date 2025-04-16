export class CanvasParticleSystem {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private dots: { x: number; y: number; vx: number; vy: number }[] = [];
    private DOT_COUNT = 100;
    private RADIUS = 2;
    private DIST_THRESH_MAX = 120;
    private backgroundColor: string = '#000000'; // Default background color

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        this.initializeDots();
    }

    private resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    private initializeDots() {
        for (let i = 0; i < this.DOT_COUNT; i++) {
            this.dots.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5),
                vy: (Math.random() - 0.5),
            });
        }
    }

    private distance(dot1: any, dot2: any) {
        const dx = dot1.x - dot2.x;
        const dy = dot1.y - dot2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private triangleArea(dot1: any, dot2: any, dot3: any) {
        return Math.abs(dot1.x * (dot2.y - dot3.y) + dot2.x * (dot3.y - dot1.y) + dot3.x * (dot1.y - dot2.y)) / 2;
    }

    private drawDots() {
        // Use the dynamic background color
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

                    this.ctx.strokeStyle = `rgba(255, 255, 255, ${1 - dist1 / this.DIST_THRESH_MAX})`;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.dots[i].x, this.dots[i].y);
                    this.ctx.lineTo(this.dots[j].x, this.dots[j].y);
                    this.ctx.stroke();
                }
            }
        }
    }

    private updateDots() {
        for (const dot of this.dots) {
            dot.x += dot.vx;
            dot.y += dot.vy;

            if (dot.x < 0) dot.x = this.canvas.width;
            else if (dot.x > this.canvas.width) dot.x = 0;

            if (dot.y < 0) dot.y = this.canvas.height;
            else if (dot.y > this.canvas.height) dot.y = 0;
        }
    }

    public setBackgroundColor(color: string) {
        this.backgroundColor = color;
    }

    public animate() {
        this.updateDots();
        this.drawDots();
        this.drawConnections();
        requestAnimationFrame(this.animate.bind(this));
    }
}