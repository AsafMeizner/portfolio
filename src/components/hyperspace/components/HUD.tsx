import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { CelestialBody } from '../types';

interface HUDProps {
    target: CelestialBody | null;
    onClose: () => void;
}

export const HUD = ({ target, onClose }: HUDProps) => {
    if (!target) return null;

    return (
        <Html
            position={[target.position.x, target.position.y, target.position.z]}
            center
            zIndexRange={[100, 0]}
            occlude
            onOcclude={(hidden) => {
                const el = document.getElementById(`hud-${target.id}`);
                if (el) el.style.opacity = hidden ? '0' : '1';
            }}
        >
            <div
                id={`hud-${target.id}`}
                className="w-64 bg-black/80 border border-cyan-500/50 p-4 rounded-lg backdrop-blur-md text-cyan-400 font-mono text-sm pointer-events-auto select-none transition-opacity duration-200"
                style={{ minWidth: '200px' }}
            >
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-cyan-600 hover:text-cyan-300"
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
                    <div className="flex justify-between"><span>DIST:</span> <span className="text-white">{Math.floor(target.position.distanceTo(new THREE.Vector3(0, 0, 0)))} LY</span></div>
                </div>
                <div className="mt-2 text-[10px] text-cyan-600 animate-pulse">
                    SCANNING... DATA STREAM ACTIVE
                </div>
            </div>
        </Html>
    );
};
