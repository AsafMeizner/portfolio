import { useState, useEffect, useRef } from 'react';

interface FaultyTerminalProps {
    text: string;
    className?: string;
    trigger?: boolean;
}

const FaultyTerminal = ({ text, className = '', trigger = true }: FaultyTerminalProps) => {
    const [displayText, setDisplayText] = useState(text);
    const [glitchActive, setGlitchActive] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&[]{}<>';

    const glitch = () => {
        if (!trigger) return;

        let iterations = 0;
        setGlitchActive(true);

        if (intervalRef.current) clearInterval(intervalRef.current);

        intervalRef.current = setInterval(() => {
            setDisplayText(_prev =>
                text
                    .split('')
                    .map((_char, index) => {
                        if (index < iterations) {
                            return text[index];
                        }
                        return chars[Math.floor(Math.random() * chars.length)];
                    })
                    .join('')
            );

            if (iterations >= text.length) {
                if (intervalRef.current) clearInterval(intervalRef.current);
                setGlitchActive(false);
            }
            iterations += 1 / 3;
        }, 30);
    };

    useEffect(() => {
        glitch();
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [text, trigger]);

    return (
        <span
            className={`inline-block ${className} ${glitchActive ? 'text-cyan-400' : ''}`}
            onMouseEnter={glitch}
        >
            {displayText}
        </span>
    );
};

export default FaultyTerminal;
