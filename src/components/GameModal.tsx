import { useEffect } from 'react';
import { X } from 'lucide-react';

interface GameModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export const GameModal = ({ isOpen, onClose, children }: GameModalProps) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }

        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/95 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative z-10 w-full h-full flex flex-col">
                {/* Close Button */}
                <div className="absolute top-4 right-4 z-20">
                    <button
                        onClick={onClose}
                        className="p-3 bg-slate-900/80 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-500 rounded-lg transition-colors group"
                        aria-label="Close fullscreen"
                    >
                        <X className="text-slate-400 group-hover:text-white transition-colors" size={24} />
                    </button>
                </div>

                {/* Game Container */}
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="w-full h-full max-w-7xl">
                        {children}
                    </div>
                </div>

                {/* Instructions */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
                    <p className="text-slate-500 text-sm font-mono">
                        Press <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded">ESC</kbd> to exit fullscreen
                    </p>
                </div>
            </div>
        </div>
    );
};
