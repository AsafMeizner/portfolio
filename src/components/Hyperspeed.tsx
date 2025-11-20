import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useGyroscope } from '../hooks/useGyroscope';

const StarField = (props: any) => {
    const ref = useRef<THREE.Points>(null);
    const { orientation, isSupported } = useGyroscope();

    const [sphere] = useMemo(() => {
        const positions = new Float32Array(5000 * 3);
        for (let i = 0; i < 5000; i++) {
            const r = 1.5 * Math.random(); // Radius
            const theta = 2 * Math.PI * Math.random(); // Angle
            const phi = Math.acos(2 * Math.random() - 1); // Angle

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);
        }
        return [positions];
    }, []);

    useFrame((_state, delta) => {
        if (ref.current) {
            if (isSupported && Math.abs(orientation.beta) > 0 && Math.abs(orientation.gamma) > 0) {
                // Use gyroscope on mobile
                const targetX = (orientation.beta / 180) * Math.PI;
                const targetY = (orientation.gamma / 180) * Math.PI;

                ref.current.rotation.x += (targetX - ref.current.rotation.x) * 0.05;
                ref.current.rotation.y += (targetY - ref.current.rotation.y) * 0.05;
            } else {
                // Default animation on desktop
                ref.current.rotation.x -= delta / 10;
                ref.current.rotation.y -= delta / 15;
            }
        }
    });

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
                <PointMaterial
                    transparent
                    color="#06b6d4"
                    size={0.002}
                    sizeAttenuation={true}
                    depthWrite={false}
                />
            </Points>
        </group>
    );
};

const Hyperspeed = () => {
    return (
        <div className="absolute inset-0 z-0">
            <Canvas camera={{ position: [0, 0, 1] }}>
                <StarField />
            </Canvas>
        </div>
    );
};

export default Hyperspeed;
