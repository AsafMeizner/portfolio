import * as THREE from 'three';
import { Random } from './random';
import type { CelestialBody } from '../types';
import { CHUNK_SIZE, GENERATION } from '../settings';

const generateName = (rng: Random) => {
    const prefixes = ['Kep', 'Gl', 'Tra', 'Pro', 'Sir', 'Veg', 'Alt', 'Bet', 'Rig', 'Ant', 'Can'];
    const suffixes = ['ler', 'iese', 'ppist', 'xima', 'ius', 'a', 'air', 'el', 'il', 'ares', 'opus'];
    const greek = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];

    if (rng.next() > 0.7) {
        return `${rng.choice(greek)} ${rng.choice(prefixes)}${rng.choice(suffixes)}`;
    }

    const num = Math.floor(rng.range(1, 999));
    return rng.choice(prefixes) + rng.choice(suffixes) + '-' + num;
};

export const generateSystem = (chunkX: number, chunkY: number, chunkZ: number): CelestialBody | null => {
    // Seed based on coordinates
    const seed = chunkX * 73856093 ^ chunkY * 19349663 ^ chunkZ * 83492791;
    const rng = new Random(seed);

    // Chance to spawn a system
    if (rng.next() > GENERATION.STAR_SYSTEM_CHANCE) return null;

    // System Position within chunk
    const posX = (chunkX * CHUNK_SIZE) + rng.range(-CHUNK_SIZE / 2, CHUNK_SIZE / 2);
    const posY = (chunkY * CHUNK_SIZE) + rng.range(-CHUNK_SIZE / 2, CHUNK_SIZE / 2);
    const posZ = (chunkZ * CHUNK_SIZE) + rng.range(-CHUNK_SIZE / 2, CHUNK_SIZE / 2);

    // Star Generation
    const starType = rng.next();
    let starColor = '#ffaa00';
    let starRadius = rng.range(GENERATION.MIN_STAR_RADIUS, GENERATION.MAX_STAR_RADIUS);
    let starClass = 'G-Type Main Sequence';
    let starTemp = '5,778 K';

    if (starType > 0.98) { // Black Hole (Rare)
        starColor = '#000000';
        starRadius = 30; // Event Horizon
        starClass = 'Singularity';
        starTemp = 'Infinity';
    } else if (starType > 0.95) { // Blue Giant
        starColor = '#55aaff';
        starRadius = rng.range(80, 150);
        starClass = 'O-Type Blue Giant';
        starTemp = '30,000 K';
    } else if (starType > 0.7) { // Red Dwarf
        starColor = '#ff3333';
        starRadius = rng.range(15, 30);
        starClass = 'M-Type Red Dwarf';
        starTemp = '3,000 K';
    } else if (starType < 0.05) { // Neutron Star
        starColor = '#ffffff';
        starRadius = 5;
        starClass = 'Neutron Star';
        starTemp = '1,000,000 K';
    }

    const star: CelestialBody = {
        id: `star-${chunkX}-${chunkY}-${chunkZ}`,
        type: 'star',
        position: new THREE.Vector3(posX, posY, posZ),
        radius: starRadius,
        color: starColor,
        children: [],
        data: {
            name: generateName(rng),
            temp: starTemp,
            mass: `${rng.range(0.1, 50).toFixed(2)} Solar Masses`,
            class: starClass
        }
    };

    // Planets
    const numPlanets = Math.floor(rng.range(3, 12)); // More planets!
    let currentDist = starRadius + 100;

    for (let i = 0; i < numPlanets; i++) {
        currentDist += rng.range(60, 150); // Incremental distance
        const pRadius = rng.range(5, 20);
        const pType = Math.floor(rng.range(0, 4));

        let pColor = '#ffffff';
        let pClass = 'Rocky World';
        if (pType === 1) { pColor = '#d4a373'; pClass = 'Gas Giant'; }
        if (pType === 2) { pColor = '#aaddff'; pClass = 'Ice World'; }
        if (pType === 3) { pColor = '#ff4400'; pClass = 'Volcanic World'; }

        const planet: CelestialBody = {
            id: `planet-${star.id}-${i}`,
            type: 'planet',
            position: new THREE.Vector3(0, 0, 0), // Relative to star
            radius: pRadius,
            color: pColor,
            orbitRadius: currentDist,
            orbitSpeed: rng.range(0.05, 0.2) / (i + 1), // Slower further out
            orbitOffset: rng.range(0, Math.PI * 2),
            textureType: pType,
            children: [],
            data: {
                name: `${star.data.name} ${['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'][i] || 'x'}`,
                temp: `${Math.floor(rng.range(50, 1000))} K`,
                mass: `${rng.range(0.1, 300).toFixed(2)} Earths`,
                class: pClass
            }
        };

        // Moons
        if (rng.next() > 0.4) {
            const numMoons = Math.floor(rng.range(1, 6));
            for (let j = 0; j < numMoons; j++) {
                const mDist = pRadius + 8 + (j * 6);
                planet.children?.push({
                    id: `moon-${planet.id}-${j}`,
                    type: 'moon',
                    position: new THREE.Vector3(0, 0, 0),
                    radius: rng.range(1, 4),
                    color: '#aaaaaa',
                    orbitRadius: mDist,
                    orbitSpeed: rng.range(0.5, 1.5),
                    orbitOffset: rng.range(0, Math.PI * 2),
                    textureType: 0,
                    data: { name: '', temp: '', mass: '', class: '' }
                });
            }
        }

        // Rings (Gas Giants / Ice Giants)
        if ((pType === 1 || pType === 2) && rng.next() > 0.3) {
            planet.children?.push({
                id: `ring-${planet.id}`,
                type: 'moon', // Hack: render as ring in component
                position: new THREE.Vector3(0, 0, 0),
                radius: 0, // Ignored for ring
                color: pColor,
                orbitRadius: 0, // Ignored
                data: { name: 'Ring System', temp: '0K', mass: 'Dust', class: 'Ring' },
            } as any);
        }

        star.children?.push(planet);
    }

    // Asteroid Belts (Inner and Outer)
    // Inner Belt - Varied configurations
    if (rng.next() > 0.3) {
        const beltDist = starRadius + rng.range(200, 300);
        const beltType = rng.next();

        let arcLength: number;
        let beltSpeed: number;
        let beltName: string;

        if (beltType > 0.7) {
            // Thin strip moving quickly
            arcLength = rng.range(0.08, 0.15); // ~30-55° arc
            beltSpeed = rng.range(0.08, 0.15);
            beltName = 'Asteroid Stream';
        } else if (beltType > 0.4) {
            // Partial ring moving moderately
            arcLength = rng.range(0.25, 0.5); // ~90-180° arc
            beltSpeed = rng.range(0.04, 0.08);
            beltName = 'Partial Belt';
        } else {
            // Full traditional belt moving slowly
            arcLength = 1.0; // Full 360° orbit
            beltSpeed = rng.range(0.01, 0.03);
            beltName = 'Asteroid Belt';
        }

        star.children?.push({
            id: `belt-inner-${star.id}`,
            type: 'asteroid-belt',
            position: new THREE.Vector3(0, 0, 0),
            radius: 20, // Width
            color: '#888888',
            orbitRadius: beltDist, // Mean Radius
            data: {
                name: `Inner ${beltName}`,
                temp: '150K',
                mass: 'Unknown',
                class: 'Asteroid Field',
                arcLength,
                beltSpeed,
                beltOffset: rng.range(0, Math.PI * 2) // Random starting position
            }
        });
    }

    // Outer Belt (Kuiper-like) - Varied configurations
    if (rng.next() > 0.5) {
        const beltDist = currentDist + rng.range(100, 200);
        const beltType = rng.next();

        let arcLength: number;
        let beltSpeed: number;
        let beltName: string;

        if (beltType > 0.7) {
            // Thin debris stream
            arcLength = rng.range(0.08, 0.15); // ~30-55° arc
            beltSpeed = rng.range(0.05, 0.10);
            beltName = 'Debris Stream';
        } else if (beltType > 0.4) {
            // Partial ring
            arcLength = rng.range(0.25, 0.5); // ~90-180° arc
            beltSpeed = rng.range(0.02, 0.05);
            beltName = 'Debris Arc';
        } else {
            // Full traditional belt
            arcLength = 1.0; // Full 360° orbit
            beltSpeed = rng.range(0.005, 0.02);
            beltName = 'Kuiper Belt';
        }

        star.children?.push({
            id: `belt-outer-${star.id}`,
            type: 'asteroid-belt',
            position: new THREE.Vector3(0, 0, 0),
            radius: 40, // Width
            color: '#556677',
            orbitRadius: beltDist, // Mean Radius
            data: {
                name: `Outer ${beltName}`,
                temp: '30K',
                mass: 'Unknown',
                class: 'Kuiper Belt',
                arcLength,
                beltSpeed,
                beltOffset: rng.range(0, Math.PI * 2) // Random starting position
            }
        });
    }

    return star;
};
