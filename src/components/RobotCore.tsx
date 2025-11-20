import { useEffect, useRef } from 'react';

export const RobotCore = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = canvas.offsetWidth;
        let height = canvas.height = canvas.offsetHeight;

        const vertices = [
            { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }, { x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 },
            { x: -1, y: -1, z: 1 }, { x: 1, y: -1, z: 1 }, { x: 1, y: 1, z: 1 }, { x: -1, y: 1, z: 1 },
        ];

        const edges = [
            [0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4],
            [0, 4], [1, 5], [2, 6], [3, 7], [0, 6], [1, 7], [2, 4], [3, 5]
        ];

        let angleX = 0, angleY = 0;
        let targetAngleX = 0, targetAngleY = 0;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            targetAngleY = (e.clientX - rect.left - width / 2) * 0.0005;
            targetAngleX = (e.clientY - rect.top - height / 2) * 0.0005;
        };

        document.addEventListener('mousemove', handleMouseMove);

        const project = (v: { x: number, y: number, z: number }) => {
            const fov = 350;
            const scale = 120;

            let x = v.x, y = v.y * Math.cos(angleX) - v.z * Math.sin(angleX), z = v.y * Math.sin(angleX) + v.z * Math.cos(angleX);
            let yNew = y, xNew = x * Math.cos(angleY) + z * Math.sin(angleY), zNew = -x * Math.sin(angleY) + z * Math.cos(angleY);

            const scaleProjected = fov / (fov + zNew + 4);
            return {
                x: xNew * scaleProjected * scale + width / 2,
                y: yNew * scaleProjected * scale + height / 2,
                scale: scaleProjected
            };
        };

        const loop = () => {
            ctx.clearRect(0, 0, width, height);

            // Smooth Rotation Damping
            angleX += (targetAngleX - angleX) * 0.05;
            angleY += (targetAngleY - angleY) * 0.05;

            // Idle Rotation
            angleY += 0.002;

            const projectedVertices = vertices.map(project);

            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';

            edges.forEach(edge => {
                const v1 = projectedVertices[edge[0]];
                const v2 = projectedVertices[edge[1]];
                const depth = (v1.scale + v2.scale) / 2;

                ctx.beginPath();
                ctx.moveTo(v1.x, v1.y);
                ctx.lineTo(v2.x, v2.y);
                ctx.globalAlpha = depth * 0.4;
                ctx.stroke();
            });

            projectedVertices.forEach(v => {
                ctx.globalAlpha = v.scale;
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(v.x, v.y, 3 * v.scale, 0, Math.PI * 2);
                ctx.fill();

                // Glow effect
                ctx.globalAlpha = v.scale * 0.2;
                ctx.beginPath();
                ctx.arc(v.x, v.y, 10 * v.scale, 0, Math.PI * 2);
                ctx.fill();
            });

            requestAnimationFrame(loop);
        };

        loop();

        const handleResize = () => {
            width = canvas.width = canvas.offsetWidth;
            height = canvas.height = canvas.offsetHeight;
        };
        window.addEventListener('resize', handleResize);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return <canvas ref={canvasRef} className="w-full h-[400px]" />;
};
