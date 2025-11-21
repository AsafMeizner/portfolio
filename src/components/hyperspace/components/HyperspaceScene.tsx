import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGyroscope } from '../../../hooks/useGyroscope';
import type { CelestialBody } from '../types';
import { CHUNK_SIZE, PHYSICS } from '../settings';
import { generateSystem } from '../utils/generation';
import { CelestialObject } from './CelestialObject';
import { StarStreaks } from './StarStreaks';
import { SpaceDebris } from './SpaceDebris';
import { HUD } from './HUD';
import { BackgroundStars } from './BackgroundStars';

interface HyperspaceSceneProps {
    speedDisplay: number;
    setSpeedDisplay: (v: number) => void;
    setCurrentSpeed: (v: number) => void;
    joystickRef: React.MutableRefObject<{ x: number, y: number }>;
    speedRef: React.MutableRefObject<number>;
}

export const HyperspaceScene = ({
    speedDisplay,
    setSpeedDisplay,
    setCurrentSpeed,
    joystickRef,
    speedRef
}: HyperspaceSceneProps) => {
    const { orientationRef } = useGyroscope();
    // FORCE MANUAL MODE FOR DEBUGGING - Gyro seems to be falsely reporting true or overriding controls
    const isSupported = false;
    const { camera } = useThree();
    const [systems, setSystems] = useState<CelestialBody[]>([]);
    const [target, setTarget] = useState<CelestialBody | null>(null);

    // CAMERA CENTRIC STATE
    const shipPosition = useRef(new THREE.Vector3(0, 0, 0));
    const lastChunk = useRef(new THREE.Vector3(0, 0, 0));

    // Controls State
    const keys = useRef({
        w: false, a: false, s: false, d: false,
        q: false, e: false, // Roll
        r: false, f: false, // Speed
        ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false
    });
    const mouseDrag = useRef({ active: false, x: 0, y: 0 });

    // Physics State
    const angularVelocity = useRef({ x: 0, y: 0, z: 0 });
    const smoothedSpeed = useRef(0);

    // Initial Orientation Calibration
    const initialOrientation = useRef<{ alpha: number, beta: number, gamma: number } | null>(null);
    const calibrated = useRef(false);

    // Rotation Offset (Accumulated from Joystick/WASD)
    const rotationOffset = useRef({ x: 0, y: 0, z: 0 });

    // Event Listeners for Controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'w' || e.key === 'W') keys.current.w = true;
            if (e.key === 'a' || e.key === 'A') keys.current.a = true;
            if (e.key === 's' || e.key === 'S') keys.current.s = true;
            if (e.key === 'd' || e.key === 'D') keys.current.d = true;
            if (e.key === 'q' || e.key === 'Q') keys.current.q = true;
            if (e.key === 'e' || e.key === 'E') keys.current.e = true;
            if (e.key === 'r' || e.key === 'R') keys.current.r = true;
            if (e.key === 'f' || e.key === 'F') keys.current.f = true;
            if (e.key === 'ArrowUp') keys.current.ArrowUp = true;
            if (e.key === 'ArrowDown') keys.current.ArrowDown = true;
            if (e.key === 'ArrowLeft') keys.current.ArrowLeft = true;
            if (e.key === 'ArrowRight') keys.current.ArrowRight = true;
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'w' || e.key === 'W') keys.current.w = false;
            if (e.key === 'a' || e.key === 'A') keys.current.a = false;
            if (e.key === 's' || e.key === 'S') keys.current.s = false;
            if (e.key === 'd' || e.key === 'D') keys.current.d = false;
            if (e.key === 'q' || e.key === 'Q') keys.current.q = false;
            if (e.key === 'e' || e.key === 'E') keys.current.e = false;
            if (e.key === 'r' || e.key === 'R') keys.current.r = false;
            if (e.key === 'f' || e.key === 'F') keys.current.f = false;
            if (e.key === 'ArrowUp') keys.current.ArrowUp = false;
            if (e.key === 'ArrowDown') keys.current.ArrowDown = false;
            if (e.key === 'ArrowLeft') keys.current.ArrowLeft = false;
            if (e.key === 'ArrowRight') keys.current.ArrowRight = false;
        };

        const handleMouseDown = (e: MouseEvent) => {
            mouseDrag.current.active = true;
            mouseDrag.current.x = e.clientX;
            mouseDrag.current.y = e.clientY;
        };

        const handleMouseUp = () => {
            mouseDrag.current.active = false;
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (mouseDrag.current.active) {
                const dx = e.clientX - mouseDrag.current.x;
                const dy = e.clientY - mouseDrag.current.y;

                // Drag affects angular velocity directly
                angularVelocity.current.y -= dx * 0.0005;
                angularVelocity.current.x -= dy * 0.0005;

                mouseDrag.current.x = e.clientX;
                mouseDrag.current.y = e.clientY;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [camera]);

    // Initial Generation
    useEffect(() => {
        const initialSystems = [];

        // --- HERO SYSTEM (Always spawns at start) ---
        const heroStar: CelestialBody = {
            id: 'hero-star',
            type: 'star',
            position: new THREE.Vector3(0, 0, -300), // Directly ahead
            radius: 80,
            color: '#0066ff', // Blue Giant
            orbitRadius: 0,
            children: [],
            data: { name: 'ALPHA CENTAURI PRIME', temp: '25,000 K', mass: '18 Solar Masses', class: 'O-Type Blue Giant' }
        };

        // Hero Planets
        const heroPlanet1: CelestialBody = {
            id: 'hero-planet-1',
            type: 'planet',
            position: new THREE.Vector3(0, 0, 0),
            radius: 15,
            color: '#ffaa00', // Volcanic
            orbitRadius: 150,
            orbitSpeed: 0.2,
            orbitOffset: 0,
            textureType: 3, // Volcanic
            data: { name: 'VULCAN', temp: '1200 K', mass: '2 Earths', class: 'Volcanic World' }
        };
        const heroPlanet2: CelestialBody = {
            id: 'hero-planet-2',
            type: 'planet',
            position: new THREE.Vector3(0, 0, 0),
            radius: 25,
            color: '#aaddff', // Ice/Gas
            orbitRadius: 250,
            orbitSpeed: 0.1,
            orbitOffset: 2,
            textureType: 1, // Gas
            data: { name: 'BOREAS', temp: '120 K', mass: '15 Earths', class: 'Ice Giant' }
        };
        // Moon for Planet 2
        heroPlanet2.children = [{
            id: 'hero-moon-1',
            type: 'moon',
            position: new THREE.Vector3(0, 0, 0),
            radius: 2,
            color: '#fff',
            orbitRadius: 40,
            orbitSpeed: 0.5,
            data: { name: 'MIMAS', temp: '50 K', mass: '0.01 Earths', class: 'Moon' }
        } as any];

        heroStar.children?.push(heroPlanet1, heroPlanet2);
        initialSystems.push(heroStar);

        // Generate 3x3x3 chunk grid around 0,0,0
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    if (x === 0 && y === 0 && z === 0) continue;
                    const sys = generateSystem(x, y, z);
                    if (sys) initialSystems.push(sys);
                }
            }
        }
        setSystems(initialSystems);
    }, []);

    useFrame((_state, delta) => {
        const orient = orientationRef.current;

        // --- Physics & Controls ---

        // Speed Control (R/F)
        if (keys.current.r) {
            speedRef.current = Math.min(speedRef.current + 0.5 * delta, 1.0);
            setSpeedDisplay(speedRef.current);
        }
        if (keys.current.f) {
            speedRef.current = Math.max(speedRef.current - 0.5 * delta, 0.0);
            setSpeedDisplay(speedRef.current);
        }

        // DEBUG LOGGING
        if (Math.random() < 0.01) {
            console.log('Input:', { w: keys.current.w, a: keys.current.a, s: keys.current.s, d: keys.current.d });
            console.log('AngVel:', angularVelocity.current);
            console.log('Speed:', speedRef.current);
            console.log('isSupported:', isSupported);
            console.log('CameraRot:', { x: camera.rotation.x, y: camera.rotation.y, z: camera.rotation.z });
        }

        // Smooth Speed Interpolation
        // 0 to 1 mapped to 0 to MAX_SPEED
        const targetWarpFactor = speedRef.current * 10; // 0 to 10
        const targetSpeed = PHYSICS.BASE_SPEED * targetWarpFactor;

        // Lerp current speed towards target
        smoothedSpeed.current = THREE.MathUtils.lerp(smoothedSpeed.current, targetSpeed, delta * 2.0);

        // Update UI with current actual speed (normalized 0-1)
        setCurrentSpeed(smoothedSpeed.current / (PHYSICS.BASE_SPEED * 10));

        // Input Gathering
        const joyX = joystickRef.current.x;
        const joyY = joystickRef.current.y;

        let keyX = 0;
        let keyY = 0;
        let keyZ = 0; // Roll

        if (keys.current.a || keys.current.ArrowLeft) keyX -= 1;
        if (keys.current.d || keys.current.ArrowRight) keyX += 1;
        if (keys.current.w || keys.current.ArrowUp) keyY -= 1;
        if (keys.current.s || keys.current.ArrowDown) keyY += 1;
        if (keys.current.q) keyZ += 1; // Roll Left
        if (keys.current.e) keyZ -= 1; // Roll Right

        // Total Input (Joystick + Keyboard)
        const inputX = joyX + keyX;
        const inputY = joyY + keyY;
        const inputZ = keyZ;

        // Physics-based Rotation (Acceleration + Drag)
        const ACCEL = 15.0;
        const DRAG = 0.90;

        // Apply Acceleration
        angularVelocity.current.x -= inputY * ACCEL * delta;
        angularVelocity.current.y -= inputX * ACCEL * delta;
        angularVelocity.current.z += inputZ * ACCEL * delta;

        // Apply Drag
        angularVelocity.current.x *= DRAG;
        angularVelocity.current.y *= DRAG;
        angularVelocity.current.z *= DRAG;

        if (isSupported) {
            // Mobile Gyro Control
            if (!calibrated.current && orient.alpha !== 0) {
                initialOrientation.current = { ...orient };
                calibrated.current = true;
            }

            const targetRotX = (orient.beta * Math.PI) / 180;
            const targetRotY = (orient.gamma * Math.PI) / 180;

            // Combine Gyro + Accumulated Offset
            camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, targetRotX + rotationOffset.current.x, 0.1);
            camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetRotY + rotationOffset.current.y, 0.1);
            camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, rotationOffset.current.z, 0.1);

        } else {
            // Desktop / Manual Mode - LOCAL ROTATION using QUATERNIONS
            // Create a rotation quaternion for this frame based on angular velocity
            const q = new THREE.Quaternion();
            const ROTATION_MULTIPLIER = 2.5;
            q.setFromEuler(new THREE.Euler(
                angularVelocity.current.x * delta * PHYSICS.ROTATION_SPEED * ROTATION_MULTIPLIER,
                angularVelocity.current.y * delta * PHYSICS.ROTATION_SPEED * ROTATION_MULTIPLIER,
                angularVelocity.current.z * delta * PHYSICS.ROTATION_SPEED * ROTATION_MULTIPLIER,
                'XYZ'
            ));

            // Multiply current camera quaternion by this frame's rotation
            camera.quaternion.multiply(q);
        }

        // Velocity Vector (Relative to Camera Rotation)
        // We move FORWARD (-Z)
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(camera.quaternion);
        direction.multiplyScalar(smoothedSpeed.current * delta);

        // Update Ship Position (Virtual)
        shipPosition.current.add(direction);

        // --- Infinite Generation (Chunking) ---
        const currentChunkX = Math.floor(shipPosition.current.x / CHUNK_SIZE);
        const currentChunkY = Math.floor(shipPosition.current.y / CHUNK_SIZE);
        const currentChunkZ = Math.floor(shipPosition.current.z / CHUNK_SIZE);

        if (currentChunkX !== lastChunk.current.x ||
            currentChunkY !== lastChunk.current.y ||
            currentChunkZ !== lastChunk.current.z) {

            lastChunk.current.set(currentChunkX, currentChunkY, currentChunkZ);

            // Generate new systems in radius
            const newSystems: CelestialBody[] = [];
            for (let x = currentChunkX - 1; x <= currentChunkX + 1; x++) {
                for (let y = currentChunkY - 1; y <= currentChunkY + 1; y++) {
                    for (let z = currentChunkZ - 1; z <= currentChunkZ + 1; z++) {
                        const sys = generateSystem(x, y, z);
                        if (sys) newSystems.push(sys);
                    }
                }
            }
            setSystems(newSystems);
        }
    });

    return (
        <>
            {systems.map(sys => (
                <CelestialObject
                    key={sys.id}
                    body={sys}
                    setTarget={setTarget}
                    shipPosition={shipPosition.current}
                />
            ))}

            {/* Space Dust & Warp Lines - STATIC relative to camera (0,0,0) */}
            <group position={[0, 0, 0]}>
                <SpaceDebris />
                <BackgroundStars />
                {/* StarStreaks now handles its own rotation/orientation based on camera movement */}
                <StarStreaks count={400} speed={speedDisplay} length={5} size={0.2} color="#aaddff" opacity={Math.min(Math.max(0, (speedDisplay - 0.1) * 2), 1)} />
                <StarStreaks count={800} speed={speedDisplay * 0.8} length={3} size={0.1} color="#ffffff" opacity={Math.min(Math.max(0, (speedDisplay - 0.1) * 2), 0.4)} />
            </group>

            {/* HUD Overlay */}
            {target && <HUD target={target} onClose={() => setTarget(null)} />}
        </>
    );
};
