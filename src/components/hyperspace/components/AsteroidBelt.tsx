import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AsteroidBeltProps {
    radius: number; // Mean radius
    width: number; // Width of the belt
    count: number;
    size: number;
    color: string;
    arcLength?: number; // Fraction of orbit covered (0-1), default 1.0 = full orbit
    beltSpeed?: number; // Speed of belt rotation around orbit, default 0.02
    beltOffset?: number; // Initial angular offset in radians, default 0
}

export const AsteroidBelt = ({
    radius,
    width,
    count,
    size,
    color,
    arcLength = 1.0, // Default to full orbit
    beltSpeed = 0.02, // Default slow rotation
    beltOffset = 0 // Default no offset
}: AsteroidBeltProps) => {
    const groupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Generate random asteroids within the specified arc
    const asteroids = useMemo(() => {
        const temp = [];
        const innerRadius = radius - width / 2;
        const outerRadius = radius + width / 2;
        const arcRadians = arcLength * Math.PI * 2; // Convert to radians

        for (let i = 0; i < count; i++) {
            // Distribute asteroids only within the specified arc
            const angle = (i / count) * arcRadians + Math.random() * 0.5; // Even distribution + jitter
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
    }, [radius, width, count, size, arcLength]);

    useFrame((state) => {
        if (!meshRef.current || !groupRef.current) return;

        const t = state.clock.getElapsedTime();

        // Update individual asteroid rotations (tumbling)
        asteroids.forEach((data, i) => {
            const { position, rotation, scale } = data;

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

        // Rotate the entire belt group around the orbit
        groupRef.current.rotation.y = beltOffset + t * beltSpeed;
    });

    return (
        <group ref={groupRef}>
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
        </group>
    );
};
