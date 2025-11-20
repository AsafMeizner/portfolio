import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useGyroscope } from '../hooks/useGyroscope';

const StarField = (props: any) => {
    const ref = useRef<THREE.Points>(null);
    const { orientation, isSupported } = useGyroscope();
    const [scrollSpeed, setScrollSpeed] = useState(0);
    const lastScrollY = useRef(0);
    const scrollVelocity = useRef(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const delta = currentScrollY - lastScrollY.current;
            scrollVelocity.current = Math.abs(delta);
            lastScrollY.current = currentScrollY;

            // Update scroll speed for trail effect
            setScrollSpeed(Math.min(scrollVelocity.current * 0.1, 5));
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        // Decay scroll speed
        const interval = setInterval(() => {
            scrollVelocity.current *= 0.9;
            setScrollSpeed(Math.min(scrollVelocity.current * 0.1, 5));
        }, 50);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearInterval(interval);
        };
    }, []);

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

            // Add scroll-based z-rotation for hyperspeed effect
            if (scrollSpeed > 0.5) {
                ref.current.rotation.z += delta * scrollSpeed;
            }
        }
    });

    // Calculate point size based on scroll speed for trail effect
    const pointSize = 0.002 + scrollSpeed * 0.001;

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
                <PointMaterial
                    transparent
                    color="#06b6d4"
                    size={pointSize}
                    sizeAttenuation={true}
                    depthWrite={false}
                    opacity={scrollSpeed > 0.5 ? 0.8 : 1}
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
