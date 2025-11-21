import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface StarStreaksProps {
    count?: number;
    speed?: number; // Base speed factor
    length?: number; // Length factor
    size?: number;
    color?: string;
    opacity?: number;
}

const StreakShader = {
    vertexShader: `
        attribute vec3 offset;
        attribute float scale;
        
        uniform float time;
        uniform vec3 velocity; // Camera velocity in local space
        uniform float trailLength;
        
        varying float vAlpha;

        void main() {
            vAlpha = 1.0;
            
            // Base position
            vec3 pos = offset;
            
            // Wrap around logic (Infinite field)
            // We move the "box" with the camera, but since we are in local space of a child of the camera,
            // we actually want to move the stars *past* the camera.
            // But here we are just updating their positions in a loop.
            // Let's do the wrapping in JS for simplicity, or here if we pass camera pos.
            // For now, let's assume 'offset' is updated in JS.
            
            // Orientation:
            // We want the streak to point along the 'velocity' vector.
            // Standard geometry is a box 1x1x1. We stretch it along Z by default?
            // No, let's align it to 'velocity'.
            
            vec3 velDir = normalize(velocity);
            float velLen = length(velocity);
            
            // Stretch factor based on speed
            float stretch = 1.0 + velLen * trailLength;
            
            // Rotate vertex to align with velocity
            // Default forward is -Z (0,0,-1)
            vec3 forward = vec3(0.0, 0.0, 1.0); // Box Z is forward?
            
            // Standard LookAt matrix construction
            vec3 zAxis = normalize(velocity); // The direction we want Z to point (Velocity direction)
            vec3 up = vec3(0.0, 1.0, 0.0);
            vec3 xAxis = normalize(cross(up, zAxis));
            vec3 yAxis = cross(zAxis, xAxis);
            
            mat3 rot = mat3(xAxis, yAxis, zAxis);
            
            vec3 transformed = position;
            
            // Scale Z (Length of streak)
            transformed.z *= stretch;
            
            // Scale X/Y (Thickness)
            transformed.x *= scale;
            transformed.y *= scale;
            
            // Apply rotation
            transformed = rot * transformed;
            
            // Apply position offset
            vec3 finalPos = transformed + offset;
            
            vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            
            // Fade out based on distance or just constant
            // vAlpha = smoothstep(500.0, 400.0, -mvPosition.z);
        }
    `,
    fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        varying float vAlpha;
        
        void main() {
            gl_FragColor = vec4(color, opacity * vAlpha);
        }
    `
};

export const StarStreaks = ({ count = 200, speed = 1.0, length = 1.0, size = 0.2, color = "#aaddff", opacity = 0.8 }: StarStreaksProps) => {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    // Store positions in a ref to update them
    const particles = useMemo(() => {
        const data = [];
        for (let i = 0; i < count; i++) {
            data.push({
                x: (Math.random() - 0.5) * 800,
                y: (Math.random() - 0.5) * 800,
                z: (Math.random() - 0.5) * 1000,
                scale: Math.random() * 0.5 + 0.5
            });
        }
        return data;
    }, [count]);

    // Attributes for Shader
    const offsets = useMemo(() => new Float32Array(count * 3), [count]);
    const scales = useMemo(() => new Float32Array(count), [count]);

    // Initialize attributes
    useMemo(() => {
        for (let i = 0; i < count; i++) {
            offsets[i * 3] = particles[i].x;
            offsets[i * 3 + 1] = particles[i].y;
            offsets[i * 3 + 2] = particles[i].z;
            scales[i] = particles[i].scale * size;
        }
    }, [particles, size]);

    useFrame((_state, _delta) => {
        // We only need this frame loop to keep the component alive or for other logic if needed.
        // The main logic is in the second useFrame below.
    });

    // Ref for previous rotation
    const prevRot = useRef(new THREE.Euler());

    useFrame((state, delta) => {
        if (!materialRef.current) return;

        const cam = state.camera;

        // Calculate Angular Velocity (Delta Rotation)
        const dy = cam.rotation.y - prevRot.current.y;
        const dx = cam.rotation.x - prevRot.current.x;

        prevRot.current.copy(cam.rotation);

        const rotScale = 4000.0;
        const vx = dy * rotScale * delta;
        const vy = dx * rotScale * delta;

        // Forward speed (Stars move +Z)
        const vz = speed * 2000 * delta;

        // Total Velocity Vector (per frame)
        const velocity = new THREE.Vector3(vx, vy, vz);

        // Update Shader
        materialRef.current.uniforms.velocity.value.copy(velocity);
        materialRef.current.uniforms.trailLength.value = length;

        // Update Positions (Wrap around)
        const positions = mesh.current!.geometry.attributes.offset.array as Float32Array;

        for (let i = 0; i < count; i++) {
            let x = positions[i * 3];
            let y = positions[i * 3 + 1];
            let z = positions[i * 3 + 2];

            x += velocity.x;
            y += velocity.y;
            z += velocity.z;

            // Wrap
            if (z > 500) z -= 1000;
            if (z < -500) z += 1000;

            if (x > 400) x -= 800;
            if (x < -400) x += 800;

            if (y > 400) y -= 800;
            if (y < -400) y += 800;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }

        mesh.current!.geometry.attributes.offset.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
            <boxGeometry args={[0.5, 0.5, 1]}>
                <instancedBufferAttribute
                    attach="attributes-offset"
                    args={[offsets, 3]}
                />
                <instancedBufferAttribute
                    attach="attributes-scale"
                    args={[scales, 1]}
                />
            </boxGeometry>
            <shaderMaterial
                ref={materialRef}
                args={[StreakShader]}
                transparent
                uniforms={{
                    color: { value: new THREE.Color(color) },
                    opacity: { value: opacity },
                    velocity: { value: new THREE.Vector3(0, 0, 1) },
                    trailLength: { value: length },
                    time: { value: 0 }
                }}
            />
        </instancedMesh>
    );
};
