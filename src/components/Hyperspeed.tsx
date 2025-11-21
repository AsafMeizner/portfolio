import { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise, Vignette, ToneMapping } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useGyroscope } from '../hooks/useGyroscope';
import { RENDER_DISTANCE } from './hyperspace/settings';
import { HyperspaceScene } from './hyperspace/components/HyperspaceScene';
import { NebulaSkybox } from './hyperspace/components/NebulaSkybox';

// --- UI Controls (External) ---

const Joystick = ({ onMove }: { onMove: (x: number, y: number) => void }) => {
    const stickRef = useRef<HTMLDivElement>(null);
    const baseRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });

    const handleStart = () => {
        setActive(true);
    };

    const handleEnd = () => {
        setActive(false);
        setPos({ x: 0, y: 0 });
        onMove(0, 0);
    };

    const handleMove = (clientX: number, clientY: number) => {
        if (!active || !baseRef.current) return;
        const base = baseRef.current.getBoundingClientRect();
        const centerX = base.left + base.width / 2;
        const centerY = base.top + base.height / 2;

        const maxDist = base.width / 2;

        let dx = clientX - centerX;
        let dy = clientY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > maxDist) {
            const angle = Math.atan2(dy, dx);
            dx = Math.cos(angle) * maxDist;
            dy = Math.sin(angle) * maxDist;
        }

        setPos({ x: dx, y: dy });
        onMove(dx / maxDist, dy / maxDist);
    };

    // Event listeners attached to window to handle drag outside the element
    useEffect(() => {
        const onTouchMove = (e: TouchEvent) => { if (active) handleMove(e.touches[0].clientX, e.touches[0].clientY); };
        const onMouseMove = (e: MouseEvent) => { if (active) handleMove(e.clientX, e.clientY); };
        const onUp = () => { if (active) handleEnd(); };

        if (active) {
            window.addEventListener('touchmove', onTouchMove);
            window.addEventListener('touchend', onUp);
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onUp);
        }

        return () => {
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onUp);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [active]);

    return (
        <div
            ref={baseRef}
            className="w-32 h-32 rounded-full bg-black/90 border-2 border-cyan-300 backdrop-blur-xl relative touch-none pointer-events-auto shadow-[0_0_40px_rgba(34,211,238,0.5)]"
            onMouseDown={handleStart}
            onTouchStart={handleStart}
        >
            <div
                ref={stickRef}
                className="w-12 h-12 rounded-full bg-cyan-400 shadow-[0_0_25px_rgba(34,211,238,1)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-75 border-2 border-white"
                style={{ transform: `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)` }}
            />
        </div>
    );
};

const SpeedLever = ({ value, currentValue, onChange }: { value: number, currentValue: number, onChange: (v: number) => void }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState(false);

    const handleMove = (clientY: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const height = rect.height;
        const relativeY = Math.max(0, Math.min(height, clientY - rect.top));
        // Invert: Bottom is 0, Top is 1
        const newVal = 1 - (relativeY / height);
        onChange(newVal);
    };

    useEffect(() => {
        const onTouchMove = (e: TouchEvent) => { if (dragging) handleMove(e.touches[0].clientY); };
        const onMouseMove = (e: MouseEvent) => { if (dragging) handleMove(e.clientY); };
        const onUp = () => setDragging(false);

        if (dragging) {
            window.addEventListener('touchmove', onTouchMove);
            window.addEventListener('touchend', onUp);
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onUp);
        }

        return () => {
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onUp);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [dragging]);

    return (
        <div className="flex flex-col items-center gap-2 pointer-events-auto">
            <div className="text-cyan-300 font-mono text-xs font-bold bg-black/90 px-2 rounded border border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]">WARP</div>
            <div
                ref={containerRef}
                className="w-12 h-48 bg-black/90 border-2 border-cyan-300 rounded-full relative overflow-hidden cursor-pointer touch-none shadow-[0_0_40px_rgba(34,211,238,0.5)]"
                onMouseDown={(e) => { setDragging(true); handleMove(e.clientY); }}
                onTouchStart={(e) => { setDragging(true); handleMove(e.touches[0].clientY); }}
            >
                {/* Target Speed Bar (Dimmer) */}
                <div
                    className="absolute bottom-0 left-0 w-full bg-cyan-900/50 transition-all duration-75"
                    style={{ height: `${value * 100}%` }}
                />

                {/* Actual Speed Bar (Bright) */}
                <div
                    className="absolute bottom-0 left-1/4 w-1/2 bg-gradient-to-t from-cyan-500 to-white shadow-[0_0_20px_rgba(34,211,238,0.8)]"
                    style={{ height: `${currentValue * 100}%` }}
                />

                {/* Ticks */}
                {[...Array(9)].map((_, i) => (
                    <div key={i} className="absolute w-full h-[1px] bg-cyan-200/40" style={{ bottom: `${(i + 1) * 10}%` }} />
                ))}

                {/* Target Indicator Line */}
                <div
                    className="absolute w-full h-[2px] bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,1)] transition-all duration-75"
                    style={{ bottom: `${value * 100}%` }}
                />
            </div>
            <div className="flex flex-col items-center gap-1">
                <div className="text-cyan-300 font-mono text-xs font-bold bg-black/90 px-2 rounded border border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                    TGT: {(value * 10).toFixed(1)}
                </div>
                <div className="text-white font-mono text-xs font-bold bg-cyan-600/90 px-2 rounded border border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                    ACT: {(currentValue * 10).toFixed(1)}
                </div>
            </div>
        </div>
    );
};

