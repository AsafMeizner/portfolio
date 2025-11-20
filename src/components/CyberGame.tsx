import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, PerspectiveCamera, Stars, Sparkles, Trail } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom, ChromaticAberration, Scanline } from '@react-three/postprocessing';
import { Maximize2 } from 'lucide-react';
import { useGyroscope } from '../hooks/useGyroscope';
import { GameModal } from './GameModal';

// --- Game Constants ---
const TUNNEL_LENGTH = 100;
const BASE_SPEED = 0.4;
const BOOST_SPEED = 0.8;
const OBSTACLE_COUNT = 12;
const PICKUP_COUNT = 4;
const LANE_WIDTH = 2.5;

// --- Components ---

const Ship = ({ position, isHit, isBoosting }: { position: [number, number, number], isHit: boolean, isBoosting: boolean }) => {
    const mesh = useRef<THREE.Group>(null);

    useFrame(() => {
        if (mesh.current) {
            // Tilt ship based on movement
            mesh.current.rotation.z = THREE.MathUtils.lerp(mesh.current.rotation.z, -position[0] * 0.5, 0.1);
            mesh.current.rotation.x = THREE.MathUtils.lerp(mesh.current.rotation.x, position[1] * 0.2, 0.1);
        }
    });

    return (
        <group ref={mesh} position={position}>
            <Trail width={1} length={8} color={new THREE.Color(isBoosting ? "#00ffff" : "#06b6d4")} attenuation={(t) => t * t}>
                <Float speed={5} rotationIntensity={0.2} floatIntensity={0.2}>
                    {/* Main Body */}
                    <mesh rotation={[0, Math.PI, 0]}>
                        <coneGeometry args={[0.5, 1.5, 4]} />
                        <meshStandardMaterial
                            color={isHit ? "red" : (isBoosting ? "#cyan" : "#06b6d4")}
                            emissive={isHit ? "red" : (isBoosting ? "#00ffff" : "#06b6d4")}
                            emissiveIntensity={isHit ? 2 : (isBoosting ? 2 : 0.5)}
                            wireframe
                        />
                    </mesh>
                    {/* Engine Glow */}
                    <pointLight position={[0, 0, 1]} distance={5} intensity={isBoosting ? 5 : 2} color={isBoosting ? "#00ffff" : "#06b6d4"} />
                </Float>
            </Trail>
        </group>
    );
};

const Obstacle = ({ position, z, rotationSpeed }: { position: [number, number, number], z: number, rotationSpeed: number }) => {
    const mesh = useRef<THREE.Mesh>(null);

    useFrame(() => {
        if (mesh.current) {
            mesh.current.rotation.z += rotationSpeed;
            mesh.current.rotation.x += rotationSpeed * 0.5;
        }
    });

    return (
        <mesh ref={mesh} position={[position[0], position[1], z]}>
            <octahedronGeometry args={[0.8]} />
            <meshStandardMaterial
                color="#ef4444"
                emissive="#ef4444"
                emissiveIntensity={1.5}
                wireframe
            />
        </mesh>
    );
};

const Pickup = ({ position, z }: { position: [number, number, number], z: number }) => {
    const mesh = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (mesh.current) {
            mesh.current.rotation.y += 0.05;
            mesh.current.position.y += Math.sin(state.clock.elapsedTime * 5) * 0.01;
        }
    });

    return (
        <mesh ref={mesh} position={[position[0], position[1], z]}>
            <dodecahedronGeometry args={[0.4]} />
            <meshStandardMaterial
                color="#10b981"
                emissive="#10b981"
                emissiveIntensity={2}
                wireframe
            />
        </mesh>
    );
};

const Tunnel = ({ speed }: { speed: number }) => {
    const mesh = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);

    useFrame((state) => {
        if (mesh.current) {
            mesh.current.rotation.z += 0.002 * speed;
        }
        // Pulse effect
        if (materialRef.current) {
            materialRef.current.emissiveIntensity = 0.1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        }
    });

    return (
        <mesh ref={mesh} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[12, 12, TUNNEL_LENGTH, 24, 32, true]} />
            <meshStandardMaterial
                ref={materialRef}
                side={THREE.BackSide}
                color="#0f172a"
                emissive="#06b6d4"
                emissiveIntensity={0.1}
                wireframe
                transparent
                opacity={0.15}
            />
        </mesh>
    );
};

