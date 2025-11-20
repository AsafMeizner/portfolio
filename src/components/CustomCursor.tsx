import React, { useState, useEffect } from 'react';

export const useCustomCursor = () => {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        const moveCursor = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        const handleMouseOver = (e: MouseEvent) => {
            if ((e.target as HTMLElement).closest('button, a, .cursor-pointer')) {
                setIsHovering(true);
            } else {
                setIsHovering(false);
            }
        };

        window.addEventListener('mousemove', moveCursor);
        window.addEventListener('mouseover', handleMouseOver);
        return () => {
            window.removeEventListener('mousemove', moveCursor);
            window.removeEventListener('mouseover', handleMouseOver);
        };
    }, []);

    return { mousePos, isHovering };
};

// Renamed to CustomCursor to match the import in App.tsx, but using the TacticalCursor design
export const CustomCursor = () => {
    const { mousePos, isHovering } = useCustomCursor();

    return (
        <div
            className="fixed top-0 left-0 pointer-events-none z-[60] mix-blend-difference"
            style={{
                transform: `translate(${mousePos.x}px, ${mousePos.y}px)`
            }}
        >
            {/* Center Crosshair */}
            <div className="absolute -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-cyan-400 rounded-full" />

            {/* Animated Brackets */}
            <div
                className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-150 ease-out border border-cyan-400/80 ${isHovering ? 'w-12 h-12 opacity-100 rotate-45' : 'w-6 h-6 opacity-50 rotate-0'}`}
            />

            {/* Corner Ticks */}
            <div className={`absolute -top-4 -left-[1px] w-[2px] h-2 bg-cyan-400 transition-all ${isHovering ? '-top-6' : '-top-4'}`} />
            <div className={`absolute -bottom-4 -left-[1px] w-[2px] h-2 bg-cyan-400 transition-all ${isHovering ? '-bottom-6' : '-bottom-4'}`} />
            <div className={`absolute -left-4 -top-[1px] h-[2px] w-2 bg-cyan-400 transition-all ${isHovering ? '-left-6' : '-left-4'}`} />
            <div className={`absolute -right-4 -top-[1px] h-[2px] w-2 bg-cyan-400 transition-all ${isHovering ? '-right-6' : '-right-4'}`} />
        </div>
    );
};
