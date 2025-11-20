import React from 'react';

export const Navbar = ({ scrollTo }: { scrollTo: (id: string) => void }) => {
    return (
        <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800/60">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <div className="font-bold text-2xl tracking-tighter text-white cursor-pointer flex items-center gap-2" onClick={() => scrollTo('home')}>
                        <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse"></div>
                        AM<span className="text-cyan-400">_OS</span>
                    </div>
                    <div className="hidden md:flex space-x-8">
                        {['About', 'Skills', 'Projects', 'Contact'].map((item) => (
                            <button
                                key={item}
                                onClick={() => scrollTo(item.toLowerCase())}
                                className="hover:text-cyan-400 text-xs font-mono uppercase tracking-widest transition-colors cursor-pointer"
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </nav>
    );
};
