import { useState } from 'react';
import { Cpu, Database, Globe, Layout, Server, Wifi } from 'lucide-react';

const skills = [
    {
        name: 'Frontend Architecture',
        icon: Layout,
        color: 'text-cyan-400',
        tech: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Three.js', 'Framer Motion']
    },
    {
        name: 'Backend Systems',
        icon: Server,
        color: 'text-purple-400',
        tech: ['Node.js', 'Python', 'Go', 'GraphQL', 'Redis', 'PostgreSQL']
    },
    {
        name: 'Database Design',
        icon: Database,
        color: 'text-emerald-400',
        tech: ['MongoDB', 'PostgreSQL', 'Firebase', 'Prisma', 'Supabase']
    },
    {
        name: 'Cloud Infrastructure',
        icon: Globe,
        color: 'text-blue-400',
        tech: ['AWS', 'Docker', 'Kubernetes', 'Vercel', 'CI/CD Pipelines']
    },
    {
        name: 'System Optimization',
        icon: Cpu,
        color: 'text-rose-400',
        tech: ['WebAssembly', 'Rust', 'Performance Profiling', 'SEO', 'Accessibility']
    },
    {
        name: 'Network Security',
        icon: Wifi,
        color: 'text-amber-400',
        tech: ['OAuth', 'JWT', 'Penetration Testing', 'HTTPS/SSL', 'Firewall Config']
    },
];

const HexGrid = () => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {skills.map((skill, index) => (
                <div
                    key={index}
                    className="group relative p-6 bg-slate-800/50 border border-slate-700 hover:border-cyan-500/50 rounded-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                >
                    {/* Hover Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`p-3 rounded-lg bg-slate-900/80 ${skill.color} ring-1 ring-white/10 group-hover:ring-cyan-500/50 transition-all`}>
                                <skill.icon size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                                {skill.name}
                            </h3>
                        </div>

                        {/* Tech Stack Grid */}
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            {skill.tech.map((tech, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-2 text-sm text-slate-400 group-hover:text-slate-200 transition-colors"
                                    style={{
                                        transitionDelay: `${i * 50}ms`,
                                        opacity: hoveredIndex === index ? 1 : 0.7,
                                        transform: hoveredIndex === index ? 'translateX(0)' : 'translateX(-4px)'
                                    }}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full ${hoveredIndex === index ? 'bg-cyan-400' : 'bg-slate-600'} transition-colors`} />
                                    <span className="font-mono text-xs">{tech}</span>
                                </div>
                            ))}
                        </div>

                        {/* Decorative Corner */}
                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex gap-1">
                                <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse" />
                                <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse delay-75" />
                                <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse delay-150" />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const Skills = () => {
    return (
        <section id="skills" className="py-24 relative bg-slate-900 border-y border-slate-800">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <div className="mb-16 text-center md:text-left">
                    <h2 className="text-4xl font-bold text-white mb-4">
                        <span className="text-cyan-400">01.</span> Technical Matrix
                    </h2>
                    <p className="text-slate-400 max-w-2xl text-lg">
                        Comprehensive breakdown of combat-ready technologies and development protocols.
                        Hover to decrypt specific toolsets.
                    </p>
                </div>
                <HexGrid />
            </div>
        </section>
    );
};
