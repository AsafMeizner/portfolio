import { useState, useEffect, useRef } from 'react';


export const BootSequence = ({ onComplete }: { onComplete: () => void }) => {
    const [lines, setLines] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const systemLogs = [
        "BIOS DATE 01/15/2099 14:22:55 VER 1.0.5",
        "CPU: QUANTUM CORE i9-9900K @ 8.5GHz",
        "MEMORY TEST: 64TB OK",
        "DETECTING PRIMARY MASTER ... QUANTUM DRIVE 1PB",
        "DETECTING PRIMARY SLAVE ... NEURAL LINK V2",
        "LOADING KERNEL...",
        "KERNEL: ARCH_X86_64 FOUND",
        "MOUNTING FILESYSTEMS...",
        "/dev/sda1: CLEAN, 14522/524288 files",
        "LOADING DRIVERS...",
        " > GPU_DRIVER... OK",
        " > NEURAL_NET... OK",
        " > HOLOGRAPHIC_DISPLAY... OK",
        "INITIALIZING SECURITY PROTOCOLS...",
        "ENCRYPTING CONNECTION [AES-4096]...",
        "ESTABLISHING UPLINK TO SATELLITE 4...",
        "DOWNLOADING USER PROFILE: ASAF_MEIZNER...",
        "DECOMPRESSING ASSETS...",
        "RENDERING 3D ENVIRONMENT...",
        "OPTIMIZING SHADERS...",
        "COMPILING REACT COMPONENTS...",
        "EXECUTING VITE BUNDLE...",
        "SYSTEM READY."
    ];

    useEffect(() => {
        let lineIndex = 0;
        const interval = setInterval(() => {
            if (lineIndex < systemLogs.length) {
                setLines(prev => {
                    const newLines = [...prev, systemLogs[lineIndex]];
                    if (newLines.length > 15) newLines.shift(); // Keep only last 15 lines
                    return newLines;
                });
                lineIndex++;
            } else {
                clearInterval(interval);
            }
        }, 150); // Faster scrolling

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [lines]);

    useEffect(() => {
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(progressInterval);
                    setTimeout(onComplete, 1000);
                    return 100;
                }
                // Non-linear progress for realism
                return prev + (Math.random() * 5);
            });
        }, 100);
        return () => clearInterval(progressInterval);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 bg-black z-[100] font-mono text-cyan-500 overflow-hidden cursor-none">
            {/* CRT Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%] pointer-events-none" />
            <div className="absolute inset-0 pointer-events-none z-50 animate-scanline bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent h-32 w-full opacity-20" />

            <div className="relative z-10 h-full flex flex-col items-center justify-center p-8">
                <div className="w-full max-w-2xl">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <pre className="text-[10px] md:text-xs leading-none text-cyan-600 mb-4 opacity-70">
                            {`
    ___    __  ___       ____  _____
   /   |  /  |/  /      / __ \\/ ___/
  / /| | / /|_/ /      / / / /\\__ \\ 
 / ___ |/ /  / /      / /_/ /___/ / 
/_/  |_/_/  /_/  _____\\____//____/  
                /_____/             
 SYSTEM BOOT SEQUENCE V2.0
`}


                        </pre>
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-900 to-transparent" />
                    </div>

                    {/* Terminal Window */}
                    <div className="bg-black/90 border border-cyan-900/50 p-6 rounded-sm shadow-[0_0_50px_rgba(6,182,212,0.1)] backdrop-blur-sm min-h-[400px] flex flex-col">
                        <div className="flex-1 overflow-hidden relative" ref={scrollRef}>
                            <div className="space-y-1">
                                {lines.map((line, i) => (
                                    <div key={i} className="flex gap-3 text-sm md:text-base">
                                        <span className="text-slate-600">
                                            [{new Date().toLocaleTimeString([], { hour12: false, second: '2-digit', fractionalSecondDigits: 3 })}]
                                        </span>
                                        <span className={
                                            (line || "").includes("ERROR") ? "text-red-500" :
                                                (line || "").includes("OK") ? "text-emerald-400" :
                                                    (line || "").includes("WARNING") ? "text-yellow-400" :
                                                        "text-cyan-400"
                                        }>
                                            {line}
                                        </span>
                                    </div>
                                ))}
                                <div className="animate-pulse text-cyan-400">_</div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-6 space-y-2">
                            <div className="flex justify-between text-xs text-cyan-700 font-bold tracking-widest">
                                <span>SYSTEM_INTEGRITY_CHECK</span>
                                <span>{Math.min(100, Math.floor(progress))}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-900 border border-cyan-900/30 p-0.5">
                                <div
                                    className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)] transition-all duration-75 ease-out"
                                    style={{ width: `${Math.min(100, progress)}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                                <span>MEM: 64328MB OK</span>
                                <span>VRAM: 24576MB OK</span>
                                <span>NET: CONNECTED</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
