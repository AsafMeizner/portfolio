import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { Sparkles, shaderMaterial, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGyroscope } from '../hooks/useGyroscope';
import { EffectComposer, Bloom, Noise, Vignette, ToneMapping } from '@react-three/postprocessing';

// --- PRNG System (Deterministic Generation) ---
class Random {
    private seed: number;
    constructor(seed: number) { this.seed = seed; }
    // Mulberry32
    next() {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    range(min: number, max: number) { return min + this.next() * (max - min); }
    choice<T>(arr: T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
}

// --- Shaders ---

const StarShaderMaterial = shaderMaterial(
    { time: 0, color: new THREE.Color(1.0, 0.5, 0.0), noiseScale: 1.0 },
    // Vertex
    `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `,
    // Fragment
    `
    uniform float time;
    uniform vec3 color;
    uniform float noiseScale;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    // Ashima Simplex Noise
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v){
        const vec2 C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + 1.0 * C.xxx;
        vec3 x2 = x0 - i2 + 2.0 * C.xxx;
        vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
        i = mod(i, 289.0 );
        vec4 p = permute( permute( permute( 
                    i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 1.0/7.0; // N=7
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,N*N)
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
        float n = snoise(vPosition * noiseScale + time * 0.5);
        float n2 = snoise(vPosition * (noiseScale * 2.0) - time * 0.2);
        
        float brightness = 1.0 + n * 0.3 + n2 * 0.15;
        
        // Limb darkening
        float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        
        vec3 finalColor = color * brightness;
        finalColor += color * fresnel * 0.5; // Corona glow
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
    `
);

const PlanetShaderMaterial = shaderMaterial(
    {
        time: 0,
        baseColor: new THREE.Color(0.5, 0.5, 0.5),
        type: 0, // 0: Rocky, 1: Gas, 2: Ice, 3: Volcanic
        lightDir: new THREE.Vector3(1, 0, 1),
        viewPos: new THREE.Vector3(0, 0, 0),
        seed: 0
    },
    // Vertex
    `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `,
    // Fragment
    `
    uniform float time;
    uniform vec3 baseColor;
    uniform int type;
    uniform vec3 lightDir;
    uniform vec3 viewPos;
    uniform float seed;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;

    // Simplex Noise (Same as above)
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v){
        const vec2 C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + 1.0 * C.xxx;
        vec3 x2 = x0 - i2 + 2.0 * C.xxx;
        vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
        i = mod(i, 289.0 );
        vec4 p = permute( permute( permute( 
                    i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 1.0/7.0; // N=7
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,N*N)
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
        vec3 color = baseColor;
        float roughness = 0.8;
        float specularIntensity = 0.0;
        vec3 pos = vPosition + vec3(seed); // Seed offset

        if (type == 0) { // Rocky (Terran-like)
            float n = snoise(pos * 2.0);
            float n2 = snoise(pos * 5.0);
            float height = n * 0.5 + n2 * 0.25;
            
            if (height > 0.2) { // Land
                color = mix(baseColor, baseColor * 0.5, height); // Mountains
                roughness = 0.9;
            } else { // Ocean
                color = vec3(0.0, 0.2, 0.5);
                roughness = 0.2;
                specularIntensity = 1.0;
            }
        } else if (type == 1) { // Gas Giant
            float bands = sin(pos.y * 10.0 + snoise(pos * 2.0) * 5.0);
            float storm = snoise(pos * 3.0 + time * 0.1);
            color = mix(color, color * 0.6, bands * 0.5 + 0.5);
            color += storm * 0.1;
            roughness = 0.5;
        } else if (type == 2) { // Ice
            float n = snoise(pos * 3.0);
            color = mix(vec3(0.8, 0.9, 1.0), vec3(1.0), n);
            roughness = 0.1;
            specularIntensity = 0.8;
        } else if (type == 3) { // Volcanic
            float n = snoise(pos * 2.0);
            float cracks = 1.0 - abs(n);
            cracks = pow(cracks, 10.0); // Thin lines
            color = mix(vec3(0.1), vec3(1.0, 0.2, 0.0), cracks); // Lava
            roughness = 0.9;
            specularIntensity = cracks; // Lava glows/shines
        }

        // Lighting
        vec3 N = normalize(vNormal);
        vec3 L = normalize(lightDir);
        vec3 V = normalize(viewPos - vWorldPosition);
        vec3 H = normalize(L + V);

        float diff = max(dot(N, L), 0.0);
        float spec = pow(max(dot(N, H), 0.0), 32.0) * specularIntensity;
        
        // Atmosphere Rim
        float rim = 1.0 - max(dot(V, N), 0.0);
        rim = pow(rim, 3.0);
        vec3 rimColor = baseColor * rim * 0.5; // Atmosphere color matches planet base

        // Shadow (Self-shadowing approx)
        float shadow = diff;

        vec3 ambient = vec3(0.02); 
        vec3 finalColor = ambient + (color * diff) + vec3(spec) + rimColor;
        
        // Lava emission
        if (type == 3) {
             float n = snoise(pos * 2.0);
             float cracks = 1.0 - abs(n);
             cracks = pow(cracks, 10.0);
             finalColor += vec3(1.0, 0.2, 0.0) * cracks * 2.0;
        }

        gl_FragColor = vec4(finalColor, 1.0);
    }
    `
);

const NebulaShaderMaterial = shaderMaterial(
    { time: 0, seed: 0 },
    // Vertex
    `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `,
    // Fragment
    `
    uniform float time;
    uniform float seed;
    varying vec2 vUv;
    varying vec3 vPosition;

    // Noise (Same as above)
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v){
        const vec2 C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + 1.0 * C.xxx;
        vec3 x2 = x0 - i2 + 2.0 * C.xxx;
        vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
        i = mod(i, 289.0 );
        vec4 p = permute( permute( permute( 
                    i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 1.0/7.0; // N=7
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,N*N)
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
        vec3 pos = normalize(vPosition);
        float n = snoise(pos * 1.5 + seed); // Base structure
        float mask = smoothstep(0.1, 0.6, n); // Patchy mask: mostly black, some clouds
        
        // Detail noise
        float n2 = snoise(pos * 4.0 - time * 0.05);
        
        // Deep Space (Black) vs Nebula
        vec3 deepSpace = vec3(0.0);
        
        // Nebula Colors (Purple/Blue/Orange)
        vec3 c1 = vec3(0.2, 0.0, 0.4); // Purple
        vec3 c2 = vec3(0.0, 0.3, 0.6); // Blue
        vec3 c3 = vec3(1.0, 0.5, 0.0); // Orange highlights
        
        vec3 nebulaColor = mix(c1, c2, n * 0.5 + 0.5);
        nebulaColor += c3 * max(0.0, n2 * 0.5); // Add highlights
        
        vec3 finalColor = mix(deepSpace, nebulaColor, mask * 0.8); // 0.8 opacity
        
        // Stars (Sharp, bright points in the background)
        float stars = pow(max(snoise(pos * 100.0), 0.0), 40.0) * 200.0;
        finalColor += vec3(stars);
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
    `
);

const StarStreaks = ({ count = 200, speed = 200, length = 20, size = 0.2, color = "#aaddff", opacity = 0.8 }: { count?: number, speed?: number, length?: number, size?: number, color?: string, opacity?: number }) => {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const positions = useMemo(() => {
        const pos = [];
        for (let i = 0; i < count; i++) {
            pos.push(
                (Math.random() - 0.5) * 400, // X
                (Math.random() - 0.5) * 400, // Y
                (Math.random() - 0.5) * 1000 // Z
            );
        }
        return pos;
    }, [count]);

    useFrame((_state, delta) => {
        if (!mesh.current) return;

        // Move streaks relative to camera speed
        // We want them to fly past us.
        // If we move -Z, stars move +Z relative to us.
        const moveSpeed = speed * delta;

        for (let i = 0; i < count; i++) {
            let x = positions[i * 3];
            let y = positions[i * 3 + 1];
            let z = positions[i * 3 + 2];

            z += moveSpeed;

            // Loop logic: if z > 500 (behind camera), reset to -500 (far ahead)
            if (z > 500) z -= 1000;
            if (z < -500) z += 1000;

            positions[i * 3 + 2] = z; // Update stored pos

            dummy.position.set(x, y, z);
            dummy.scale.z = length; // Stretch
            dummy.scale.x = size;
            dummy.scale.y = size;
            dummy.updateMatrix();
            mesh.current.setMatrixAt(i, dummy.matrix);
        }
        mesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={color} transparent opacity={opacity} />
        </instancedMesh>
    );
};

const SpaceDebris = () => {
    const count = 500;
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const positions = useMemo(() => {
        const pos = [];
        for (let i = 0; i < count; i++) {
            pos.push(
                (Math.random() - 0.5) * 1000,
                (Math.random() - 0.5) * 1000,
                (Math.random() - 0.5) * 1000
            );
        }
        return pos;
    }, []);

    useFrame((_state, delta) => {
        if (!mesh.current) return;
        // Debris just floats slowly
        for (let i = 0; i < count; i++) {
            dummy.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
            dummy.rotation.x += delta * 0.1;
            dummy.rotation.y += delta * 0.1;
            dummy.updateMatrix();
            mesh.current.setMatrixAt(i, dummy.matrix);
        }
        mesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
            <dodecahedronGeometry args={[0.5, 0]} />
            <meshStandardMaterial color="#555555" roughness={0.8} />
        </instancedMesh>
    );
};

extend({ StarShaderMaterial, PlanetShaderMaterial, NebulaShaderMaterial });

// --- Types & Constants ---
type CelestialBody = {
    id: string;
    type: 'star' | 'planet' | 'moon';
    position: THREE.Vector3;
    radius: number;
    color: string;
    orbitRadius?: number;
    orbitSpeed?: number;
    orbitOffset?: number;
    textureType?: number; // 0: Rocky, 1: Gas, 2: Ice, 3: Volcanic
    children?: CelestialBody[];
    data: {
        name: string;
        temp: string;
        mass: string;
        class: string;
    };
};

const CHUNK_SIZE = 1000;
const RENDER_DISTANCE = 2000;

// --- Generators ---
const generateName = (rng: Random) => {
    const prefixes = ['Kep', 'Gl', 'Tra', 'Pro', 'Sir', 'Veg', 'Alt', 'Bet'];
    const suffixes = ['ler', 'iese', 'ppist', 'xima', 'ius', 'a', 'air', 'el'];
    const num = Math.floor(rng.range(1, 999));
    return rng.choice(prefixes) + rng.choice(suffixes) + '-' + num;
};

const generateSystem = (chunkX: number, chunkY: number, chunkZ: number): CelestialBody => {
    // Seed based on coordinates
    const seed = chunkX * 73856093 ^ chunkY * 19349663 ^ chunkZ * 83492791;
    const rng = new Random(seed);

    // Chance to be empty space (Reduced to 20% for higher density)
    if (rng.next() > 0.8) return null as any;

    // System Position within chunk
    const posX = (chunkX * CHUNK_SIZE) + rng.range(-CHUNK_SIZE / 2, CHUNK_SIZE / 2);
    const posY = (chunkY * CHUNK_SIZE) + rng.range(-CHUNK_SIZE / 2, CHUNK_SIZE / 2);
    const posZ = (chunkZ * CHUNK_SIZE) + rng.range(-CHUNK_SIZE / 2, CHUNK_SIZE / 2);

    // Star Generation
    const starType = rng.next();
    let starColor = '#ffaa00';
    let starRadius = rng.range(20, 50);
    let starClass = 'G-Type Main Sequence';
    let starTemp = '5,778 K';

    if (starType > 0.98) { // Black Hole (Rare)
        starColor = '#000000';
        starRadius = 30; // Event Horizon
        starClass = 'Singularity';
        starTemp = 'Infinity';
    } else if (starType > 0.95) { // Blue Giant
        starColor = '#55aaff';
        starRadius = rng.range(60, 100);
        starClass = 'O-Type Blue Giant';
        starTemp = '30,000 K';
    } else if (starType > 0.7) { // Red Dwarf
        starColor = '#ff3333';
        starRadius = rng.range(10, 20);
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
    const numPlanets = Math.floor(rng.range(1, 8));
    for (let i = 0; i < numPlanets; i++) {
        const dist = starRadius + 50 + (i * rng.range(30, 60));
        const pRadius = rng.range(2, 8);
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
            orbitRadius: dist,
            orbitSpeed: rng.range(0.1, 0.5) / (i + 1), // Slower further out
            orbitOffset: rng.range(0, Math.PI * 2),
            textureType: pType,
            children: [],
            data: {
                name: `${star.data.name} ${['b', 'c', 'd', 'e', 'f', 'g'][i]}`,
                temp: `${Math.floor(rng.range(50, 1000))} K`,
                mass: `${rng.range(0.1, 300).toFixed(2)} Earths`,
                class: pClass
            }
        };

        // Moons & Rings
        if (rng.next() > 0.5) {
            const numMoons = Math.floor(rng.range(1, 4));
            for (let j = 0; j < numMoons; j++) {
                const mDist = pRadius + 5 + (j * 3);
                planet.children?.push({
                    id: `moon-${planet.id}-${j}`,
                    type: 'moon',
                    position: new THREE.Vector3(0, 0, 0),
                    radius: rng.range(0.5, 1.5),
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
                // Custom property for ring
                // We'll use a special textureType or just detect ID in renderer
            } as any);
        }

        star.children?.push(planet);
    }

    // Asteroid Belt
    if (rng.next() > 0.7) {
        const beltDist = starRadius + 200;
        star.children?.push({
            id: `belt-${star.id}`,
            type: 'planet', // Hack
            position: new THREE.Vector3(0, 0, 0),
            radius: 0,
            color: '#555',
            orbitRadius: beltDist,
            data: { name: 'Asteroid Belt', temp: '100K', mass: 'Unknown', class: 'Debris Field' }
        } as any);
    }

    return star;
};

// --- Components ---

const HUD = ({ target, onClose }: { target: CelestialBody | null, onClose: () => void }) => {
    if (!target) return null;

    return (
        <Html position={[0, 0, 0]} center zIndexRange={[100, 0]}>
            <div className="fixed bottom-10 right-10 w-64 bg-black/80 border border-cyan-500/50 p-4 rounded-lg backdrop-blur-md text-cyan-400 font-mono text-sm pointer-events-auto select-none">
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-cyan-600 hover:text-cyan-300"
                >
                    ✕
                </button>
                <div className="flex justify-between items-center border-b border-cyan-900/50 pb-2 mb-2">
                    <span className="font-bold text-lg text-white">{target.data.name}</span>
                    <span className="text-xs bg-cyan-900/30 px-2 py-0.5 rounded">{target.type.toUpperCase()}</span>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between"><span>CLASS:</span> <span className="text-white">{target.data.class}</span></div>
                    <div className="flex justify-between"><span>TEMP:</span> <span className="text-white">{target.data.temp}</span></div>
                    <div className="flex justify-between"><span>MASS:</span> <span className="text-white">{target.data.mass}</span></div>
                    <div className="flex justify-between"><span>DIST:</span> <span className="text-white">{Math.floor(target.position.distanceTo(new THREE.Vector3(0, 0, 0)))} LY</span></div>
                </div>
                <div className="mt-2 text-[10px] text-cyan-600 animate-pulse">
                    SCANNING... DATA STREAM ACTIVE
                </div>
            </div>
        </Html>
    );
};

const CelestialObject = ({ body, setTarget, shipPosition }: { body: CelestialBody, setTarget: (b: CelestialBody) => void, shipPosition: THREE.Vector3 }) => {
    const ref = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<any>(null);
    const { camera } = useThree();
    const [hovered, setHovered] = useState(false);

    // Calculate relative position
    // We subtract shipPosition from body.position to get position relative to camera (which is at 0,0,0)

    useFrame((state) => {
        const t = state.clock.getElapsedTime();

        // Update position based on ship movement
        if (ref.current) {
            // Re-calculate relative pos every frame? No, that's expensive if we do it for all.
            // Actually, we need to because shipPosition changes every frame.
            // But doing it in useMemo only updates when shipPosition changes (which is every frame).
            // Let's do it directly here.
            ref.current.position.copy(body.position).sub(shipPosition);
        }

        // Orbit Logic
        if (body.orbitRadius && ref.current) {
            // For children (planets), they are relative to their parent (star).
            // If this is a child, 'body.position' is 0,0,0 relative to parent.
            // So we don't subtract shipPosition from children, only from top-level systems.
            // Wait, the recursion structure passes 'body' which has 'position'.

            if (body.type === 'star') {
                // Top level system. Position is absolute world coord.
                // Already handled above.
            } else {
                // Child. Position is relative to parent.
                // We shouldn't subtract shipPosition here because the parent Group is already shifted.
                // BUT, my recursion renders children INSIDE the parent group.
                // So children are local.

                const angle = t * (body.orbitSpeed || 0.1) + (body.orbitOffset || 0);
                ref.current.position.x = Math.cos(angle) * body.orbitRadius;
                ref.current.position.z = Math.sin(angle) * body.orbitRadius;
                // Y is 0 usually
            }
        }

        // Shader Updates
        if (materialRef.current) {
            materialRef.current.time = t;
            if (body.type === 'planet' || body.type === 'moon') {
                if (ref.current) {
                    // Light dir is from Star (0,0,0 local) to Planet
                    // Actually, for a planet, the light source is the star.
                    // If planet is child of star, star is at 0,0,0 local.
                    // So light dir is -position.
                    const lightDir = new THREE.Vector3(0, 0, 0).sub(ref.current.position).normalize();
                    materialRef.current.lightDir = lightDir;
                    materialRef.current.viewPos = camera.position;
                }
            }
        }

        // Rotation
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.005;
        }

        // HUD Target Logic
        if (hovered) {
            setTarget(body);
        }
    });

    // Handle Special Types (Rings, Belts)
    if (body.data.class === 'Ring') {
        return (
            <group ref={ref} position={body.position}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[body.radius + 5, body.radius + 15, 64]} />
                    <meshStandardMaterial color={body.color} side={THREE.DoubleSide} transparent opacity={0.6} />
                </mesh>
            </group>
        );
    }

    if (body.data.class === 'Debris Field') {
        return (
            <group ref={ref} position={body.position}>
                <points>
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            count={1000}
                            array={new Float32Array(3000).map(() => (Math.random() - 0.5) * 100)}
                            itemSize={3}
                            args={[new Float32Array(3000).map(() => (Math.random() - 0.5) * 100), 3]}
                        />
                    </bufferGeometry>
                    <pointsMaterial size={0.5} color="#888" />
                </points>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[body.orbitRadius! - 5, body.orbitRadius! + 5, 128]} />
                    <meshBasicMaterial color="#444" transparent opacity={0.2} side={THREE.DoubleSide} />
                </mesh>
            </group>
        );
    }

    // If it's a child (planet/moon), we don't subtract shipPosition because it's inside the parent group
    // If it's a root (star), we DO subtract shipPosition (handled in useFrame)
    const isRoot = body.type === 'star';

    return (
        <group ref={ref} position={isRoot ? undefined : body.position}>
            {/* Orbit Line (Static relative to parent) */}
            {body.orbitRadius && (
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[body.orbitRadius - 0.2, body.orbitRadius + 0.2, 128]} />
                    <meshBasicMaterial color={body.color} transparent opacity={0.1} side={THREE.DoubleSide} />
                </mesh>
            )}

            {/* The Body Itself (Animated) */}
            <group ref={meshRef}> {/* We rotate this group for orbit position */}
                <mesh
                    onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
                    onPointerOut={() => setHovered(false)}
                >
                    <sphereGeometry args={[body.radius, 64, 64]} />
                    {body.type === 'star' ? (
                        // @ts-ignore
                        <starShaderMaterial ref={materialRef} color={new THREE.Color(body.color)} noiseScale={1.0} />
                    ) : (
                        // @ts-ignore
                        <planetShaderMaterial
                            ref={materialRef}
                            baseColor={new THREE.Color(body.color)}
                            type={body.textureType || 0}
                            seed={Math.random() * 100}
                        />
                    )}
                </mesh>
                {/* Star Light */}
                {body.type === 'star' && (
                    <pointLight intensity={2} distance={500} decay={1} color={body.color} />
                )}
            </group>

            {/* Children (Recursion) */}
            {body.children?.map(child => (
                <CelestialObject
                    key={child.id}
                    body={child}
                    setTarget={setTarget}
                    shipPosition={shipPosition} // Pass it down, but children ignore it for position
                />
            ))}
        </group>
    );
};

// --- UI Controls (External) ---

const Joystick = ({ onMove }: { onMove: (x: number, y: number) => void }) => {
    const stickRef = useRef<HTMLDivElement>(null);
    const baseRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });

    const handleStart = () => {
        setActive(true);
    };

    const handleEnd = () => {
        setActive(false);
        setPos({ x: 0, y: 0 });
        onMove(0, 0);
    };

    const handleMove = (clientX: number, clientY: number) => {
        if (!active || !baseRef.current) return;
        const base = baseRef.current.getBoundingClientRect();
        const centerX = base.left + base.width / 2;
        const centerY = base.top + base.height / 2;

        const maxDist = base.width / 2;

        let dx = clientX - centerX;
        let dy = clientY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > maxDist) {
            const angle = Math.atan2(dy, dx);
            dx = Math.cos(angle) * maxDist;
            dy = Math.sin(angle) * maxDist;
        }

        setPos({ x: dx, y: dy });
        onMove(dx / maxDist, dy / maxDist);
    };

    useEffect(() => {
        const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
        const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
        const onUp = () => handleEnd();

        if (active) {
            window.addEventListener('touchmove', onTouchMove);
            window.addEventListener('touchend', onUp);
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onUp);
        }
        return () => {
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onUp);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [active]);

    return (
        <div
            ref={baseRef}
            className="w-32 h-32 rounded-full bg-slate-900/50 border border-cyan-500/30 backdrop-blur-sm relative touch-none pointer-events-auto"
            onMouseDown={handleStart}
            onTouchStart={handleStart}
        >
            <div
                ref={stickRef}
                className="w-12 h-12 rounded-full bg-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.5)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-75"
                style={{ transform: `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)` }}
            />
        </div>
    );
};

