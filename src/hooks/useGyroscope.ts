import { useState, useEffect, useRef } from 'react';

interface GyroscopeData {
    alpha: number; // rotation around z-axis
    beta: number;  // rotation around x-axis (front to back)
    gamma: number; // rotation around y-axis (left to right)
}

export const useGyroscope = () => {
    const orientationRef = useRef<GyroscopeData>({ alpha: 0, beta: 0, gamma: 0 });
    const accelerationRef = useRef<{ x: number, y: number, z: number }>({ x: 0, y: 0, z: 0 });

    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

    useEffect(() => {
        if (typeof DeviceOrientationEvent !== 'undefined') {
            setIsSupported(true);
        }

        const handleOrientation = (event: DeviceOrientationEvent) => {
            orientationRef.current = {
                alpha: event.alpha || 0,
                beta: event.beta || 0,
                gamma: event.gamma || 0
            };
        };

        const handleMotion = (event: DeviceMotionEvent) => {
            if (event.acceleration) {
                accelerationRef.current = {
                    x: event.acceleration.x || 0,
                    y: event.acceleration.y || 0,
                    z: event.acceleration.z || 0
                };
            }
        };

        const requestPermission = async () => {
            if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
                try {
                    const response = await (DeviceOrientationEvent as any).requestPermission();
                    setPermission(response);
                    if (response === 'granted') {
                        window.addEventListener('deviceorientation', handleOrientation);
                        window.addEventListener('devicemotion', handleMotion);
                    }
                } catch (error) {
                    console.error('Error requesting device orientation permission:', error);
                    setPermission('denied');
                }
            } else {
                setPermission('granted');
                window.addEventListener('deviceorientation', handleOrientation);
                window.addEventListener('devicemotion', handleMotion);
            }
        };

        if (isSupported) {
            requestPermission();
        }

        return () => {
            window.removeEventListener('deviceorientation', handleOrientation);
            window.removeEventListener('devicemotion', handleMotion);
        };
    }, [isSupported]);

    const requestGyroscopePermission = async () => {
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            try {
                const response = await (DeviceOrientationEvent as any).requestPermission();
                setPermission(response);
                if (response === 'granted') {
                    // Listeners are added in useEffect based on permission state, 
                    // but we can ensure they are attached here if needed or rely on the effect re-running
                    // However, since we don't want to duplicate listeners, relying on the effect is safer
                    // provided we trigger a re-run. But permission state change triggers re-render, 
                    // so effect might not re-run if it only depends on isSupported.
                    // Let's just add them here safely if not already added, or better, 
                    // let the effect handle it by depending on permission? 
                    // Actually, the effect handles initial load. 
                    // Let's just manually add them here to be immediate.

                    const handleOrientation = (event: DeviceOrientationEvent) => {
                        orientationRef.current = {
                            alpha: event.alpha || 0,
                            beta: event.beta || 0,
                            gamma: event.gamma || 0
                        };
                    };
                    const handleMotion = (event: DeviceMotionEvent) => {
                        if (event.acceleration) {
                            accelerationRef.current = {
                                x: event.acceleration.x || 0,
                                y: event.acceleration.y || 0,
                                z: event.acceleration.z || 0
                            };
                        }
                    };

                    window.addEventListener('deviceorientation', handleOrientation);
                    window.addEventListener('devicemotion', handleMotion);
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
        orientationRef,
        accelerationRef,
        isSupported,
        permission,
        requestGyroscopePermission
    };
};
