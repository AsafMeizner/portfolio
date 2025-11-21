import { useRef, useState } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import type { CelestialBody } from '../types';
import { PlanetShaderMaterial, StarShaderMaterial } from '../shaders';
import { AsteroidBelt } from './AsteroidBelt';

// Extend custom shaders
extend({ PlanetShaderMaterial, StarShaderMaterial });

interface CelestialObjectProps {
    body: CelestialBody;
    setTarget: (b: CelestialBody) => void;
    shipPosition: THREE.Vector3;
}

export const CelestialObject = ({ body, setTarget, shipPosition }: CelestialObjectProps) => {
    const ref = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<any>(null);
    const { camera } = useThree();


    const [opacity, setOpacity] = useState(0);

    // Random Orbital Inclination
    const orbitTilt = useRef(new THREE.Euler(
        (Math.random() - 0.5) * 1.0, // Pitch tilt
        (Math.random() - 0.5) * 1.0, // Yaw tilt
        0
    )).current;

    useFrame((state) => {
        const t = state.clock.getElapsedTime();

        // Fade In Effect
        if (opacity < 1) {
            setOpacity(prev => Math.min(prev + 0.02, 1));
        }

        // Update position based on ship movement (Floating Origin)
        if (ref.current) {
            if (body.type === 'star') {
                // Top level system: Position is absolute world coord relative to ship
                ref.current.position.copy(body.position).sub(shipPosition);
            } else {
                // Child (Planet/Moon): Position is relative to parent
                // Orbit Logic
                if (body.orbitRadius) {
                    const angle = t * (body.orbitSpeed || 0.1) + (body.orbitOffset || 0);
                    ref.current.position.x = Math.cos(angle) * body.orbitRadius;
                    ref.current.position.z = Math.sin(angle) * body.orbitRadius;
                }
            }
        }

        // Shader Updates
        if (materialRef.current) {
            materialRef.current.time = t;
            // Update opacity uniform if supported or material opacity
            if (materialRef.current.uniforms && materialRef.current.uniforms.opacity) {
                materialRef.current.uniforms.opacity.value = opacity;
            }

            if (body.type === 'planet' || body.type === 'moon') {
                if (ref.current) {
                    // Light dir is from Star (0,0,0 local) to Planet
                    // For a child, parent is at 0,0,0 local.
                    // Light source is at 0,0,0 local (Star).
                    // So light direction is simply -position (normalized).
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
    });

    const isRoot = body.type === 'star';

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

    if (body.type === 'asteroid-belt') {
        return (
            <group ref={ref} position={isRoot ? undefined : body.position}>
                {/* Render Asteroid Belt */}
                <AsteroidBelt
                    radius={body.orbitRadius || 100}
                    width={body.radius || 20}
                    count={800}
                    size={0.5}
                    color={body.color}
                />
            </group>
        );
    }

    return (
        <group>
            {/* Orbital Plane Wrapper - Applies Inclination */}
            <group rotation={isRoot ? [0, 0, 0] : orbitTilt}>

                {/* Orbit Line (Static relative to parent, centered at 0,0,0) */}
                {body.orbitRadius && (
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[body.orbitRadius - 0.2, body.orbitRadius + 0.2, 128]} />
                        <meshBasicMaterial color={body.color} transparent opacity={0.1} side={THREE.DoubleSide} />
                    </mesh>
                )}

                {/* The Body Itself (Animated Position) */}
                <group ref={ref} position={isRoot ? undefined : body.position}>
                    <group ref={meshRef}>
                        <mesh
                            onClick={(e) => { e.stopPropagation(); setTarget(body); }}
                            onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
                            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
                        >
                            <sphereGeometry args={[body.radius, 64, 64]} />
                            {body.type === 'star' ? (
                                // @ts-ignore
                                <starShaderMaterial ref={materialRef} color={new THREE.Color(body.color)} noiseScale={1.0} transparent opacity={opacity} />
                            ) : (
                                // @ts-ignore
                                <planetShaderMaterial
                                    ref={materialRef}
                                    baseColor={new THREE.Color(body.color)}
                                    type={body.textureType || 0}
                                    seed={Math.random() * 100}
                                    transparent
                                    opacity={opacity}
                                />
                            )}
                        </mesh>
                        {/* Star Light */}
                        {body.type === 'star' && (
                            <pointLight intensity={8} distance={1000} decay={0.8} color={body.color} castShadow={false} />
                        )}
                    </group>

                    {/* Children (Recursion) - Rendered relative to THIS body */}
                    {body.children?.map(child => (
                        <CelestialObject
                            key={child.id}
                            body={child}
                            setTarget={setTarget}
                            shipPosition={shipPosition}
                        />
                    ))}
                </group>
            </group>
        </group>
    );
};
