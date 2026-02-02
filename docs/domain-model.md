# GW2 Decoration Editor - Domain Model

## Entity Relationship Diagram

```
┌──────────────────────────────────┐
│     HomesteadLayout (AR)       │  AR = Aggregate Root
│                                  │
│  - id: string                    │
│  - map: GW2Map                   │
│  - layers: Layer[]               │
│                                  │
│  Methods:                        │
│  + addLayer(layer)               │
│  + removeLayer(layerId)          │
│  + validateMapLoaded()           │
│  + toDTO()                       │
└──────────────────────────────────┘
           │
           │ contains
           ↓
┌──────────────────────────────────┐
│      GW2Map (Entity)             │
│                                  │
│  - id: string                    │
│  - name: string                  │
│  - tiles: Tile[]                 │
│  - boundary: MapBoundary         │
│  - continent_id: number          │
│  - floor: number                 │
│                                  │
│  Methods:                        │
│  + validate()                    │
│  + getMapRect()                  │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│      Layer (Aggregate Root)      │
│                                  │
│  - id: LayerId                   │
│  - name: string                  │
│  - isVisible: boolean            │
│  - decorations: Decoration[]     │
│                                  │
│  Methods:                        │
│  + addDecoration(dec)            │
│  + removeDecoration(id)          │
│  + validate()                    │
│  + isEmpty()                     │
│  + toDTO()                       │
└──────────────────────────────────┘
           │
           │ contains
           ↓
┌──────────────────────────────────┐
│    Decoration (Entity)           │
│                                  │
│  - id: string                    │
│  - name: string                  │
│  - position: WorldCoordinate     │
│  - rotation: number              │
│  - scale: number                 │
│                                  │
│  Methods:                        │
│  + validate()                    │
│  + toDTO()                       │
└──────────────────────────────────┘


┌──────────────────────────────────┐
│     MapBoundary (Entity)         │
│                                  │
│  - points: Coordinate[]          │
│                                  │
│  Methods:                        │
│  + contains(coord)               │
│  + getBounds()                   │
│  + validate()                    │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│     SelectionSet (Value Object)  │
│                                  │
│  - selectedIds: Set<string>      │
│                                  │
│  Methods:                        │
│  + add(id)                       │
│  + remove(id)                    │
│  + has(id)                       │
│  + clear()                       │
│  + toArray()                     │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  LayoutConfiguration (Entity)    │
│                                  │
│  - panels: PanelLayout[]         │
│  - dockRegions: DockRegion[]     │
│                                  │
│  Methods:                        │
│  + validate()                    │
│  + toDTO()                       │
└──────────────────────────────────┘
```

## Value Objects

### Coordinate Hierarchy

```
       Coordinate (base)
              │
    ┌─────────┼─────────┬──────────────┐
    │         │         │              │
    ↓         ↓         ↓              ↓
  World    Map      Screen        Continent
Coordinate Coordinate Coordinate    Coordinate

 [x, y]    [x, y]    [x, y]        [x, y]
```

#### WorldCoordinate
- **Scope**: Absolute position in GW2 world
- **Properties**: `x, y, z, rotation`
- **Range**: Full GW2 world coordinates
- **Used by**: Decoration positions
- **Immutable**: Yes

```javascript
const pos = new WorldCoordinate(5632.5, 22048.75, 10.25, 45);
// x: 5632.5, y: 22048.75, z: 10.25, rotation: 45
```

#### MapCoordinate
- **Scope**: Position within a specific map
- **Properties**: `x, y`
- **Range**: Varies by map
- **Used by**: Rendering, calculations on specific maps
- **Immutable**: Yes

```javascript
const mapPos = new MapCoordinate(512.5, 256.75);
// x: 512.5, y: 256.75
```

#### ScreenCoordinate
- **Scope**: Position in SVG viewport
- **Properties**: `x, y`
- **Range**: Depends on viewport size
- **Used by**: SVG rendering
- **Immutable**: Yes

```javascript
const screenPos = new ScreenCoordinate(1024, 768);
// x: 1024, y: 768
```

#### ContinentCoordinate
- **Scope**: Position in continent tile system
- **Properties**: `tileX, tileY, tileSize`
- **Range**: 0-15 for both X and Y (16x16 grid)
- **Used by**: GW2 API tile system
- **Immutable**: Yes

```javascript
const tileCoord = new ContinentCoordinate(5, 8, 256);
```

### Other Value Objects

#### ZoomLevel
- **Properties**: `scaleX, scaleY`
- **Constraints**: min=0.1, max=10
- **Methods**: `validate()`, `copy()`

```javascript
const zoom = new ZoomLevel(1.5, 1.5);
zoom.validate(); // throws if outside constraints
```