const GameLogic = ({ onGameOver, onScore }: { onGameOver: () => void, onScore: (s: number) => void }) => {
    const { mouse, viewport, camera } = useThree();
    const { orientationRef, isSupported } = useGyroscope();
    const [shipPos, setShipPos] = useState<[number, number, number]>([0, 0, 0]);
    const [obstacles, setObstacles] = useState<{ x: number, y: number, z: number, rot: number }[]>([]);
    const [pickups, setPickups] = useState<{ x: number, y: number, z: number }[]>([]);
    const [isHit, setIsHit] = useState(false);
    const [isBoosting, setIsBoosting] = useState(false);
    const [shake, setShake] = useState(0);

    // Input handling for boost
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') setIsBoosting(true);
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') setIsBoosting(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Spawn initial objects
    useEffect(() => {
        const initialObstacles = [];
        for (let i = 0; i < OBSTACLE_COUNT; i++) {
            initialObstacles.push({
                x: (Math.random() - 0.5) * LANE_WIDTH * 4,
                y: (Math.random() - 0.5) * LANE_WIDTH * 3,
                z: -20 - i * 15,
                rot: (Math.random() - 0.5) * 0.1
            });
        }
        setObstacles(initialObstacles);

        const initialPickups = [];
        for (let i = 0; i < PICKUP_COUNT; i++) {
            initialPickups.push({
                x: (Math.random() - 0.5) * LANE_WIDTH * 4,
                y: (Math.random() - 0.5) * LANE_WIDTH * 3,
                z: -30 - i * 25
            });
        }
        setPickups(initialPickups);
    }, []);

    useFrame((_state, delta) => {
        if (isHit) {
            // Screen shake decay
            if (shake > 0) {
                camera.position.x = (Math.random() - 0.5) * shake;
                camera.position.y = (Math.random() - 0.5) * shake;
                setShake(prev => Math.max(0, prev - delta * 2));
            }
            return;
        }

        const currentSpeed = isBoosting ? BOOST_SPEED : BASE_SPEED;
        const orientation = orientationRef.current;

        // Ship Movement - Use gyroscope on mobile, mouse on desktop
        let targetX, targetY;
        if (isSupported && Math.abs(orientation.gamma) > 5) {
            // Mobile - gyroscope control
            targetX = THREE.MathUtils.clamp((orientation.gamma / 45) * (viewport.width / 2.5), -(viewport.width / 2.5), (viewport.width / 2.5));
            targetY = THREE.MathUtils.clamp(((orientation.beta - 45) / 45) * (viewport.height / 2.5), -(viewport.height / 2.5), (viewport.height / 2.5));
        } else {
            // Desktop - mouse control
            targetX = (mouse.x * viewport.width) / 2.5;
            targetY = (mouse.y * viewport.height) / 2.5;
        }

        setShipPos(prev => [
            THREE.MathUtils.lerp(prev[0], targetX, 0.1),
            THREE.MathUtils.lerp(prev[1], targetY, 0.1),
            0
        ]);

        // Move Obstacles
        setObstacles(prev => {
            const newObstacles = prev.map(obs => ({ ...obs, z: obs.z + currentSpeed }));
            const activeObstacles = newObstacles.filter(obs => obs.z < 5);

            while (activeObstacles.length < OBSTACLE_COUNT) {
                activeObstacles.push({
                    x: (Math.random() - 0.5) * LANE_WIDTH * 4,
                    y: (Math.random() - 0.5) * LANE_WIDTH * 3,
                    z: Math.min(...activeObstacles.map(o => o.z)) - (15 + Math.random() * 10),
                    rot: (Math.random() - 0.5) * 0.1
                });
                if (!isHit) {
                    onScore(isBoosting ? 2 : 1);
                }
            }
            return activeObstacles;
        });

        // Move Pickups
        setPickups(prev => {
            const newPickups = prev.map(p => ({ ...p, z: p.z + currentSpeed }));
            const activePickups = newPickups.filter(p => p.z < 5);

            while (activePickups.length < PICKUP_COUNT) {
                activePickups.push({
                    x: (Math.random() - 0.5) * LANE_WIDTH * 4,
                    y: (Math.random() - 0.5) * LANE_WIDTH * 3,
                    z: Math.min(...activePickups.map(p => p.z)) - (25 + Math.random() * 20)
                });
            }
            return activePickups;
        });

        // Collision Detection - Obstacles
        obstacles.forEach(obs => {
            const dx = obs.x - shipPos[0];
            const dy = obs.y - shipPos[1];
            const dz = obs.z - shipPos[2];
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (distance < 1.3) {
                setIsHit(true);
                setShake(1); // Trigger shake
                setTimeout(onGameOver, 1000); // Delay game over for effect
            }
        });

        // Collision Detection - Pickups
        setPickups(prev => {
            return prev.filter(p => {
                const dx = p.x - shipPos[0];
                const dy = p.y - shipPos[1];
                const dz = p.z - shipPos[2];
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (distance < 1.5) {
                    onScore(50); // Bonus points
                    return false; // Remove pickup
                }
                return true;
            });
        });
    });

    return (
        <>
            <Ship position={shipPos} isHit={isHit} isBoosting={isBoosting} />
            {obstacles.map((obs, i) => (
                <Obstacle key={`obs-${i}`} position={[obs.x, obs.y, 0]} z={obs.z} rotationSpeed={obs.rot} />
            ))}
            {pickups.map((p, i) => (
                <Pickup key={`pickup-${i}`} position={[p.x, p.y, 0]} z={p.z} />
            ))}
            <Tunnel speed={isBoosting ? 2 : 1} />
        </>
    );
};

