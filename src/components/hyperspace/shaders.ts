import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Common Noise Function (Simplex)
const NOISE_GLSL = `
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
`;

export const StarShaderMaterial = shaderMaterial(
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

    ${NOISE_GLSL}

    void main() {
        float n = snoise(vPosition * noiseScale + time * 0.5);
        float n2 = snoise(vPosition * (noiseScale * 2.0) - time * 0.2);
        
        float brightness = 1.0 + n * 0.3 + n2 * 0.15;
        
        // Limb darkening
        float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        
        vec3 finalColor = color * brightness;
        finalColor += color * fresnel * 0.5; // Corona glow
        
        // Clamp to prevent NaN values that cause black boxes with bloom
        finalColor = clamp(finalColor, vec3(0.0), vec3(65504.0));
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
    `
);

export const PlanetShaderMaterial = shaderMaterial(
    {
        time: 0,
        baseColor: new THREE.Color(0.5, 0.5, 0.5),
        type: 0, // 0: Rocky, 1: Gas, 2: Ice, 3: Volcanic
        lightDir: new THREE.Vector3(1, 0, 1),
        viewPos: new THREE.Vector3(0, 0, 0),
        seed: 0,
        opacity: 1.0
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
    uniform float opacity;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;

    ${NOISE_GLSL}

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

        // Clamp to prevent NaN values that cause black boxes with bloom
        // See: https://github.com/mrdoob/three.js/issues/27878
        finalColor = clamp(finalColor, vec3(0.0), vec3(65504.0));
        
        // Additional NaN safety check
        if (any(isnan(finalColor))) {
            finalColor = vec3(0.0);
        }

        gl_FragColor = vec4(finalColor, opacity);
    }
    `
);

export const NebulaShaderMaterial = shaderMaterial(
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

    ${NOISE_GLSL}

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