const SpeedLever = ({ value, onChange }: { value: number, onChange: (v: number) => void }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState(false);

    const handleMove = (clientY: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const height = rect.height;
        const relativeY = Math.max(0, Math.min(height, clientY - rect.top));
        // Invert: Bottom is 0, Top is 1
        const newVal = 1 - (relativeY / height);
        onChange(newVal);
    };

    useEffect(() => {
        const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientY);
        const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
        const onUp = () => setDragging(false);

        if (dragging) {
            window.addEventListener('touchmove', onTouchMove);
            window.addEventListener('touchend', onUp);
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onUp);
        }
        return () => {
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onUp);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [dragging]);

    return (
        <div className="flex flex-col items-center gap-2 pointer-events-auto">
            <div className="text-cyan-400 font-mono text-xs">WARP</div>
            <div
                ref={containerRef}
                className="w-8 h-32 bg-slate-900/50 border border-cyan-500/30 rounded-full relative overflow-hidden cursor-pointer touch-none"
                onMouseDown={(e) => { setDragging(true); handleMove(e.clientY); }}
                onTouchStart={(e) => { setDragging(true); handleMove(e.touches[0].clientY); }}
            >
                <div
                    className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-cyan-900 to-cyan-400 transition-all duration-75"
                    style={{ height: `${value * 100}%` }}
                />
                {/* Ticks */}
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="absolute w-full h-[1px] bg-cyan-500/20" style={{ bottom: `${i * 25}%` }} />
                ))}
            </div>
            <div className="text-cyan-400 font-mono text-xs">{(value * 9 + 1).toFixed(1)}x</div>
        </div>
    );
};

