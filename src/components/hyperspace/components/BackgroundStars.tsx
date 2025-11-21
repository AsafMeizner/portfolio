import { useMemo } from 'react';
import * as THREE from 'three';

const StarPointShader = {
    vertexShader: `
        attribute float size;
        varying float vAlpha;
        void main() {
            vAlpha = size; // Use size as alpha/brightness variation
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z); // Size attenuation
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        varying float vAlpha;
        void main() {
            // Circular particle
            vec2 coord = gl_PointCoord - vec2(0.5);
            if(length(coord) > 0.5) discard;
            
            // Soft edge
            float strength = 1.0 - (length(coord) * 2.0);
            strength = pow(strength, 2.0);
            
            gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha * strength);
        }
    `
};

export const BackgroundStars = ({ count = 2000 }) => {
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const r = 800 + Math.random() * 800; // Distant shell
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = r * Math.cos(phi);
        }
        return pos;
    }, [count]);

    const sizes = useMemo(() => {
        const s = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            s[i] = Math.random() * 2.0 + 0.5;
        }
        return s;
    }, [count]);

    return (
        <points>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                />
                <bufferAttribute
                    attach="attributes-size"
                    args={[sizes, 1]}
                />
            </bufferGeometry>
            <shaderMaterial
                args={[StarPointShader]}
                transparent
                depthWrite={false}
                depthTest={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};
