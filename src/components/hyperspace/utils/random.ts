export class Random {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    // Mulberry32
    next() {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    range(min: number, max: number) {
        return min + this.next() * (max - min);
    }

    choice<T>(arr: T[]): T {
        return arr[Math.floor(this.next() * arr.length)];
    }

    // Gaussian distribution (Box-Muller transform)
    gaussian(mean: number = 0, stdDev: number = 1): number {
        let u = 0, v = 0;
        while (u === 0) u = this.next(); // Converting [0,1) to (0,1)
        while (v === 0) v = this.next();
        return mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
}
