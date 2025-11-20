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

    useFrame((state) => {
        if (!mesh.current) return;
        const t = state.clock.getElapsedTime();

        for (let i = 0; i < count; i++) {
            let x = positions[i * 3];
            let y = positions[i * 3 + 1];
            let z = positions[i * 3 + 2];

            z += t * speed;
            z = z % 1000; // Loop
            z -= 500; // Center around camera Z

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

    // Chance to be empty space
    if (rng.next() > 0.3) return null as any;

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

    if (starType > 0.95) { // Blue Giant
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
        id: `star - ${chunkX} - ${chunkY} - ${chunkZ}`,
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
            id: `planet - ${star.id} - ${i}`,
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

        // Moons
        if (rng.next() > 0.5) {
            const numMoons = Math.floor(rng.range(1, 4));
            for (let j = 0; j < numMoons; j++) {
                const mDist = pRadius + 5 + (j * 3);
                planet.children?.push({
                    id: `moon - ${planet.id} - ${j}`,
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

        star.children?.push(planet);
    }

    return star;
};

// --- Components ---

const HUD = ({ target }: { target: CelestialBody | null }) => {
    if (!target) return null;

    return (
        <Html position={[0, 0, 0]} center> {/* Positioned in 3D space? No, let's use fixed overlay */}
            <div className="fixed bottom-10 right-10 w-64 bg-black/80 border border-cyan-500/50 p-4 rounded-lg backdrop-blur-md text-cyan-400 font-mono text-sm pointer-events-none select-none">
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

const CelestialObject = ({ body, setTarget }: { body: CelestialBody, setTarget: (b: CelestialBody) => void }) => {
    const ref = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<any>(null);
    const { camera } = useThree();
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();

        // Orbit Logic
        if (body.orbitRadius && ref.current) {
            const angle = t * (body.orbitSpeed || 0.1) + (body.orbitOffset || 0);
            ref.current.position.x = Math.cos(angle) * body.orbitRadius;
            ref.current.position.z = Math.sin(angle) * body.orbitRadius;
        }

        // Shader Updates
        if (materialRef.current) {
            materialRef.current.time = t;
            if (body.type === 'planet' || body.type === 'moon') {
                // Light direction is vector from planet to parent (0,0,0 in local space)
                // Actually parentPos is world pos of parent.
                // But we are in parent's local space. So parent is at 0,0,0.
                // So light dir is -position.
                if (ref.current) {
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

    return (
        <group ref={ref} position={body.type === 'star' ? body.position : undefined}>
            <mesh
                ref={meshRef}
                onPointerOver={() => setHovered(true)}
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
                        seed={Math.random() * 100} // Static seed for texture
                    />
                )}
            </mesh>

            {/* Star Light */}
            {body.type === 'star' && (
                <pointLight intensity={2} distance={500} decay={1} color={body.color} />
            )}

            {/* Orbit Line */}
            {body.orbitRadius && (
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[body.orbitRadius - 0.2, body.orbitRadius + 0.2, 128]} />
                    <meshBasicMaterial color={body.color} transparent opacity={0.1} side={THREE.DoubleSide} />
                </mesh>
            )}

            {/* Children (Recursion) */}
            {body.children?.map(child => (
                <CelestialObject
                    key={child.id}
                    body={child}
                    setTarget={setTarget}
                />
            ))}
        </group>
    );
};

const UniverseEngine = () => {
    const { orientationRef, accelerationRef, isSupported } = useGyroscope();
    const { camera } = useThree();
    const [systems, setSystems] = useState<CelestialBody[]>([]);
    const [target, setTarget] = useState<CelestialBody | null>(null);
    const lastChunk = useRef(new THREE.Vector3(0, 0, 0));
    const velocity = useRef(new THREE.Vector3(0, 0, 0));

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
        const accel = accelerationRef.current;
        const orient = orientationRef.current;

        // --- Physics & Controls ---
        if (isSupported) {
            // Mobile
            const ax = Math.abs(accel.x) > 0.5 ? accel.x : 0;
            const ay = Math.abs(accel.y) > 0.5 ? accel.y : 0;
            const az = Math.abs(accel.z) > 0.5 ? accel.z : 0;

            velocity.current.x += ax * delta * 10;
            velocity.current.y += ay * delta * 10;
            velocity.current.z += az * delta * 10;

            // Gyro Look
            const targetRotX = (orient.beta * Math.PI) / 180;
            const targetRotY = (orient.gamma * Math.PI) / 180;
            camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, targetRotX, 0.1);
            camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetRotY, 0.1);
        } else {
            // Auto Cruise (ALWAYS ON - HYPERSPEED)
            velocity.current.z = -100; // Constant high speed forward

            // Mouse Steer
            const mouseX = (state.mouse.x * Math.PI) / 6;
            const mouseY = (state.mouse.y * Math.PI) / 6;
            camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, -mouseX, 0.05);
            camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, -mouseY, 0.05);
        }

        // Apply Velocity
        velocity.current.multiplyScalar(0.98); // Drag
        camera.position.add(velocity.current.clone().multiplyScalar(delta));

        // --- Infinite Generation (Chunking) ---
        const currentChunkX = Math.floor(camera.position.x / CHUNK_SIZE);
        const currentChunkY = Math.floor(camera.position.y / CHUNK_SIZE);
        const currentChunkZ = Math.floor(camera.position.z / CHUNK_SIZE);

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
                />
            ))}

            {/* Space Dust & Warp Lines */}
            <group position={[camera.position.x, camera.position.y, camera.position.z]}>
                <Sparkles count={2000} scale={1000} size={2} speed={0} opacity={0.5} color="#ffffff" />
                <StarStreaks count={200} speed={200} length={20} size={0.2} color="#aaddff" />
                <StarStreaks count={500} speed={150} length={10} size={0.1} color="#ffffff" opacity={0.4} />
            </group>

            {/* HUD Overlay */}
            {target && <HUD target={target} />}
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
        <mesh>
            <sphereGeometry args={[RENDER_DISTANCE * 0.8, 64, 64]} />
            {/* @ts-ignore */}
            <nebulaShaderMaterial ref={materialRef} side={THREE.BackSide} />
        </mesh>
    );
};

