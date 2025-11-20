import React, { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Image, Text, Float, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';

const projects = [
    {
        title: "FRC Scouting",
        desc: "Data Intelligence",
        color: "#06b6d4",
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80"
    },
    {
        title: "Path Planner",
        desc: "Autonomous Nav",
        color: "#a855f7",
        image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80"
    },
    {
        title: "Neural Sim",
        desc: "AI Visualization",
        color: "#10b981",
        image: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=800&q=80"
    }
];

const Card = ({ index, activeIndex, onClick, project }: { index: number, activeIndex: number, onClick: () => void, project: any }) => {
    const ref = useRef<THREE.Group>(null);
    const [hovered, setHover] = useState(false);
    useCursor(hovered);

    // Calculate position based on index relative to active
    const offset = (index - activeIndex);
    const isActive = index === activeIndex;

    const { position, rotation, scale } = useSpring({
        position: [offset * 2.5, 0, isActive ? 1 : -1],
        rotation: [0, isActive ? 0 : offset * 0.5, 0],
        scale: isActive ? 1.2 : 0.8,
        config: { mass: 1, tension: 280, friction: 60 }
    });

    return (
        <animated.group
            ref={ref}
            position={position as any}
            rotation={rotation as any}
            scale={scale as any}
            onClick={onClick}
            onPointerOver={() => setHover(true)}
            onPointerOut={() => setHover(false)}
        >
            <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
                {/* Card Background */}
                <mesh>
                    <planeGeometry args={[2, 3]} />
                    <meshStandardMaterial color="#1e293b" transparent opacity={0.9} />
                </mesh>

                {/* Image */}
                <Image url={project.image} position={[0, 0.5, 0.1]} scale={[1.8, 1.8]} transparent opacity={0.8} />

                {/* Text */}
                <Text position={[0, -0.8, 0.1]} fontSize={0.15} color="white" anchorX="center" anchorY="middle">
                    {project.title}
                </Text>
                <Text position={[0, -1.1, 0.1]} fontSize={0.1} color={project.color} anchorX="center" anchorY="middle">
                    {project.desc}
                </Text>

                {/* Glow Border */}
                <mesh position={[0, 0, -0.05]}>
                    <planeGeometry args={[2.1, 3.1]} />
                    <meshBasicMaterial color={isActive ? project.color : "#334155"} />
                </mesh>
            </Float>
        </animated.group>
    );
};

const Carousel = () => {
    const [activeIndex, setActiveIndex] = useState(1);

    return (
        <group>
            {projects.map((project, i) => (
                <Card
                    key={i}
                    index={i}
                    activeIndex={activeIndex}
                    onClick={() => setActiveIndex(i)}
                    project={project}
                />
            ))}
        </group>
    );
};

const ProjectCarousel3D = () => {
    return (
        <div className="w-full h-[500px]">
            <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <Carousel />
            </Canvas>
        </div>
    );
};

export default ProjectCarousel3D;
