import { useState, useEffect } from 'react';

export const usePortrait = () => {
    const [isPortrait, setIsPortrait] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia('(orientation: portrait)');
        const handleChange = (e: MediaQueryListEvent) => setIsPortrait(e.matches);

        setIsPortrait(mql.matches);

        mql.addEventListener('change', handleChange);
        return () => mql.removeEventListener('change', handleChange);
    }, []);

    return isPortrait;
};