const CyberGame = () => {
    const { isSupported } = useGyroscope();
    const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
    const [score, setScore] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleScore = (points: number) => {
        if (gameState === 'playing') {
            setScore(prev => prev + points);
        }
    };

    // 'M' key handler for fullscreen
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'm' || e.key === 'M') {
                setIsFullscreen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    const gameContent = (
        <div className="w-full h-[600px] bg-black relative overflow-hidden rounded-xl border border-cyan-900/50 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
            {/* UI Overlay */}
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-bold text-white font-mono">CYBER RUNNER</h3>
                        <p className="text-cyan-400 text-sm font-mono">
                            STATUS: {gameState === 'playing' ? 'ACTIVE' : 'STANDBY'}
                        </p>
                        {gameState === 'playing' && (
                            <p className="text-slate-400 text-xs font-mono mt-2 animate-pulse">
                                HOLD [SPACE] TO BOOST
                            </p>
                        )}
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="text-right">
                            <p className="text-4xl font-bold text-white font-mono">{score.toString().padStart(6, '0')}</p>
                            <p className="text-slate-400 text-xs font-mono">SCORE</p>
                        </div>
                        {!isFullscreen && (
                            <button
                                onClick={() => setIsFullscreen(true)}
                                className="pointer-events-auto p-2 bg-slate-900/80 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-500 rounded-lg transition-colors group"
                                aria-label="Fullscreen"
                            >
                                <Maximize2 className="text-slate-400 group-hover:text-white transition-colors" size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {gameState !== 'playing' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto z-20">
                        <div className="text-center">
                            <h2 className="text-5xl font-bold text-white mb-4 glitch-text">
                                {gameState === 'start' ? 'INITIALIZE' : 'SYSTEM FAILURE'}
                            </h2>
                            <p className="text-cyan-400 mb-8 font-mono">
                                {gameState === 'start' ? 'NAVIGATE THE DATA TUNNEL' : `FINAL SCORE: ${score}`}
                            </p>
                            <button
                                onClick={() => { setGameState('playing'); setScore(0); }}
                                className="px-8 py-3 bg-cyan-500 text-black font-bold rounded hover:bg-cyan-400 transition-colors font-mono"
                            >
                                {gameState === 'start' ? 'START MISSION' : 'REBOOT SYSTEM'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <Canvas dpr={[1, 1.5]}>
                <PerspectiveCamera makeDefault position={[0, 0, 5]} />
                <color attach="background" args={['#020617']} />
                <fog attach="fog" args={['#020617', 5, 40]} />

                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />

                <Stars radius={100} depth={50} count={isSupported ? 2000 : 5000} factor={4} saturation={0} fade speed={2} />
                <Sparkles count={isSupported ? 50 : 200} scale={12} size={2} speed={0.4} opacity={0.5} color="#06b6d4" />

                {gameState === 'playing' && (
                    <GameLogic
                        onGameOver={() => setGameState('gameover')}
                        onScore={handleScore}
                    />
                )}

                {!isSupported && (
                    <EffectComposer>
                        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} radius={0.5} />
                        <ChromaticAberration offset={[0.002, 0.002]} />
                        <Scanline density={1.5} opacity={0.3} />
                    </EffectComposer>
                )}
            </Canvas>
        </div>
    );

    return (
        <>
            {!isFullscreen && gameContent}
            <GameModal isOpen={isFullscreen} onClose={() => setIsFullscreen(false)}>
                {gameContent}
            </GameModal>
        </>
    );
};

export default CyberGame;