const UniverseEngine = ({
    speedDisplay,
    joystickRef,
    speedRef
}: {
    speedDisplay: number,
    joystickRef: React.MutableRefObject<{ x: number, y: number }>,
    speedRef: React.MutableRefObject<number>
}) => {
    const { orientationRef, isSupported } = useGyroscope();
    const { camera } = useThree();
    const [systems, setSystems] = useState<CelestialBody[]>([]);
    const [target, setTarget] = useState<CelestialBody | null>(null);

    // CAMERA CENTRIC STATE
    const shipPosition = useRef(new THREE.Vector3(0, 0, 0)); // The "Real" position in the universe
    const lastChunk = useRef(new THREE.Vector3(0, 0, 0));

    // Initial Orientation Calibration
    const initialOrientation = useRef<{ alpha: number, beta: number, gamma: number } | null>(null);
    const calibrated = useRef(false);

    // Initial Generation
    useEffect(() => {
        const initialSystems = [];

        // --- HERO SYSTEM (Always spawns at start) ---
        const heroStar: CelestialBody = {
            id: 'hero-star',
            type: 'star',
            position: new THREE.Vector3(0, 0, -300), // Directly ahead
            radius: 80,
            color: '#0066ff', // Blue Giant
            orbitRadius: 0,
            children: [],
            data: { name: 'ALPHA CENTAURI PRIME', temp: '25,000 K', mass: '18 Solar Masses', class: 'O-Type Blue Giant' }
        };

        // Hero Planets
        const heroPlanet1: CelestialBody = {
            id: 'hero-planet-1',
            type: 'planet',
            position: new THREE.Vector3(0, 0, 0),
            radius: 15,
            color: '#ffaa00', // Volcanic
            orbitRadius: 150,
            orbitSpeed: 0.2,
            orbitOffset: 0,
            textureType: 3, // Volcanic
            data: { name: 'VULCAN', temp: '1200 K', mass: '2 Earths', class: 'Volcanic World' }
        };
        const heroPlanet2: CelestialBody = {
            id: 'hero-planet-2',
            type: 'planet',
            position: new THREE.Vector3(0, 0, 0),
            radius: 25,
            color: '#aaddff', // Ice/Gas
            orbitRadius: 250,
            orbitSpeed: 0.1,
            orbitOffset: 2,
            textureType: 1, // Gas
            data: { name: 'BOREAS', temp: '120 K', mass: '15 Earths', class: 'Ice Giant' }
        };
        // Ring for Planet 2
        heroPlanet2.children = [{
            id: 'hero-ring-1',
            type: 'moon', // Hack for ring? No, let's just use moon for now or add ring logic later.
            // Actually, let's just add a moon.
            position: new THREE.Vector3(0, 0, 0),
            radius: 2,
            color: '#fff',
            orbitRadius: 40,
            orbitSpeed: 0.5,
            data: { name: 'MIMAS', temp: '50 K', mass: '0.01 Earths', class: 'Moon' }
        } as any];

        heroStar.children?.push(heroPlanet1, heroPlanet2);
        initialSystems.push(heroStar);

        // Generate 3x3x3 chunk grid around 0,0,0
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    // Don't spawn in the center chunk (0,0,0) to avoid colliding with Hero System
                    if (x === 0 && y === 0 && z === 0) continue;

                    const sys = generateSystem(x, y, z);
                    if (sys) initialSystems.push(sys);
                }
            }
        }
        setSystems(initialSystems);
    }, []);

    useFrame((state, delta) => {
        const orient = orientationRef.current;

        // --- Physics & Controls ---

        // Speed Calculation
        // Base speed 100, max speed 1000 (10x)
        const warpFactor = 1 + speedRef.current * 9;
        const currentSpeed = 100 * warpFactor;

        // Rotation Logic
        if (isSupported) {
            // Mobile Gyro Control
            if (!calibrated.current && orient.alpha !== 0) {
                initialOrientation.current = { ...orient };
                calibrated.current = true;
            }

            const targetRotX = (orient.beta * Math.PI) / 180;
            const targetRotY = (orient.gamma * Math.PI) / 180;

            // Mix Gyro + Joystick
            const joyX = joystickRef.current.x * Math.PI;
            const joyY = joystickRef.current.y * Math.PI / 2;

            camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, targetRotX + joyY, 0.1);
            camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetRotY - joyX, 0.1);

        } else {
            // Desktop / No Gyro
            const mouseX = (state.mouse.x * Math.PI) / 4;
            const mouseY = (state.mouse.y * Math.PI) / 4;

            const joyX = joystickRef.current.x * Math.PI;
            const joyY = joystickRef.current.y * Math.PI / 2;

            camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, -mouseX - joyX, 0.05);
            camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, -mouseY + joyY, 0.05);
        }

        // Velocity Vector (Relative to Camera Rotation)
        // We move FORWARD (-Z)
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(camera.quaternion);
        direction.multiplyScalar(currentSpeed * delta);

        // Update Ship Position (Virtual)
        shipPosition.current.add(direction);

        // --- Infinite Generation (Chunking) ---
        // Calculate chunk based on SHIP position, not camera position
        const currentChunkX = Math.floor(shipPosition.current.x / CHUNK_SIZE);
        const currentChunkY = Math.floor(shipPosition.current.y / CHUNK_SIZE);
        const currentChunkZ = Math.floor(shipPosition.current.z / CHUNK_SIZE);

        if (currentChunkX !== lastChunk.current.x ||
            currentChunkY !== lastChunk.current.y ||
            currentChunkZ !== lastChunk.current.z) {

            lastChunk.current.set(currentChunkX, currentChunkY, currentChunkZ);

            // Generate new systems in radius
            const newSystems: CelestialBody[] = [];
            for (let x = currentChunkX - 1; x <= currentChunkX + 1; x++) {
                for (let y = currentChunkY - 1; y <= currentChunkY + 1; y++) {
                    for (let z = currentChunkZ - 1; z <= currentChunkZ + 1; z++) {
                        const sys = generateSystem(x, y, z);
                        if (sys) newSystems.push(sys);
                    }
                }
            }

            // Deduplicate based on ID (simple way: just replace all, since generateSystem is deterministic)
            setSystems(newSystems);
        }
    });

    return (
        <>
            {systems.map(sys => (
                <CelestialObject
                    key={sys.id}
                    body={sys}
                    setTarget={setTarget}
                    shipPosition={shipPosition.current} // Pass the ref value (it updates every frame in child)
                />
            ))}

            {/* Space Dust & Warp Lines - STATIC relative to camera (0,0,0) */}
            <group position={[0, 0, 0]}>
                <SpaceDebris />
                <Sparkles count={2000} scale={1000} size={2} speed={0} opacity={0.5} color="#ffffff" />
                <StarStreaks count={200} speed={200 * (1 + speedDisplay * 5)} length={20 * (1 + speedDisplay * 2)} size={0.2} color="#aaddff" />
                <StarStreaks count={500} speed={150 * (1 + speedDisplay * 5)} length={10 * (1 + speedDisplay * 2)} size={0.1} color="#ffffff" opacity={0.4} />
            </group>

            {/* HUD Overlay */}
            {target && <HUD target={target} onClose={() => setTarget(null)} />}
        </>
    );
};

