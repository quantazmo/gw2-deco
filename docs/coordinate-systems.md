# Coordinate Systems Documentation

## Overview

The GW2 Decoration Editor works with **four different coordinate systems**, each serving a specific purpose in the application. Understanding these systems and how to convert between them is essential for implementing features correctly.

## The Four Coordinate Systems

### 1. World Coordinates
The **absolute position in the Guild Wars 2 game world**.

- **Scope**: Entire GW2 world
- **Units**: In-game units (typically 1 unit ≈ 1 cm)
- **Range**: Unbounded (can be very large)
- **Properties**: `x, y, z, rotation`
- **Example**: Position of a decoration placed in the homestead
- **Class**: `WorldCoordinate`

```
WorldCoordinate Example:
- x: 5632.5    (east-west position)
- y: 22048.75  (north-south position)  
- z: 10.25     (altitude/elevation)
- rotation: 45 (facing direction, 0-360°)

Used to store: Decoration positions from layouts
```

### 2. Map Coordinates
The **position within a specific GW2 map instance**.

- **Scope**: Single map (Gilded Hollow, etc.)
- **Units**: Map-relative units
- **Range**: [0, mapWidth] × [0, mapHeight]
- **Properties**: `x, y`
- **Example**: Position relative to the map's origin
- **Class**: `MapCoordinate`

```
MapCoordinate Example:
- x: 512.5   (from left edge of map)
- y: 256.75  (from top edge of map)

Derivation:
MapCoord = WorldCoord - MapOrigin
         = (5632.5 - 5120) = 512.5
         = (22048.75 - 20480) = 1568.75

Used for: Calculations within a specific map
```

### 3. Screen Coordinates
The **position in the SVG/Canvas viewport** on the user's screen.

- **Scope**: User's browser viewport
- **Units**: Pixels
- **Range**: [0, windowWidth] × [0, windowHeight]
- **Properties**: `x, y`
- **Example**: Where to draw on the canvas
- **Class**: `ScreenCoordinate`

```
ScreenCoordinate Example:
- x: 1024  (pixels from left edge of viewport)
- y: 768   (pixels from top edge of viewport)

Derivation:
ScreenCoord = (MapCoord × Zoom) + Pan

With zoom=2, pan=(100, 50):
ScreenX = (512.5 × 2) + 100 = 1225
ScreenY = (256.75 × 2) + 50 = 563.5

Used for: SVG/Canvas rendering
```

### 4. Continent Coordinates
The **tile-based system used by the GW2 API**.

- **Scope**: Entire continent (one per continent)
- **Units**: Tiles (typically 256×256 units each)
- **Range**: 0-15 for both X and Y (16×16 grid)
- **Properties**: `tileX, tileY, tileSize`
- **Example**: API returns map bounds in continent tiles
- **Class**: `ContinentCoordinate`

```
ContinentCoordinate Example:
- tileX: 5      (tile column)
- tileY: 8      (tile row)
- tileSize: 256 (units per tile)

Pixel position: 5 × 256 = 1280, 8 × 256 = 2048

Used for: GW2 API tile system, loading floor/region data
```

## Transformation Formulas

### World → Map
```javascript
mapCoord = worldCoord - mapOrigin

Example:
world: (5632.5, 22048.75)
map.origin: (5120, 20480)
result: (512.5, 1568.75)
```

### Map → Screen
```javascript
screenCoord = (mapCoord × zoom) + pan

Example:
map: (512.5, 256.75)
zoom: 1.5
pan: (100, 50)
result: (512.5 × 1.5 + 100, 256.75 × 1.5 + 50)
     = (869, 435)
```

### Screen → Map (Inverse)
```javascript
mapCoord = (screenCoord - pan) / zoom

Example:
screen: (869, 435)
zoom: 1.5
pan: (100, 50)
result: ((869 - 100) / 1.5, (435 - 50) / 1.5)
     = (512.67, 256.67)
```

### World → Screen (Combined)
```javascript
screenCoord = ((worldCoord - mapOrigin) × zoom) + pan

Example:
world: (5632.5, 22048.75)
mapOrigin: (5120, 20480)
zoom: 1.5
pan: (100, 50)
result: ((5632.5 - 5120) × 1.5 + 100, (22048.75 - 20480) × 1.5 + 50)
     = ((512.5) × 1.5 + 100, (1568.75) × 1.5 + 50)
     = (868.75, 2403.125)
```

### Continent Tile → World
```javascript
worldCoord = continentTile × tileSize

Example:
tileX: 5, tileY: 8
tileSize: 256
result: (5 × 256, 8 × 256) = (1280, 2048)
```

## Data Flow Diagram