#### LayerId
- **Properties**: `id`
- **Constraints**: must be non-empty string
- **Methods**: `validate()`, `equals(other)`

```javascript
const layerId = new LayerId('layer-1');
layerId.validate(); // throws if invalid
```

#### MapRect
- **Properties**: `minCoord, maxCoord` (Coordinates)
- **Methods**: `contains(coord)`, `size()`, `center()`

```javascript
const rect = new MapRect(
  new Coordinate(0, 0),
  new Coordinate(512, 512)
);
rect.contains(new Coordinate(256, 256)); // true
```

## Business Rules

### Layout Rules
```
HomesteadLayout {
  - Must have at least one layer (initially empty, but required)
  - Must have a map loaded before adding decorations
  - Cannot have duplicate layer names (recommended)
  - Cannot export without at least one decoration
}
```

### Layer Rules
```
Layer {
  - Name must be non-empty string (max 255 characters)
  - Cannot add decoration with duplicate ID
  - Cannot add decoration before layer exists
  - Visibility toggle must be boolean
  - Can contain 0+ decorations
}
```

### Decoration Rules
```
Decoration {
  - Must have unique ID within layer
  - Name must be non-empty string (max 255 characters)
  - Position must be valid WorldCoordinate
  - Rotation must be 0-360 degrees
  - Scale must be > 0 (typically 0.5-2.0)
  - Cannot be added to non-existent layer
}
```

### Coordinate Rules
```
WorldCoordinate {
  - X, Y should be within map bounds
  - Z should be within altitude limits
  - Rotation should be 0-360
}

MapCoordinate {
  - X, Y should be within current map bounds
  - Should be derivable from WorldCoordinate + map data
}

ScreenCoordinate {
  - X, Y should match viewport dimensions
  - Derived from MapCoordinate + zoom/pan state
}
```

## Domain Services

### CoordinateConversionService
Converts between coordinate systems without modifying domain objects.

```javascript
class CoordinateConversionService {
  continentToMap(continentCoord, mapFloorData): MapCoordinate
  mapToScreen(mapCoord, zoomState, scale): ScreenCoordinate
  screenToMap(screenCoord, zoomState, scale): MapCoordinate
  worldToMap(worldCoord, map): MapCoordinate
}
```

**Key**: Pure functions, no side effects, easily testable.

### BoundaryCalculationService
Calculates bounds and layout calculations.

```javascript
class BoundaryCalculationService {
  calculateBoundsFromBoundary(boundary): Rect
  calculateBoundsFromTiles(tiles): Rect
  expandBoundsToAspectRatio(bounds, viewportAspect): Rect
  centerBoundsInViewport(bounds, viewport): Rect
}
```

### ZoomCalculationService
Manages zoom limits and calculations.

```javascript
class ZoomCalculationService {
  calculateUniformScale(mapSize, viewportSize): number
  calculateZoomLimits(mapSize, viewportSize): {min, max}
  constrainZoom(currentZoom, min, max): ZoomLevel
  calculatePanAfterZoom(mousePos, currentZoom, newZoom, currentPan): {x, y}
}
```

### LayoutValidationService
Validates domain objects and returns detailed errors.

```javascript
class LayoutValidationService {
  validateDecoration(decoration): ValidationResult
  validateLayer(layer): ValidationResult
  validateLayout(layout): ValidationResult[]
}

// ValidationResult
{
  isValid: boolean,
  errors: [
    { field: 'name', message: 'Name is required' }
  ]
}
```

## Domain Events

All domain events extend from `DomainEvent`:

```javascript
class DomainEvent {
  aggregateId: string      // Root aggregate ID
  timestamp: Date
  version: number          // Event version
  type: string             // Event type
}
```

### Event Types

| Event | When | Data |
|-------|------|------|
| `LayoutLoadedEvent` | Layout loaded from XML | layoutId, map, layersCount |
| `LayerCreatedEvent` | Layer added to layout | layoutId, layerId, name |
| `LayerDeletedEvent` | Layer removed from layout | layoutId, layerId, name |
| `LayerRenamedEvent` | Layer name changed | layoutId, layerId, oldName, newName |
| `LayerSelectedEvent` | Active layer changed | layoutId, layerId |
| `LayerVisibilityToggledEvent` | Layer visibility toggled | layoutId, layerId, isVisible |
| `AllLayersClearedEvent` | All layers removed | layoutId |
| `DecorationAddedEvent` | Decoration added to layer | layoutId, layerId, decorationId |
| `DecorationDeletedEvent` | Single decoration removed | layoutId, layerId, decorationId |
| `DecorationsDeletedEvent` | Multiple decorations removed | layoutId, layerId, decorationIds |
| `DecorationsMovedEvent` | Decorations repositioned | layoutId, layerId, decorationIds |
| `DecorationUpdatedEvent` | Decoration properties changed | layoutId, layerId, decorationId |
| `MapSwitchedEvent` | Active map changed | layoutId, mapId |
| `ZoomChangedEvent` | Zoom/pan state changed | transform, zoomLimits |
| `PanChangedEvent` | Pan state changed | translateX, translateY |

