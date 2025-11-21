import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CelestialBody } from '../types';

interface AsteroidBeltProps {
    body: CelestialBody;
}

export const AsteroidBelt = ({ body }: AsteroidBeltProps) => {
    const ref = useRef<THREE.Group>(null);
    const count = 1000;

    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const radius = body.orbitRadius || 200;
        const width = 40;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = radius + (Math.random() - 0.5) * width;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            const y = (Math.random() - 0.5) * 10;

            pos[i * 3] = x;
            pos[i * 3 + 1] = y;
            pos[i * 3 + 2] = z;
        }
        return pos;
    }, [body.orbitRadius]);

    useFrame(() => {
        if (ref.current) {
            ref.current.rotation.y += 0.0005;
        }
    });

    return (
        <group ref={ref}>
            <points>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={count}
                        array={positions}
                        itemSize={3}
                        args={[positions, 3]}
                    />
                </bufferGeometry>
                <pointsMaterial size={0.8} color="#888" sizeAttenuation={true} />
            </points>
        </group>
    );
};