```
┌─────────────────────┐
│  Game World        │
│  (Decoration)      │
│  WorldCoordinate   │
│  (5632, 22048, 0)  │
└──────────┬──────────┘
           │
           │ CoordinateConversionService
           │ .worldToMap(worldCoord, map)
           ↓
┌─────────────────────────────────┐
│      This Map (Gilded Hollow)   │
│      MapCoordinate              │
│      (512.5, 1568.75)           │
└──────────┬──────────────────────┘
           │
           │ CoordinateConversionService
           │ .mapToScreen(mapCoord, zoom, pan)
           ↓
┌─────────────────────┐
│  User's Screen      │
│  ScreenCoordinate   │
│  (868, 2403)        │
│                     │
│  ↓ Render to SVG    │
│  <circle cx="868"   │
│           cy="2403" │
│           r="10"/>  │
└─────────────────────┘
```

## Zoom and Pan

### Zoom (Scale)
Zoom changes the scale at which map coordinates are displayed.

```javascript
// No zoom
zoom = 1.0
mapX = 512 → screenX = 512

// 2x zoom (zoom in)
zoom = 2.0
mapX = 512 → screenX = 512 × 2 = 1024

// 0.5x zoom (zoom out)
zoom = 0.5
mapX = 512 → screenX = 512 × 0.5 = 256
```

### Pan (Translation)
Pan shifts the entire view by a fixed offset.

```javascript
// No pan
pan = (0, 0)
screenX = 512

// Pan right by 100
pan = (100, 0)
screenX = 512 + 100 = 612

// Pan down and left
pan = (-50, 150)
screenX = 512 - 50 = 462
screenY = 256 + 150 = 406
```

### Zoom with Pan Offset
When zooming, the pan offset must be adjusted to keep the zoom center fixed.

```javascript
// User zooms at point (800, 600) by factor 2
oldZoom = 1.0
newZoom = 2.0
factor = newZoom / oldZoom = 2.0
zoomCenter = (800, 600)

// Old pan offset
oldPan = (100, 50)

// Calculate offset change
// The point should stay in the same screen position
// offset = zoomCenter - (zoomCenter - oldOffset) × factor

newPan.x = zoomCenter.x - (zoomCenter.x - oldPan.x) × factor
         = 800 - (800 - 100) × 2
         = 800 - 1400
         = -600

newPan.y = zoomCenter.y - (zoomCenter.y - oldPan.y) × factor
         = 600 - (600 - 50) × 2
         = 600 - 1100
         = -500

Result: newPan = (-600, -500)
```

## Coordinate System Bounds

### World Coordinates
```
X: 0 to ~32768 (or larger for expanded maps)
Y: 0 to ~32768
Z: -1000 to 1000 (altitude, varies by map)
Rotation: 0 to 360 degrees
```

### Map Coordinates
```
X: mapBounds.min.x to mapBounds.max.x
Y: mapBounds.min.y to mapBounds.max.y
(Varies per map)
```

Example Gilded Hollow (id: 38):
```
Bounds: min=(5120, 20480), max=(10240, 25600)
Size: 5120 × 5120 units
```

### Screen Coordinates
```
X: 0 to window.innerWidth
Y: 0 to window.innerHeight
(Varies as window resizes)
```

### Continent Coordinates
```
TileX: 0 to 15
TileY: 0 to 15
TileSize: 256 (in world units)
```

## Common Operations

### Check if Position is on Map
```javascript
function isPositionOnMap(worldCoord, map) {
  const mapCoord = coordinateConversionService.worldToMap(worldCoord, map);
  const bounds = map.getBounds();
  return bounds.contains(mapCoord);
}
```

### Get Screen Position of Decoration
```javascript
function getDecorationScreenPos(decoration, map, zoom, pan) {
  const mapCoord = coordinateConversionService.worldToMap(
    decoration.position, 
    map
  );
  const screenCoord = coordinateConversionService.mapToScreen(
    mapCoord, 
    { scale: zoom, translate: pan }
  );
  return screenCoord;
}
```

### Handle Click on Canvas
```javascript
function onCanvasClick(screenX, screenY, zoom, pan) {
  // Screen → Map
  const mapCoord = coordinateConversionService.screenToMap(
    new ScreenCoordinate(screenX, screenY),
    { scale: zoom, translate: pan }
  );
  
  // Map → World
  const worldCoord = coordinateConversionService.mapToWorld(
    mapCoord,
    map
  );
  
  // Create decoration at world position
  const decoration = new Decoration(
    'new-' + Date.now(),
    'New Decoration',
    worldCoord,
    0,
    1.0
  );
}
```

