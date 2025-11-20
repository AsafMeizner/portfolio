import React, { useState, useEffect } from 'react';

export const useScrambleText = (text: string, speed: number = 30, trigger: boolean = true) => {
    const [displayText, setDisplayText] = useState(text);

    useEffect(() => {
        if (!trigger) return;

        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&[]{}<>";
        let iterations = 0;

        const interval = setInterval(() => {
            setDisplayText(prev =>
                text.split("").map((char, index) => {
                    if (index < iterations) return text[index];
                    return chars[Math.floor(Math.random() * chars.length)];
                }).join("")
            );

            if (iterations >= text.length) clearInterval(interval);
            iterations += 1 / 3;
        }, speed);

        return () => clearInterval(interval);
    }, [text, speed, trigger]);

    return displayText;
};

export const HackerText = ({ text, className }: { text: string, className?: string }) => {
    const [isHovered, setIsHovered] = useState(false);
    const displayText = useScrambleText(text, 30, isHovered);

    return (
        <span
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`font-mono cursor-pointer ${className}`}
        >
            {isHovered ? displayText : text}
        </span>
    );
};
