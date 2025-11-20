import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, TrackballControls, Float } from '@react-three/drei';
import * as THREE from 'three';

const skills = [
    "React", "TypeScript", "Node.js", "Three.js", "Python",
    "Java", "C++", "AWS", "Docker", "GraphQL",
    "MongoDB", "PostgreSQL", "Redis", "Next.js", "Tailwind",
    "Git", "CI/CD", "Linux", "Figma", "Blender"
];

const Word = ({ children, position }: { children: string, position: THREE.Vector3 }) => {
    const ref = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame(({ camera }) => {
        if (ref.current) {
            // Make text always face the camera
            ref.current.quaternion.copy(camera.quaternion);
        }
    });

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <Text
                ref={ref}
                position={position}
                fontSize={0.5}
                color={hovered ? "#06b6d4" : "#e2e8f0"}
                anchorX="center"
                anchorY="middle"
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
                onClick={() => console.log(`Clicked ${children}`)}
            >
                {children}
            </Text>
        </Float>
    );
};

const Cloud = ({ radius = 4 }: { radius?: number }) => {
    // Create a spherical distribution of points
    const words = useMemo(() => {
        const temp = [];
        const phiSpan = Math.PI * (3 - Math.sqrt(5)); // Golden angle

        for (let i = 0; i < skills.length; i++) {
            const y = 1 - (i / (skills.length - 1)) * 2; // y goes from 1 to -1
            const radiusAtY = Math.sqrt(1 - y * y); // radius at y
            const theta = phiSpan * i; // golden angle increment

            const x = Math.cos(theta) * radiusAtY;
            const z = Math.sin(theta) * radiusAtY;

            temp.push([new THREE.Vector3(x * radius, y * radius, z * radius), skills[i]] as const);
        }
        return temp;
    }, [radius]);

    return (
        <group>
            {words.map(([pos, word], index) => (
                <Word key={index} position={pos}>{word}</Word>
            ))}
        </group>
    );
};

const SkillSphere = () => {
    return (
        <div className="w-full h-[500px] relative">
            <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
                <fog attach="fog" args={['#020617', 5, 15]} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />

                <Cloud radius={4} />

                <TrackballControls noZoom noPan rotateSpeed={2} />
            </Canvas>
        </div>
    );
};

export default SkillSphere;