## Aggregate Boundaries

### HomesteadLayout Aggregate
- **Root**: HomesteadLayout
- **Includes**: GW2Map, Layer (all), Decoration (all)
- **Invariants**:
  - Must have at least one layer
  - All layers must have unique IDs
  - All decorations must have unique IDs within their layer
  - Cannot modify map after layout loaded (immutable)

### Layer Aggregate
- **Root**: Layer
- **Includes**: All Decoration objects in layer
- **Invariants**:
  - Must have non-empty name
  - Cannot have duplicate decoration IDs
  - Visibility is boolean

### Decoration Entity
- **Parent**: Layer
- **No children**
- **Invariants**:
  - Must have unique ID within parent layer
  - Must have valid position
  - Rotation must be 0-360

## Value Object Equality

Value objects are compared by value, not identity:

```javascript
const coord1 = new WorldCoordinate(5632, 22048, 0, 0);
const coord2 = new WorldCoordinate(5632, 22048, 0, 0);

coord1 === coord2  // false (different objects)
coord1.equals(coord2)  // true (same values) - if implemented
```

## Entity Equality

Entities are compared by ID:

```javascript
const layer1 = new Layer(new LayerId('layer-1'), 'My Layer');
const layer2 = new Layer(new LayerId('layer-1'), 'My Layer');

layer1 === layer2  // false (different objects)
layer1.id.equals(layer2.id)  // true (same ID)
```

## Invariants and Constraints

### Schema
```javascript
HomesteadLayout {
  id: UUID,
  mapId: UUID,
  layers: [
    {
      id: UUID,
      name: string (1-255 chars),
      isVisible: boolean,
      decorations: [
        {
          id: UUID,
          name: string (1-255 chars),
          position: { x, y, z, rotation },
          rotation: number (0-360),
          scale: number (>0)
        }
      ]
    }
  ]
}
```

### Constraints Enforced in Domain
- ✅ Layer name not empty
- ✅ Decoration position valid
- ✅ No duplicate IDs within layer
- ✅ Rotation 0-360
- ✅ Scale > 0
- ✅ Layout has at least one layer

### Constraints Enforced in Application
- ✅ Cannot modify layout without command
- ✅ Commands validated before execution
- ✅ Events published for all changes

### Constraints Enforced in Infrastructure
- ✅ Layout persisted to XML with validation
- ✅ API responses validated before use

## Example: Creating a Complete Layout

```javascript
// Create map
const map = new GW2Map(
  '38',
  'Gilded Hollow',
  tiles,
  boundary,
  1,  // continent_id
  0   // floor
);

// Create layout aggregate
const layout = new HomesteadLayout(
  'layout-1',
  map,
  []  // empty layers initially
);

// Create layer
const layer = new Layer(
  new LayerId('layer-1'),
  'My Decorations'
);

// Create decorations
const decoration = new Decoration(
  'dec-1',
  'Garden',
  new WorldCoordinate(5632, 22048, 0, 0),
  0,    // rotation
  1.0   // scale
);

// Build aggregate
layer.addDecoration(decoration);
layout.addLayer(layer);

// Validate
layout.validate(); // throws if invalid

// Publish event
const event = new LayoutLoadedEvent('layout-1', map, 1);
eventBus.publish(event);

// Export
const layoutDTO = layout.toDTO();
```

## Testing Value Objects

```javascript
QUnit.test('WorldCoordinate should validate rotation', function(assert) {
  assert.throws(() => {
    new WorldCoordinate(0, 0, 0, 361); // > 360
  });
  
  const coord = new WorldCoordinate(0, 0, 0, 45);
  assert.strictEqual(coord.rotation, 45);
});
```

## Summary

The domain model uses:
- **Entities**: Objects with identity (Layer, Decoration, GW2Map)
- **Value Objects**: Objects with no identity (Coordinates, ZoomLevel)
- **Aggregates**: Clusters of related objects (Layout, Layer)
- **Domain Services**: Stateless operations (CoordinateConversion)
- **Domain Events**: Important business occurrences (LayerCreated)
- **Business Rules**: Enforced constraints and validations

All domain logic is framework-agnostic and easily testable.
