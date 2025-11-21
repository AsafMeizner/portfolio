import { Html } from '@react-three/drei';
import { useEffect } from 'react';
import * as THREE from 'three';
import type { CelestialBody } from '../types';

interface HUDProps {
    target: CelestialBody | null;
    onClose: () => void;
    shipPosition: THREE.Vector3;
}

export const HUD = ({ target, onClose, shipPosition }: HUDProps) => {
    if (!target) return null;

    // Reset cursor when HUD unmounts to prevent stuck pointer cursor
    useEffect(() => {
        return () => {
            document.body.style.cursor = 'auto';
        };
    }, []);

    // Calculate position relative to camera (camera-centric rendering)
    let displayPosition: THREE.Vector3;

    if (target.type === 'star') {
        // For stars, position is already world position, subtract ship position
        displayPosition = target.position.clone().sub(shipPosition);
    } else {
        // For planets/moons, we need to get their world position
        // They are rendered relative to their parent, so we just use their current position
        displayPosition = target.position.clone();
    }

    return (
        <Html
            position={displayPosition}
            center
            zIndexRange={[100, 0]}
            style={{ pointerEvents: 'auto' }}
        >
            <div
                id={`hud-${target.id}`}
                className="w-80 bg-black/90 border-2 border-cyan-500 p-5 rounded-lg backdrop-blur-md text-cyan-400 font-mono text-base pointer-events-auto select-none shadow-[0_0_30px_rgba(6,182,212,0.5)]"
                style={{ minWidth: '280px' }}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="absolute top-2 right-2 text-cyan-600 hover:text-cyan-300 w-6 h-6 flex items-center justify-center"
                >
                    ✕
                </button>
                <div className="flex justify-between items-center border-b border-cyan-900/50 pb-2 mb-2">
                    <span className="font-bold text-lg text-white">{target.data.name}</span>
                    <span className="text-xs bg-cyan-900/30 px-2 py-0.5 rounded">{target.type.toUpperCase()}</span>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between"><span>CLASS:</span> <span className="text-white">{target.data.class}</span></div>
                    <div className="flex justify-between"><span>TEMP:</span> <span className="text-white">{target.data.temp}</span></div>
                    <div className="flex justify-between"><span>MASS:</span> <span className="text-white">{target.data.mass}</span></div>
                    <div className="flex justify-between"><span>DIST:</span> <span className="text-white">{Math.floor(displayPosition.length())} LY</span></div>
                </div>
                <div className="mt-2 text-[10px] text-cyan-600 animate-pulse">
                    SCANNING... DATA STREAM ACTIVE
                </div>
            </div>
        </Html>
    );
};
