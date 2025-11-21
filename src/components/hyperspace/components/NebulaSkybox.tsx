import { useRef } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { NebulaShaderMaterial } from '../shaders';
import { RENDER_DISTANCE } from '../settings';

extend({ NebulaShaderMaterial });

export const NebulaSkybox = () => {
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
