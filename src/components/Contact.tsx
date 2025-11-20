import { useState, useRef, useEffect } from 'react';
import { Mail, Github, Linkedin, Terminal as TerminalIcon } from 'lucide-react';
import emailjs from '@emailjs/browser';

export const Contact = () => {
    const [terminalMode, setTerminalMode] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });
    const [logs, setLogs] = useState<string[]>([]);
    const [currentInput, setCurrentInput] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const prompts = [
        { field: 'name', prompt: 'ENTER_NAME:', placeholder: 'John Doe' },
        { field: 'email', prompt: 'ENTER_EMAIL:', placeholder: 'john@example.com' },
        { field: 'message', prompt: 'ENTER_MESSAGE:', placeholder: 'Your message here...' }
    ];

    useEffect(() => {
        if (terminalMode && inputRef.current) {
            inputRef.current.focus();
        }
    }, [terminalMode, currentStep]);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const addLog = (text: string, color: string = 'text-slate-400') => {
        setLogs(prev => [...prev, `<span class="${color}">${text}</span>`]);
    };

    const handleInitialize = () => {
        setTerminalMode(true);
        addLog('> INITIALIZING SECURE TRANSMISSION PROTOCOL...', 'text-cyan-500');
        setTimeout(() => addLog('> HANDSHAKE ESTABLISHED ✓', 'text-emerald-500'), 500);
        setTimeout(() => addLog(`> ${prompts[0].prompt}`, 'text-cyan-400'), 1000);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && currentInput.trim() && !sending) {
            const field = prompts[currentStep].field as keyof typeof formData;
            const value = currentInput.trim();

            addLog(`> ${value}`, 'text-white');
            setFormData(prev => ({ ...prev, [field]: value }));
            setCurrentInput('');

            if (currentStep < prompts.length - 1) {
                setTimeout(() => {
                    setCurrentStep(currentStep + 1);
                    addLog(`> ${prompts[currentStep + 1].prompt}`, 'text-cyan-400');
                }, 300);
            } else {
                setTimeout(() => handleSend(value), 300);
            }
        }
    };

    const handleSend = async (lastMessage: string) => {
        setSending(true);
        const finalData = { ...formData, message: lastMessage };

        addLog('> PREPARING TRANSMISSION...', 'text-yellow-400');
        await new Promise(resolve => setTimeout(resolve, 500));

        addLog('> ENCRYPTING PAYLOAD [AES-256]...', 'text-yellow-400');
        await new Promise(resolve => setTimeout(resolve, 700));

        addLog('> ESTABLISHING UPLINK...', 'text-yellow-400');
        await new Promise(resolve => setTimeout(resolve, 600));

        try {
            // EmailJS configuration - replace with your actual values
            await emailjs.send(
                'YOUR_SERVICE_ID',
                'YOUR_TEMPLATE_ID',
                {
                    from_name: finalData.name,
                    from_email: finalData.email,
                    message: finalData.message,
                },
                'YOUR_PUBLIC_KEY'
            );

            addLog('> TRANSMITTING DATA...', 'text-cyan-400');
            await new Promise(resolve => setTimeout(resolve, 800));

            addLog('> TRANSMISSION SUCCESSFUL ✓', 'text-emerald-500');
            addLog('> MESSAGE DELIVERED TO DESTINATION', 'text-emerald-500');
            addLog('> CLOSING SECURE CHANNEL...', 'text-slate-500');

            setSent(true);
        } catch (error) {
            addLog('> ERROR: TRANSMISSION FAILED ✗', 'text-red-500');
            addLog('> REASON: ' + (error as Error).message, 'text-red-400');
        } finally {
            setSending(false);
        }
    };

    const handleReset = () => {
        setTerminalMode(false);
        setCurrentStep(0);
        setFormData({ name: '', email: '', message: '' });
        setLogs([]);
        setCurrentInput('');
        setSending(false);
        setSent(false);
    };

    if (!terminalMode) {
        return (
            <section id="contact" className="py-24 text-center border-t border-slate-800 bg-slate-950">
                <div className="max-w-2xl mx-auto px-4">
                    <div className="inline-block p-4 rounded-full bg-cyan-500/10 mb-6">
                        <Mail className="text-cyan-400 w-8 h-8" />
                    </div>
                    <h2 className="text-5xl font-bold text-white mb-6">Initialize Handshake</h2>
                    <p className="text-slate-400 mb-8">
                        Establish a secure communication channel
                    </p>

                    <button
                        onClick={handleInitialize}
                        className="inline-block px-10 py-4 bg-white text-slate-900 font-bold rounded hover:bg-cyan-400 transition-colors transform hover:-translate-y-1 cursor-pointer"
                    >
                        START TRANSMISSION
                    </button>

                    <div className="mt-16 flex justify-center gap-8 text-slate-500">
                        <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                            <Github className="hover:text-white cursor-pointer transition-colors" />
                        </a>
                        <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
                            <Linkedin className="hover:text-white cursor-pointer transition-colors" />
                        </a>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section id="contact" className="py-24 bg-slate-950 border-t border-slate-800">
            <div className="max-w-3xl mx-auto px-4">
                <div className="mb-8 flex items-center gap-4">
                    <TerminalIcon className="text-cyan-400" size={32} />
                    <h2 className="text-3xl font-bold text-white font-mono">
                        SECURE_TRANSMISSION_TERMINAL
                    </h2>
                </div>

                {/* Terminal Window */}
                <div className="bg-black/90 border border-cyan-900/50 rounded-lg overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.1)]">
                    {/* Terminal Header */}
                    <div className="bg-slate-900 px-4 py-2 border-b border-cyan-900/30 flex items-center justify-between">
                        <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500/50" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                            <div className="w-3 h-3 rounded-full bg-green-500/50" />
                        </div>
                        <span className="text-xs font-mono text-slate-500">asafmeizner@gmail.com</span>
                    </div>

                    {/* Terminal Body */}
                    <div className="p-6 font-mono text-sm min-h-[400px] max-h-[500px] overflow-y-auto">
                        <div className="space-y-2">
                            {logs.map((log, i) => (
                                <div key={i} className="flex gap-2">
                                    <span className="text-slate-600">[{new Date().toLocaleTimeString('en-US', { hour12: false })}]</span>
                                    <span dangerouslySetInnerHTML={{ __html: log }} />
                                </div>
                            ))}

                            {!sent && !sending && (
                                <div className="flex gap-2 items-center mt-4">
                                    <span className="text-slate-600">[{new Date().toLocaleTimeString('en-US', { hour12: false })}]</span>
                                    <span className="text-cyan-400">&gt;</span>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={currentInput}
                                        onChange={(e) => setCurrentInput(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        placeholder={prompts[currentStep]?.placeholder}
                                        className="flex-1 bg-transparent text-white outline-none placeholder:text-slate-700"
                                        disabled={sending}
                                    />
                                    <span className="animate-pulse text-cyan-400">_</span>
                                </div>
                            )}

                            {sending && (
                                <div className="flex items-center gap-2 text-yellow-400 mt-4">
                                    <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                                    <span>PROCESSING...</span>
                                </div>
                            )}

                            {sent && (
                                <div className="mt-6 space-y-4">
                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded">
                                        <div className="text-emerald-500 font-bold mb-2">✓ TRANSMISSION COMPLETE</div>
                                        <div className="text-slate-400 text-xs">Your message has been successfully delivered.</div>
                                    </div>
                                    <button
                                        onClick={handleReset}
                                        className="px-6 py-2 bg-cyan-500 text-black font-bold rounded hover:bg-cyan-400 transition-colors"
                                    >
                                        NEW TRANSMISSION
                                    </button>
                                </div>
                            )}

                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>

                {/* Instructions */}
                <div className="mt-6 text-center">
                    <p className="text-slate-500 text-sm font-mono">
                        Press <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded">ENTER</kbd> to submit each field
                    </p>
                </div>
            </div>
        </section>
    );
};
