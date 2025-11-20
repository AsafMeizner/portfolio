
import { Terminal, Cpu, Wifi } from 'lucide-react';
import { HackerText } from './HackerText';
import { RobotCore } from './RobotCore';
import Hyperspeed from './Hyperspeed';
import FaultyTerminal from './FaultyTerminal';

export const Hero = ({ scrollTo }: { scrollTo: (id: string) => void }) => {
    return (
        <section id="home" className="min-h-screen flex flex-col md:flex-row items-center justify-center pt-16 relative overflow-hidden">
            {/* Background - Hyperspeed R3F */}
            <Hyperspeed />

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_transparent_20%,_#020617_100%)] z-0 pointer-events-none"></div>

            {/* Left Content */}
            <div className="z-10 flex-1 px-8 md:pl-20 flex flex-col justify-center h-full animate-fade-in-up pointer-events-none">
                <div className="pointer-events-auto inline-flex items-center gap-2 text-cyan-400 font-mono mb-4 border border-cyan-900/50 bg-cyan-900/10 px-3 py-1 rounded w-fit backdrop-blur-sm">
                    <Wifi size={14} className="animate-pulse" />
                    <span>Connection Stable</span>
                </div>

                <h1 className="text-6xl md:text-8xl font-extrabold text-white mb-6 tracking-tight leading-none relative group pointer-events-auto">
                    <div className="flex flex-col">
                        <FaultyTerminal text="ASAF" className="text-white" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                            <FaultyTerminal text="MEIZNER" trigger={true} />
                        </span>
                    </div>
                </h1>

                <div className="text-xl text-slate-400 mb-8 max-w-lg font-light border-l-2 border-cyan-500 pl-4 pointer-events-auto">
                    <div className="flex items-center gap-2 mb-2">
                        <Terminal size={18} className="text-cyan-500" />
                        <HackerText text="Software Developer" className="text-white font-semibold" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Cpu size={18} className="text-purple-500" />
                        <HackerText text="Robotics Engineer" className="text-white font-semibold" />
                    </div>
                </div>

                <div className="flex gap-4 pointer-events-auto">
                    <button
                        onClick={() => scrollTo('skills')}
                        className="group relative px-8 py-3 bg-cyan-500 text-slate-900 font-bold overflow-hidden rounded-sm cursor-pointer"
                    >
                        <div className="absolute inset-0 w-full h-full bg-white/30 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                        <span className="relative flex items-center gap-2">Initialize <Terminal size={16} /></span>
                    </button>
                </div>
            </div>

            {/* Right Content - 3D Element */}
            <div className="hidden md:block w-1/2 h-full relative z-10 pointer-events-auto">
                <RobotCore />
            </div>
        </section>
    );
};
