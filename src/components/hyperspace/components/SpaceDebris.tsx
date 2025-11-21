import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const SpaceDebris = () => {
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
