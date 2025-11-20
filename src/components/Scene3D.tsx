import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars, MeshDistortMaterial, Sparkles, Torus, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const Core = () => {
    const mesh = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (mesh.current) {
            const t = state.clock.getElapsedTime();
            mesh.current.rotation.x = t * 0.2;
            mesh.current.rotation.y = t * 0.3;
        }
    });

    return (
        <Float speed={2} rotationIntensity={1} floatIntensity={1}>
            <mesh ref={mesh} scale={1.5}>
                <icosahedronGeometry args={[1, 15]} />
                <MeshDistortMaterial
                    color="#06b6d4"
                    emissive="#06b6d4"
                    emissiveIntensity={0.5}
                    roughness={0.1}
                    metalness={1}
                    distort={0.4}
                    speed={2}
                />
            </mesh>
        </Float>
    );
};

const Ring = ({ radius, speed, color, rotation }: { radius: number, speed: number, color: string, rotation: [number, number, number] }) => {
    const ref = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (ref.current) {
            ref.current.rotation.z += speed * 0.01;
            ref.current.rotation.x += speed * 0.005;
        }
    });

    return (
        <group rotation={rotation}>
            <Torus ref={ref} args={[radius, 0.02, 16, 100]}>
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} />
            </Torus>
        </group>
    );
};

const SceneContent = () => {
    return (
        <>
            <ambientLight intensity={0.2} />
            <pointLight position={[10, 10, 10]} intensity={1.5} color="#06b6d4" />
            <pointLight position={[-10, -10, -10]} intensity={1.5} color="#a855f7" />

            <Stars radius={100} depth={50} count={7000} factor={4} saturation={0} fade speed={1} />

            <Core />

            <Ring radius={2.5} speed={1} color="#06b6d4" rotation={[Math.PI / 3, 0, 0]} />
            <Ring radius={3.2} speed={-0.8} color="#a855f7" rotation={[0, Math.PI / 4, 0]} />
            <Ring radius={4} speed={0.5} color="#ef4444" rotation={[Math.PI / 2, Math.PI / 6, 0]} />

            <Sparkles count={200} scale={10} size={2} speed={0.4} opacity={0.5} color="#06b6d4" />
        </>
    );
};

const Scene3D = () => {
    return (
        <div className="w-full h-[500px] bg-black relative overflow-hidden rounded-xl border border-slate-800 shadow-[0_0_50px_rgba(6,182,212,0.1)]">
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <h3 className="text-2xl font-bold text-white">Neural Core</h3>
                <p className="text-slate-400 text-sm">Interactive 3D Environment</p>
            </div>

            <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
                <SceneContent />
                <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
            </Canvas>
        </div>
    );
};

export default Scene3D;