const Hyperspeed = () => {
    const { isSupported } = useGyroscope();

    // Lift state up for UI controls
    const joystickRef = useRef({ x: 0, y: 0 });
    const speedRef = useRef(0.1); // 0 to 1, default 0.1
    const [speedDisplay, setSpeedDisplay] = useState(0.1); // For UI updates
    const [currentSpeed, setCurrentSpeed] = useState(0.1); // Actual Speed (0-1)

    const handleSpeedChange = (v: number) => {
        speedRef.current = v;
        setSpeedDisplay(v);
    };

    const handleJoystickMove = (x: number, y: number) => {
        joystickRef.current = { x, y };
    };

    return (
        <div className="absolute inset-0 z-0 bg-[#020617]">
            <Canvas
                shadows
                dpr={[1, 2]}
                gl={{ antialias: false, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.5 }}
                camera={{ position: [0, 0, 5], fov: 75, near: 0.1, far: 20000 }}
            >
                <fog attach="fog" args={['#000000', RENDER_DISTANCE * 0.5, RENDER_DISTANCE]} />

                {/* Lighting */}
                <ambientLight intensity={0.1} />
                <hemisphereLight args={['#ffffff', '#000000', 0.2]} />

                <HyperspaceScene
                    speedDisplay={speedDisplay}
                    setSpeedDisplay={setSpeedDisplay}
                    setCurrentSpeed={setCurrentSpeed}
                    joystickRef={joystickRef}
                    speedRef={speedRef}
                />
                <NebulaSkybox />

                <EffectComposer>
                    <Bloom
                        luminanceThreshold={0.2}
                        mipmapBlur
                        intensity={2.0}
                        radius={0.8}
                        levels={8}
                    />
                    <ToneMapping />
                    <Noise opacity={0.005} />
                    <Vignette eskil={false} offset={0.1} darkness={0.6} />
                </EffectComposer>
            </Canvas>

            {/* UI Overlay - OUTSIDE CANVAS */}
            <div className="absolute bottom-8 left-8 pointer-events-none z-50">
                <div className="text-cyan-300 font-mono text-xs bg-black/90 p-4 rounded-lg backdrop-blur-md border-2 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.4)]">
                    <p className="font-bold text-lg mb-1 text-cyan-200 shadow-cyan-500/50 drop-shadow-md">SYSTEM STATUS</p>
                    <p>MODE: <span className="text-white font-bold drop-shadow-sm">{isSupported ? 'GYRO_FLIGHT' : 'MANUAL_OVERRIDE'}</span></p>
                    <p>SECTOR: <span className="text-white font-bold drop-shadow-sm">UNCHARTED</span></p>
                    <div className="mt-2 text-[10px] text-cyan-400 font-bold">
                        CONTROLS:<br />
                        [W/A/S/D] - PITCH/YAW<br />
                        [Q/E] - ROLL<br />
                        [R/F] - SPEED +/-<br />
                        [MOUSE] - LOOK/STEER
                    </div>
                </div>
            </div>

            {/* Controls - OUTSIDE CANVAS */}
            <div className="absolute bottom-8 right-8 flex gap-8 items-end pointer-events-auto z-50">
                <SpeedLever value={speedDisplay} currentValue={currentSpeed} onChange={handleSpeedChange} />
                <Joystick onMove={handleJoystickMove} />
            </div>

            {/* Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-90 z-40">
                <div className="w-8 h-8 border-2 border-cyan-300 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.8)]"></div>
                <div className="w-1 h-1 bg-cyan-300 rounded-full absolute shadow-[0_0_10px_rgba(34,211,238,1)]"></div>
            </div>
        </div>
    );
};

export default Hyperspeed;
