import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Github, Database, Brain, Code2 } from 'lucide-react';

interface Project {
    id: number;
    title: string;
    desc: string;
    tech: string[];
    icon: React.ComponentType<any>;
    color: 'cyan' | 'purple' | 'emerald';
}

const colorMap = {
    cyan: {
        border: 'border-cyan-500/30',
        hoverBorder: 'hover:border-cyan-500',
        icon: 'text-cyan-400',
        badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    },
    purple: {
        border: 'border-purple-500/30',
        hoverBorder: 'hover:border-purple-500',
        icon: 'text-purple-400',
        badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    },
    emerald: {
        border: 'border-emerald-500/30',
        hoverBorder: 'hover:border-emerald-500',
        icon: 'text-emerald-400',
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    }
};

const projects: Project[] = [
    {
        id: 1,
        title: "FRC Scouting Intelligence",
        desc: "Distributed data collection system for robotics competitions with predictive strategy analysis.",
        tech: ["REACT", "MONGODB", "NODE"],
        icon: Database,
        color: "cyan"
    },
    {
        id: 2,
        title: "Autonomous Path Planner",
        desc: "Motion profiling algorithm using spline interpolation for smooth robot navigation.",
        tech: ["JAVA", "MATH", "PHYSICS"],
        icon: Brain,
        color: "purple"
    },
    {
        id: 3,
        title: "Neural Network Sim",
        desc: "Visualizing backpropagation and activation functions in real-time.",
        tech: ["PYTHON", "PYTORCH", "D3"],
        icon: Code2,
        color: "emerald"
    }
];

const CardSwap = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextCard = () => {
        setCurrentIndex((prev) => (prev + 1) % projects.length);
    };

    const currentProject = projects[currentIndex];
    const colors = colorMap[currentProject.color];

    return (
        <div className="relative w-full max-w-md mx-auto h-[400px] perspective-1000">
            <AnimatePresence mode='wait'>
                <motion.div
                    key={currentIndex}
                    initial={{ rotateY: -90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: 90, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="absolute inset-0 w-full h-full"
                    onClick={nextCard}
                >
                    <div className={`w-full h-full bg-slate-800/80 backdrop-blur-xl rounded-xl p-8 border ${colors.border} ${colors.hoverBorder} transition-colors cursor-pointer group shadow-[0_0_30px_rgba(0,0,0,0.3)]`}>
                        <div className="flex justify-between mb-6">
                            <currentProject.icon className={colors.icon} size={40} />
                            <div className="flex gap-4">
                                <Github className="text-slate-500 hover:text-white transition-colors" />
                                <ExternalLink className="text-slate-500 hover:text-white transition-colors" />
                            </div>
                        </div>

                        <h3 className="text-3xl font-bold text-white mb-4">{currentProject.title}</h3>
                        <p className="text-slate-400 mb-8 text-lg leading-relaxed">{currentProject.desc}</p>

                        <div className="flex flex-wrap gap-2">
                            {currentProject.tech.map((t, i) => (
                                <span key={i} className={`text-xs font-mono px-2 py-1 rounded border ${colors.badge}`}>
                                    {t}
                                </span>
                            ))}
                        </div>

                        <div className="absolute bottom-4 right-4 text-xs text-slate-600 font-mono">
                            CLICK TO SWAP &gt;&gt;
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default CardSwap;
