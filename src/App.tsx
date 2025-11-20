import { useState } from 'react';
import { BootSequence } from './components/BootSequence';
import TargetCursor from './components/TargetCursor';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Skills } from './components/Skills';
import CyberGame from './components/CyberGame';
import { Projects } from './components/Projects';
import { Contact } from './components/Contact';

export default function App() {
  const [booting, setBooting] = useState(true);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  if (booting) {
    return <BootSequence onComplete={() => setBooting(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans overflow-x-hidden cursor-none selection:bg-cyan-500/30">
      <TargetCursor
        spinDuration={2}
        hideDefaultCursor={true}
        parallaxOn={true}
        targetSelector="button, a, .cursor-pointer, .cursor-target"
      />
      <Navbar scrollTo={scrollTo} />
      <Hero scrollTo={scrollTo} />
      <Skills />

      <section id="defense" className="py-24 relative bg-black">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <h2 className="text-4xl font-bold text-white mb-6">
              <span className="text-cyan-400">02.</span> Cyber Defense
            </h2>
            <p className="text-slate-400 text-lg mb-6">
              Pilot the scout ship through the neural network. Avoid firewalls and collect data packets.
            </p>
          </div>
          <div className="flex-1 w-full">
            <CyberGame />
          </div>
        </div>
      </section>

      <Projects />
      <Contact />
    </div>
  );
}