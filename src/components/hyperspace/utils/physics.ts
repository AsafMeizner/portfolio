import * as THREE from 'three';

export const calculateOrbitPosition = (
    orbitRadius: number,
    orbitSpeed: number,
    orbitOffset: number,
    time: number
): THREE.Vector3 => {
    const angle = time * orbitSpeed + orbitOffset;
    return new THREE.Vector3(
        Math.cos(angle) * orbitRadius,
        0,
        Math.sin(angle) * orbitRadius
    );
};

export const getRelativePosition = (
    objectPosition: THREE.Vector3,
    cameraPosition: THREE.Vector3
): THREE.Vector3 => {
    return new THREE.Vector3().subVectors(objectPosition, cameraPosition);
};