const Hyperspeed = () => {
    const { isSupported } = useGyroscope();

    return (
        <div className="absolute inset-0 z-0 bg-[#020617]">
            <Canvas camera={{ position: [0, 0, 100], fov: 60, far: RENDER_DISTANCE * 2 }} dpr={[1, 1.5]}>
                <fog attach="fog" args={['#000000', RENDER_DISTANCE * 0.5, RENDER_DISTANCE]} />

                {/* Lighting */}
                <ambientLight intensity={0.1} />
                <hemisphereLight args={['#ffffff', '#000000', 0.2]} />

                <UniverseEngine />
                <NebulaSkybox />

                <EffectComposer>
                    <Bloom luminanceThreshold={1.0} mipmapBlur intensity={1.5} radius={0.4} />
                    <ToneMapping />
                    <Noise opacity={0.05} />
                    <Vignette eskil={false} offset={0.1} darkness={1.1} />
                </EffectComposer>
            </Canvas>

            {/* UI Overlay */}
            <div className="absolute bottom-8 left-8 pointer-events-none">
                <div className="text-cyan-500 font-mono text-xs bg-black/50 p-2 rounded backdrop-blur-sm border border-cyan-900/30">
                    <p>SYS_STATUS: ONLINE</p>
                    <p>MODE: {isSupported ? 'GYRO_FLIGHT' : 'AUTOPILOT'}</p>
                    <p>SECTOR: UNCHARTED</p>
                </div>
            </div>

            {/* Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                <div className="w-8 h-8 border border-cyan-500 rounded-full"></div>
                <div className="w-1 h-1 bg-cyan-500 rounded-full absolute"></div>
            </div>
        </div>
    );
};

export default Hyperspeed;