### Calculate Zoom Level for Fit-to-Screen
```javascript
function calculateZoomToFit(mapBounds, viewportSize) {
  // Map is 5120 × 5120 for Gilded Hollow
  // Viewport is 1920 × 1080
  
  const mapWidth = mapBounds.max.x - mapBounds.min.x;
  const mapHeight = mapBounds.max.y - mapBounds.min.y;
  
  const zoomX = viewportSize.width / mapWidth;
  const zoomY = viewportSize.height / mapHeight;
  
  // Use smaller zoom to fit entire map
  const zoom = Math.min(zoomX, zoomY) * 0.95; // 0.95 for padding
  
  return zoom;
}
```

## Precision and Rounding

### When Converting Between Systems
- **World → Map**: Use full precision (float)
- **Map → Screen**: May round to integers for rendering
- **Screen → Map**: Use full precision to maintain accuracy
- **Store**: Always use float precision in domain model

```javascript
// Good: Store with full precision
const decoration = new Decoration(
  'dec1',
  'Garden',
  new WorldCoordinate(5632.5, 22048.75, 10.25, 45.5),
  30,
  1.5
);

// Rendering: Can round for SVG
<circle cx="868" cy="2403" r="10" />  // Rounded integers
```

## Edge Cases

### Division by Zero
When zoom = 0, screen-to-map conversion is impossible.
```javascript
// Check zoom level
if (zoom < 0.01) {
  throw new Error('Zoom level too small');
}
```

### Coordinates Outside Map Bounds
Decorations can exist at world coordinates outside the visible map boundary.
```javascript
// Check if in bounds before rendering
if (!mapBounds.contains(mapCoord)) {
  // Either skip rendering or show with different style
  return;
}
```

### Very Large Coordinate Values
GW2 API can return very large coordinates for expanded regions.
```javascript
// Use Number.MAX_SAFE_INTEGER checks
if (Math.abs(worldCoord.x) > Number.MAX_SAFE_INTEGER) {
  throw new Error('Coordinate value too large');
}
```

### Floating Point Precision
When chaining transformations, small rounding errors accumulate.
```javascript
// Instead of:
world → map → screen → map → world  // Lost precision

// Do:
world → map → screen  (forward)
screen → map → world  (direct reverse, not chained forward)
```

## Visualization

### Map Boundary Example
```
┌──────────────────────────────────┐
│                                  │
│  Map Space (Gilded Hollow)       │
│  min: (0, 0)                     │
│  max: (5120, 5120)               │
│                                  │
│  ┌─────────────────────────┐     │
│  │                         │     │
│  │  Decoration at          │     │
│  │  (512.5, 1568.75)       │     │
│  │  ●                      │     │
│  │                         │     │
│  └─────────────────────────┘     │
│                                  │
└──────────────────────────────────┘

       ↓ Apply Zoom: 1.5
       ↓ Apply Pan: (100, 50)

┌──────────────────────────────────┐
│                                  │
│  Screen Space (SVG Viewport)     │
│  width: 1920, height: 1080       │
│                                  │
│                                  │
│          ●  (869, 435)           │
│                                  │
│                                  │
│                                  │
│                                  │
│                                  │
└──────────────────────────────────┘
```

## Testing Coordinate Systems

```javascript
QUnit.test('worldToMap should convert coordinates correctly', function(assert) {
  const worldCoord = new WorldCoordinate(5632, 22048, 0, 0);
  const map = {
    getBounds: () => new MapRect(
      new Coordinate(5120, 20480),
      new Coordinate(10240, 25600)
    )
  };
  
  const result = service.worldToMap(worldCoord, map);
  
  assert.strictEqual(result.x, 512, 'X should be 512');
  assert.strictEqual(result.y, 1568, 'Y should be 1568');
});

QUnit.test('roundtrip conversion should preserve values', function(assert) {
  const original = new WorldCoordinate(5632.5, 22048.75, 0, 0);
  
  const mapCoord = service.worldToMap(original, map);
  const recovered = service.mapToWorld(mapCoord, map);
  
  assert.strictEqual(recovered.x, original.x, 'X should match');
  assert.strictEqual(recovered.y, original.y, 'Y should match');
});
```

## Summary

| System | Purpose | Units | Mutable |
|--------|---------|-------|---------|
| World | Store decoration data | In-game units | No (VO) |
| Map | Calculate within map | Map-relative | No (VO) |
| Screen | Render to viewport | Pixels | No (VO) |
| Continent | GW2 API tiles | Tiles | No (VO) |

- **Use WorldCoordinate** for storing decoration positions
- **Use MapCoordinate** for map-specific calculations
- **Use ScreenCoordinate** for SVG/Canvas rendering
- **Use ContinentCoordinate** when working with GW2 API
- **Use CoordinateConversionService** for all transformations