const NebulaSkybox = () => {
    const materialRef = useRef<any>(null);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.time = state.clock.getElapsedTime();
            // Slowly rotate skybox
            materialRef.current.seed = 123.45;
        }
    });

    return (
        <mesh position={[0, 0, 0]}> {/* Always at center */}
            <sphereGeometry args={[RENDER_DISTANCE * 0.9, 64, 64]} />
            {/* @ts-ignore */}
            <nebulaShaderMaterial ref={materialRef} side={THREE.BackSide} />
        </mesh>
    );
};

const Hyperspeed = () => {
    const { isSupported } = useGyroscope();

    // Lift state up for UI controls
    const joystickRef = useRef({ x: 0, y: 0 });
    const speedRef = useRef(0); // 0 to 1
    const [speedDisplay, setSpeedDisplay] = useState(0); // For UI updates

    const handleSpeedChange = (v: number) => {
        speedRef.current = v;
        setSpeedDisplay(v);
    };

    const handleJoystickMove = (x: number, y: number) => {
        joystickRef.current = { x, y };
    };

    return (
        <div className="absolute inset-0 z-0 bg-[#020617]">
            <Canvas camera={{ position: [0, 0, 0], fov: 60, far: RENDER_DISTANCE * 2 }} dpr={[1, 1.5]}>
                <fog attach="fog" args={['#000000', RENDER_DISTANCE * 0.5, RENDER_DISTANCE]} />

                {/* Lighting */}
                <ambientLight intensity={0.1} />
                <hemisphereLight args={['#ffffff', '#000000', 0.2]} />

                <UniverseEngine
                    speedDisplay={speedDisplay}
                    joystickRef={joystickRef}
                    speedRef={speedRef}
                />
                <NebulaSkybox />

                <EffectComposer>
                    <Bloom luminanceThreshold={1.0} mipmapBlur intensity={1.5} radius={0.4} />
                    <ToneMapping />
                    <Noise opacity={0.05} />
                    <Vignette eskil={false} offset={0.1} darkness={1.1} />
                </EffectComposer>
            </Canvas>

            {/* UI Overlay - OUTSIDE CANVAS */}
            <div className="absolute bottom-8 left-8 pointer-events-none z-50">
                <div className="text-cyan-500 font-mono text-xs bg-black/50 p-2 rounded backdrop-blur-sm border border-cyan-900/30">
                    <p>SYS_STATUS: ONLINE</p>
                    <p>MODE: {isSupported ? 'GYRO_FLIGHT' : 'AUTOPILOT'}</p>
                    <p>SECTOR: UNCHARTED</p>
                </div>
            </div>

            {/* Controls - OUTSIDE CANVAS */}
            <div className="absolute bottom-8 right-8 flex gap-8 items-end pointer-events-auto z-50">
                <SpeedLever value={speedDisplay} onChange={handleSpeedChange} />
                <Joystick onMove={handleJoystickMove} />
            </div>

            {/* Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30 z-40">
                <div className="w-8 h-8 border border-cyan-500 rounded-full"></div>
                <div className="w-1 h-1 bg-cyan-500 rounded-full absolute"></div>
            </div>
        </div>
    );
};

export default Hyperspeed;
