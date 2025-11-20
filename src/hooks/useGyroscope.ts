import { useState, useEffect } from 'react';

interface GyroscopeData {
    alpha: number; // rotation around z-axis
    beta: number;  // rotation around x-axis (front to back)
    gamma: number; // rotation around y-axis (left to right)
}

export const useGyroscope = () => {
    const [orientation, setOrientation] = useState<GyroscopeData>({
        alpha: 0,
        beta: 0,
        gamma: 0
    });
    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

    useEffect(() => {
        // Check if DeviceOrientationEvent is supported
        if (typeof DeviceOrientationEvent !== 'undefined') {
            setIsSupported(true);
        }

        const handleOrientation = (event: DeviceOrientationEvent) => {
            setOrientation({
                alpha: event.alpha || 0,
                beta: event.beta || 0,
                gamma: event.gamma || 0
            });
        };

        // Request permission for iOS 13+
        const requestPermission = async () => {
            if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
                try {
                    const response = await (DeviceOrientationEvent as any).requestPermission();
                    setPermission(response);
                    if (response === 'granted') {
                        window.addEventListener('deviceorientation', handleOrientation);
                    }
                } catch (error) {
                    console.error('Error requesting device orientation permission:', error);
                    setPermission('denied');
                }
            } else {
                // Non-iOS devices or older iOS versions
                setPermission('granted');
                window.addEventListener('deviceorientation', handleOrientation);
            }
        };

        if (isSupported) {
            requestPermission();
        }

        return () => {
            window.removeEventListener('deviceorientation', handleOrientation);
        };
    }, [isSupported]);

    const requestGyroscopePermission = async () => {
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            try {
                const response = await (DeviceOrientationEvent as any).requestPermission();
                setPermission(response);
                if (response === 'granted') {
                    window.addEventListener('deviceorientation', (event: DeviceOrientationEvent) => {
                        setOrientation({
                            alpha: event.alpha || 0,
                            beta: event.beta || 0,
                            gamma: event.gamma || 0
                        });
                    });
                }
                return response === 'granted';
            } catch (error) {
                console.error('Error requesting permission:', error);
                return false;
            }
        }
        return true;
    };

    return {
        orientation,
        isSupported,
        permission,
        requestGyroscopePermission
    };
};
