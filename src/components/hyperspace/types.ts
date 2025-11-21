import * as THREE from 'three';

export type CelestialType = 'star' | 'planet' | 'moon';

export interface CelestialData {
    name: string;
    temp: string;
    mass: string;
    class: string;
}

export interface CelestialBody {
    id: string;
    type: CelestialType;
    position: THREE.Vector3;
    radius: number;
    color: string;
    orbitRadius?: number;
    orbitSpeed?: number;
    orbitOffset?: number;
    textureType?: number; // 0: Rocky, 1: Gas, 2: Ice, 3: Volcanic
    children?: CelestialBody[];
    data: CelestialData;
}

export interface Controls {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    rollLeft: boolean;
    rollRight: boolean;
    boost: boolean;
}
