export const CHUNK_SIZE = 1000;
export const RENDER_DISTANCE = 4000; // Increased for better scale
export const UNLOAD_DISTANCE = 5000;

export const GENERATION = {
    STAR_SYSTEM_CHANCE: 0.15, // 15% chance per chunk
    MIN_STAR_RADIUS: 20,
    MAX_STAR_RADIUS: 100,
};

export const PHYSICS = {
    BASE_SPEED: 100,
    MAX_SPEED_MULTIPLIER: 10,
    ROTATION_SPEED: 1.5,
    ROLL_SPEED: 2.0,
    FRICTION: 0.95, // Inertial dampening
};
