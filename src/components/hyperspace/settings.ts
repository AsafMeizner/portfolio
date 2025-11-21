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

// LOD (Level of Detail) configuration based on speed
export const LOD_THRESHOLDS = {
    LOW_SPEED: 0.3,      // Below 30% speed - full detail
    MEDIUM_SPEED: 0.6,   // 30-60% speed - medium detail
    HIGH_SPEED: 0.85,    // 60-85% speed - low detail
    // Above 85% - minimal detail
};

export const LOD_SETTINGS = {
    FULL_DETAIL: {
        geometrySegments: 64,
        enableChildren: true,
        enableEffects: true,
    },
    MEDIUM_DETAIL: {
        geometrySegments: 32,
        enableChildren: true,
        enableEffects: false,
    },
    LOW_DETAIL: {
        geometrySegments: 16,
        enableChildren: false,
        enableEffects: false,
    },
    MINIMAL_DETAIL: {
        geometrySegments: 8,
        enableChildren: false,
        enableEffects: false,
    },
};

// Directional loading - prioritize spawning ahead when moving fast
export const DIRECTIONAL_LOADING = {
    ENABLE_AT_SPEED: 0.5,        // Enable directional bias above 50% speed
    FORWARD_DISTANCE_MULTIPLIER: 2.5, // Multiply forward chunk range at high speed
    LATERAL_REDUCTION: 0.5,      // Reduce lateral chunk range at high speed
};
