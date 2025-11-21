# Universe Specifications

## 1. Rendering Rules

### Camera-Relative Positioning
- **Floating Origin**: To avoid floating-point precision errors at large distances, the world will shift around the camera. The camera stays near (0,0,0), and objects are moved relative to it.
- **Chunk System**: The universe is divided into cubic chunks (e.g., 1000 units wide). Only chunks within a certain radius of the camera are rendered.

### Level of Detail (LOD)
- **High Detail**: Objects within close range (e.g., < 500 units) use high-poly meshes and full shaders.
- **Medium Detail**: Objects at medium range (e.g., 500-2000 units) use simplified meshes and lower-res textures.
- **Low Detail / Impostors**: Distant objects are rendered as billboards or simple points of light.

### Shaders & Effects
- **Stars**: Procedural shaders for corona, surface turbulence, and glow.
- **Planets**: Atmospheric scattering (Rayleigh/Mie), cloud layers with shadows, and dynamic lighting.
- **Warp Effect**: Vertex shader deformation based on velocity vector. Motion blur using accumulation buffer or velocity buffer.

## 2. Spawn Rules

### Seeded Randomness
- **Algorithm**: Use a noise function (e.g., Simplex Noise or a seeded PRNG like Mulberry32) based on chunk coordinates.
- **Consistency**: `Seed(ChunkX, ChunkY, ChunkZ)` ensures the same system always generates in the same location.

### Star System Generation
- **Density**: ~10% chance of a star system per chunk.
- **Exclusion Zone**: Minimum distance between systems to prevent overlap.
- **Structure**:
    - Central Star (or binary pair)
    - Inner Zone (Rocky planets, hot)
    - Habitable Zone (Earth-like, water)
    - Outer Zone (Gas giants, ice giants)
    - Far Outer Zone (Ice planets, dwarf planets)

## 3. Object Definitions

### Stars
| Type | Color | Size | Temp | Probability |
|---|---|---|---|---|
| Blue Giant | Blue | Large | Hot | 5% |
| Yellow Dwarf | Yellow | Medium | Med | 40% |
| Red Dwarf | Red | Small | Cool | 40% |
| White Dwarf | White | Tiny | Hot | 10% |
| Neutron/Black Hole | Exotic | Varies | Varies | 5% |

### Planets
| Type | Zone | Characteristics | Moons |
|---|---|---|---|
| Lava | Inner | Glowing cracks, dark surface | 0-1 |
| Rocky | Inner/Hab | Craters, canyons | 0-2 |
| Earth-like | Hab | Oceans, continents, clouds | 1-3 |
| Gas Giant | Outer | Banded atmosphere, rings | 5-10 |
| Ice Giant | Outer | Blue/Cyan, smooth or stormy | 2-8 |
| Ice | Far Outer | White/Blue, reflective | 0-1 |

### Asteroid Belts
- **Formation**: Torus shape around the star or between planetary orbits.
- **Composition**: Instanced meshes of rocks/ice.
- **Density**: Variable based on noise.

## 4. Procedural Generation Logic

### Chunk Management
1.  **Calculate Current Chunk**: Based on camera position.
2.  **Identify Visible Chunks**: Loop through neighbor chunks within render distance.
3.  **Generate/Load**: If chunk not in memory, generate data using seed.
4.  **Unload**: Remove chunks outside unload distance.

### Coordinate System
- **Global Coordinates**: `(ChunkX * ChunkSize + LocalX, ...)`
- **Local Coordinates**: Position within the chunk.

## 5. Controls & Physics

### Movement
- **Velocity Vector**: Stores current speed and direction.
- **Acceleration**: Applied by input (WASD/Arrow keys).
- **Drag**: Gradual slowdown when no input (if inertial dampeners on).
- **Warp**: Multiplier to velocity, stretches visual effects.

### Orbit Mechanics
- **Keplerian Orbits**: Elliptical paths.
- **Update Loop**: `Angle += Speed * DeltaTime`.
- **Position**: `x = cos(Angle) * Radius`, `z = sin(Angle) * Radius`.

## 6. Performance Considerations
- **Instancing**: Use `InstancedMesh` for asteroid belts and distant stars.
- **Object Pooling**: Reuse objects instead of destroying/creating constantly.
- **Throttle Generation**: Limit how many chunks/systems are generated per frame to avoid stutter.
