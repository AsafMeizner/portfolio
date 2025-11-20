import React, { useState, useEffect, useRef } from 'react';
import { Shield, AlertTriangle, Play, MousePointer2 } from 'lucide-react';

export const SystemDefenseGame = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
    const [score, setScore] = useState(0);

    // Game Refs for Loop
    const stateRef = useRef({
        playerX: 0,
        projectiles: [] as { x: number, y: number }[],
        enemies: [] as { x: number, y: number, speed: number, type: number }[],
        lastEnemySpawn: 0,
        score: 0,
        gameOver: false,
        particles: [] as { x: number, y: number, vx: number, vy: number, life: number, color: string }[]
    });

    const startGame = () => {
        setScore(0);
        setGameState('playing');
        stateRef.current = {
            playerX: 150,
            projectiles: [],
            enemies: [],
            lastEnemySpawn: 0,
            score: 0,
            gameOver: false,
            particles: []
        };
    };

    useEffect(() => {
        if (gameState !== 'playing') return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        const width = canvas.width;
        const height = canvas.height;

        const spawnEnemy = (time: number) => {
            if (time - stateRef.current.lastEnemySpawn > 1000 - Math.min(stateRef.current.score * 10, 600)) {
                stateRef.current.enemies.push({
                    x: Math.random() * (width - 20) + 10,
                    y: -20,
                    speed: Math.random() * 1 + 1 + (stateRef.current.score * 0.05),
                    type: Math.random() > 0.8 ? 1 : 0 // 1 = Stronger bug
                });
                stateRef.current.lastEnemySpawn = time;
            }
        };

        const createExplosion = (x: number, y: number, color: string) => {
            for (let i = 0; i < 8; i++) {
                stateRef.current.particles.push({
                    x, y,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    life: 1.0,
                    color
                });
            }
        };

        const loop = (time: number) => {
            if (stateRef.current.gameOver) {
                setGameState('gameover');
                return;
            }

            // Clear
            ctx.fillStyle = '#0f172a'; // Slate 900
            ctx.fillRect(0, 0, width, height);

            // Update & Draw Player
            ctx.fillStyle = '#06b6d4'; // Cyan
            // Draw Turret Triangle
            ctx.beginPath();
            ctx.moveTo(stateRef.current.playerX, height - 30);
            ctx.lineTo(stateRef.current.playerX - 10, height - 10);
            ctx.lineTo(stateRef.current.playerX + 10, height - 10);
            ctx.fill();

            // Spawn Enemies
            spawnEnemy(time);

            // Update Projectiles
            ctx.fillStyle = '#f472b6'; // Pink
            for (let i = stateRef.current.projectiles.length - 1; i >= 0; i--) {
                const p = stateRef.current.projectiles[i];
                p.y -= 7;
                ctx.fillRect(p.x - 2, p.y, 4, 10);
                if (p.y < 0) stateRef.current.projectiles.splice(i, 1);
            }

            // Update Particles
            for (let i = stateRef.current.particles.length - 1; i >= 0; i--) {
                const p = stateRef.current.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.05;
                ctx.globalAlpha = Math.max(0, p.life);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
                if (p.life <= 0) stateRef.current.particles.splice(i, 1);
            }

            // Update Enemies
            for (let i = stateRef.current.enemies.length - 1; i >= 0; i--) {
                const e = stateRef.current.enemies[i];
                e.y += e.speed;

                // Draw Enemy (Bug Shape)
                ctx.fillStyle = e.type === 1 ? '#ef4444' : '#ffffff'; // Red or White
                ctx.font = '16px monospace';
                ctx.fillText(e.type === 1 ? '[BUG]' : '{}', e.x - 10, e.y);

                // Collision Player
                if (Math.abs(e.x - stateRef.current.playerX) < 20 && e.y > height - 30) {
                    stateRef.current.gameOver = true;
                }

                // Collision Projectile
                for (let j = stateRef.current.projectiles.length - 1; j >= 0; j--) {
                    const p = stateRef.current.projectiles[j];
                    if (Math.abs(e.x - p.x) < 15 && Math.abs(e.y - p.y) < 15) {
                        stateRef.current.enemies.splice(i, 1);
                        stateRef.current.projectiles.splice(j, 1);
                        stateRef.current.score += 10;
                        setScore(stateRef.current.score);
                        createExplosion(e.x, e.y, '#22d3ee');
                        break;
                    }
                }

                if (e.y > height) {
                    stateRef.current.enemies.splice(i, 1); // Missed bug, no penalty for now
                }
            }

            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            stateRef.current.playerX = e.clientX - rect.left;
        };

        const handleClick = () => {
            if (stateRef.current.projectiles.length < 5) { // Rate limit
                stateRef.current.projectiles.push({
                    x: stateRef.current.playerX,
                    y: height - 30
                });
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleClick);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousedown', handleClick);
            cancelAnimationFrame(animationFrameId);
        };
    }, [gameState]);

    return (
        <section id="defense" className="py-24 relative bg-black">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1">
                    <h2 className="text-4xl font-bold text-white mb-6">
                        <span className="text-red-500">02.</span> Live Defense
                    </h2>
                    <p className="text-slate-400 text-lg mb-6">
                        Interactive elements aren't just for show. Prove your precision.
                        <br /><br />
                        Use your mouse to pilot the firewall turret and eliminate incoming bugs before they crash the system.
                    </p>
                    <div className="flex gap-4 text-sm font-mono text-slate-500">
                        <div className="flex items-center gap-2"><MousePointer2 size={14} /> AIM</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 border border-slate-500 rounded-full"></div> CLICK TO SHOOT</div>
                    </div>
                </div>
                <div className="flex-1 w-full">
                    <div className="relative w-full max-w-md mx-auto h-[400px] bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-700 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                        <div className="absolute top-0 left-0 w-full h-8 bg-slate-800 flex items-center px-4 justify-between border-b border-slate-700 z-10">
                            <span className="text-xs font-mono text-cyan-400 flex items-center gap-2"><Shield size={12} /> SYSTEM DEFENSE</span>
                            <span className="text-xs font-mono text-white">SCORE: {score}</span>
                        </div>

                        <canvas ref={canvasRef} width={400} height={400} className="cursor-none block w-full h-full" />

                        {gameState === 'start' && (
                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center z-20">
                                <AlertTriangle className="text-red-500 mb-4 animate-pulse" size={48} />
                                <h3 className="text-2xl font-bold text-white mb-2">SYSTEM UNDER ATTACK</h3>
                                <p className="text-slate-400 mb-6 text-sm px-8">Bugs are infiltrating the kernel. Use your mouse to aim and click to fire patches.</p>
                                <button
                                    onClick={startGame}
                                    className="px-6 py-2 bg-cyan-500 text-slate-900 font-bold rounded hover:bg-cyan-400 flex items-center gap-2"
                                >
                                    <Play size={16} /> INITIALIZE DEFENSE
                                </button>
                            </div>
                        )}

                        {gameState === 'gameover' && (
                            <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center text-center z-20">
                                <h3 className="text-3xl font-bold text-white mb-2">SYSTEM FAILURE</h3>
                                <p className="text-white/80 mb-6">Final Score: {score}</p>
                                <button
                                    onClick={startGame}
                                    className="px-6 py-2 bg-white text-red-900 font-bold rounded hover:bg-slate-200"
                                >
                                    REBOOT SYSTEM
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};
