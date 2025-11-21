import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AsteroidBeltProps {
    radius: number; // Mean radius
    width: number; // Width of the belt
    count: number;
    size: number;
    color: string;
}

export const AsteroidBelt = ({ radius, width, count, size, color }: AsteroidBeltProps) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Generate random asteroids
    const asteroids = useMemo(() => {
        const temp = [];
        const innerRadius = radius - width / 2;
        const outerRadius = radius + width / 2;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5; // Even distribution + jitter
            const r = innerRadius + Math.random() * (outerRadius - innerRadius);

            // Random height deviation (flat belt)
            const y = (Math.random() - 0.5) * (width * 0.2);

            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;

            const scale = size * (0.5 + Math.random() * 1.0);

            const rotation = [
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            ];

            temp.push({ position: [x, y, z], rotation, scale });
        }
        return temp;
    }, [radius, width, count, size]);

    useFrame((state) => {
        if (!meshRef.current) return;

        const t = state.clock.getElapsedTime();

        asteroids.forEach((data, i) => {
            const { position, rotation, scale } = data;

            // Orbit rotation (simplified: rotate the whole mesh or individual? 
            // Rotating individual is expensive. Rotating the group is better.)
            // But for now, let's just place them.

            dummy.position.set(position[0] as number, position[1] as number, position[2] as number);
            dummy.rotation.set(
                rotation[0] as number + t * 0.05,
                rotation[1] as number + t * 0.05,
                rotation[2] as number + t * 0.05
            );
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();

            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;

        // Rotate the entire belt slowly
        meshRef.current.rotation.y = t * 0.02;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
                color={color}
                roughness={0.8}
                metalness={0.2}
                emissive={new THREE.Color(color)}
                emissiveIntensity={0.2}
            />
        </instancedMesh>
    );
};
