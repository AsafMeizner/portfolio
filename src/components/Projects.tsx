import { useState, useEffect } from 'react';
import { Code2, Database, Brain, Terminal, ExternalLink, Github, ChevronRight } from 'lucide-react';

interface Project {
    id: string;
    title: string;
    desc: string;
    status: 'DEPLOYED' | 'ACTIVE' | 'ARCHIVED';
    tech: string[];
    icon: React.ComponentType<any>;
    color: string;
    link?: string;
    github?: string;
}

const projects: Project[] = [
    {
        id: 'PRJ-001',
        title: 'FRC Scouting Intelligence',
        desc: 'Distributed data collection system for robotics competitions with real-time predictive analytics and strategic decision support.',
        status: 'DEPLOYED',
        tech: ['React', 'TypeScript', 'MongoDB', 'Node.js', 'Express', 'Socket.IO'],
        icon: Database,
        color: '#06b6d4',
        github: '#'
    },
    {
        id: 'PRJ-002',
        title: 'Autonomous Path Planner',
        desc: 'Advanced motion profiling algorithm using cubic spline interpolation for smooth autonomous robot navigation with real-time obstacle avoidance.',
        status: 'ACTIVE',
        tech: ['Java', 'Python', 'OpenCV', 'PID Control', 'Path Optimization'],
        icon: Brain,
        color: '#a855f7',
        github: '#'
    },
    {
        id: 'PRJ-003',
        title: 'Neural Network Visualizer',
        desc: 'Interactive deep learning visualization platform demonstrating backpropagation, activation functions, and gradient descent in real-time.',
        status: 'DEPLOYED',
        tech: ['Python', 'PyTorch', 'D3.js', 'Flask', 'WebSockets'],
        icon: Code2,
        color: '#10b981',
        link: '#',
        github: '#'
    }
];

const DeploymentLogLine = ({ text, delay, color }: { text: string, delay: number, color?: string }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <div
            className={`font-mono text-xs transition-all duration-300 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                } ${color || 'text-slate-500'}`}
        >
            <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString('en-US', { hour12: false })}]</span>
            {text}
        </div>
    );
};

const ProjectCard = ({ project, index }: { project: Project, index: number }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div
            className="group relative bg-slate-900/50 border border-slate-700 rounded-lg p-6 hover:border-cyan-500/50 transition-all duration-300 overflow-hidden"
            onMouseEnter={() => setExpanded(true)}
            onMouseLeave={() => setExpanded(false)}
        >
            {/* Scanline effect */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0)_50%,rgba(6,182,212,0.03)_50%)] bg-[length:100%_4px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Status indicator */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${project.status === 'DEPLOYED' ? 'bg-emerald-500 animate-pulse' :
                    project.status === 'ACTIVE' ? 'bg-cyan-500 animate-pulse' :
                        'bg-slate-500'
                    }`} />
                <span className={`text-xs font-mono font-bold ${project.status === 'DEPLOYED' ? 'text-emerald-400' :
                    project.status === 'ACTIVE' ? 'text-cyan-400' :
                        'text-slate-500'
                    }`}>
                    {project.status}
                </span>
            </div>

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                    <div
                        className="p-3 rounded-lg bg-slate-800/80 ring-1 ring-white/10 group-hover:ring-cyan-500/50 transition-all"
                        style={{ color: project.color }}
                    >
                        <project.icon size={28} />
                    </div>
                    <div className="flex-1">
                        <div className="text-xs font-mono text-slate-600 mb-1">{project.id}</div>
                        <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                            {project.title}
                        </h3>
                    </div>
                </div>

                {/* Description */}
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                    {project.desc}
                </p>

                {/* Tech Stack */}
                <div className="mb-4">
                    <div className="text-xs font-mono text-slate-600 mb-2">TECH_STACK:</div>
                    <div className="flex flex-wrap gap-2">
                        {project.tech.map((tech, i) => (
                            <span
                                key={i}
                                className="px-2 py-1 bg-slate-800/50 border border-slate-700 rounded text-xs font-mono text-cyan-400 group-hover:border-cyan-500/30 transition-colors"
                            >
                                {tech}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Links */}
                <div className="flex gap-3 pt-4 border-t border-slate-800">
                    {project.github && (
                        <a
                            href={project.github}
                            className="flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors font-mono"
                        >
                            <Github size={16} />
                            <span>SOURCE</span>
                        </a>
                    )}
                    {project.link && (
                        <a
                            href={project.link}
                            className="flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-400 transition-colors font-mono"
                        >
                            <ExternalLink size={16} />
                            <span>DEPLOY</span>
                        </a>
                    )}
                </div>

                {/* Deployment log */}
                <div className={`mt-4 pt-4 border-t border-slate-800 space-y-1 overflow-hidden transition-all duration-300 ${expanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                    }`}>
                    <DeploymentLogLine text={`├─ Initializing ${project.id}...`} delay={0} color="text-cyan-500" />
                    <DeploymentLogLine text="├─ Loading dependencies..." delay={100} />
                    <DeploymentLogLine text="├─ Running build process..." delay={200} />
                    <DeploymentLogLine text="├─ Optimizing assets..." delay={300} />
                    <DeploymentLogLine text="└─ Deployment successful ✓" delay={400} color="text-emerald-500" />
                </div>
            </div>
        </div>
    );
};

export const Projects = () => {
    return (
        <section id="projects" className="py-24 relative bg-slate-950 border-y border-slate-800">
            {/* Background grid */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grid-noise.png')] opacity-5" />

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                {/* Header */}
                <div className="mb-16">
                    <div className="flex items-center gap-4 mb-4">
                        <Terminal className="text-cyan-400" size={32} />
                        <h2 className="text-4xl font-bold text-white">
                            <span className="text-cyan-400">03.</span> Deployment Log
                        </h2>
                    </div>
                    <p className="text-slate-400 text-lg max-w-2xl font-mono">
                        {'//'} Active and archived project deployments
                    </p>

                    {/* Terminal header */}
                    <div className="mt-6 p-4 bg-slate-900/50 border border-slate-700 rounded-lg font-mono text-xs space-y-1">
                        <div className="text-slate-600">$ system.deployment.list --filter=all</div>
                        <div className="text-emerald-500">✓ Found {projects.length} deployments</div>
                        <div className="text-cyan-500 flex items-center gap-2">
                            <ChevronRight size={12} />
                            Rendering project manifests...
                        </div>
                    </div>
                </div>

                {/* Projects Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project, index) => (
                        <ProjectCard key={project.id} project={project} index={index} />
                    ))}
                </div>

                {/* Footer stats */}
                <div className="mt-16 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                    <div className="text-center p-4 bg-slate-900/30 border border-slate-800 rounded">
                        <div className="text-2xl font-bold text-emerald-400 font-mono">
                            {projects.filter(p => p.status === 'DEPLOYED').length}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-1">DEPLOYED</div>
                    </div>
                    <div className="text-center p-4 bg-slate-900/30 border border-slate-800 rounded">
                        <div className="text-2xl font-bold text-cyan-400 font-mono">
                            {projects.filter(p => p.status === 'ACTIVE').length}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-1">ACTIVE</div>
                    </div>
                    <div className="text-center p-4 bg-slate-900/30 border border-slate-800 rounded">
                        <div className="text-2xl font-bold text-white font-mono">
                            {projects.reduce((acc, p) => acc + p.tech.length, 0)}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-1">TECHNOLOGIES</div>
                    </div>
                </div>
            </div>
        </section>
    );
};
