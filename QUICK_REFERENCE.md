# Quick Reference Guide

A quick lookup guide for the GW2 Decoration Editor architecture.

## File Locations

### Domain Layer
- **Entities**: `src/domain/Decoration.js`, `src/domain/Layer.js`, `src/domain/GW2Map.js`, `src/domain/HomesteadLayout.js`
- **Value Objects**: `src/domain/WorldCoordinate.js`, `src/domain/MapCoordinate.js`, `src/domain/ScreenCoordinate.js`, `src/domain/ZoomLevel.js`, `src/domain/LayerId.js`
- **Domain Services**: `src/domain/CoordinateConversionService.js`, `src/domain/BoundaryCalculationService.js`, `src/domain/ZoomCalculationService.js`, `src/domain/LayoutValidationService.js`
- **Domain Events**: `src/domain/events/` directory

### Application Layer
- **Commands**: `src/application/commands/`
- **Handlers**: `src/application/handlers/`
- **Queries**: `src/application/queries/`
- **DTOs**: `src/application/dtos/`
- **Main Service**: `src/application/AppService.js`

### Infrastructure
- **Repositories**: `src/infrastructure/repositories/`
- **Adapters**: `src/infrastructure/adapters/`
- **Config**: `src/config/`

### UI Layer
- **Components**: `src/ui/components/`
- **Stores**: `src/ui/stores/`
- **Event System**: `src/ui/EventBus.js`
- **Helpers**: `src/ui/domHelpers.js`, `src/ui/renderHelpers.js`

### Documentation
- **Architecture**: `docs/architecture.md`
- **Domain Model**: `docs/domain-model.md`
- **Coordinates**: `docs/coordinate-systems.md`
- **API Usage**: `docs/api-guide.md`
- **Feature Dev**: `docs/adding-features.md`

---

## Common Workflows

### Loading a Layout
```javascript
const appService = new AppService();
const command = new LoadLayoutCommand(xmlContent);
const result = appService.executeCommand(command);
```

### Creating a Layer
```javascript
const command = new CreateLayerCommand(layoutId, 'Layer Name');
const result = appService.executeCommand(command);
```

### Adding a Decoration
```javascript
const decoration = {
  id: 'dec-1',
  name: 'My Decoration',
  position: new WorldCoordinate(5632, 22048, 0, 0),
  rotation: 45,
  scale: 1.0
};
const command = new AddDecorationCommand(layoutId, layerId, decoration);
const result = appService.executeCommand(command);
```

### Getting Data
```javascript
const query = new GetLayersQuery(layoutId);
const result = appService.executeQuery(query);
```

### Listening to Changes
```javascript
appStore.onChange((state) => {
  console.log('State changed:', state);
});

eventBus.subscribe('LayerCreatedEvent', (event) => {
  console.log('Layer created:', event.layerId);
});
```

---

## Architectural Patterns

| Pattern | File Location | Example |
|---------|---------------|---------|
| **Command** | `src/application/commands/` | `CreateLayerCommand` |
| **Query** | `src/application/queries/` | `GetLayersQuery` |
| **Handler** | `src/application/handlers/` | `CreateLayerHandler` |
| **Repository** | `src/infrastructure/repositories/` | `LayoutRepository` |
| **Adapter** | `src/infrastructure/adapters/` | `Gw2ApiAdapter` |
| **Value Object** | `src/domain/` | `WorldCoordinate` |
| **Entity** | `src/domain/` | `Decoration` |
| **Domain Service** | `src/domain/` | `CoordinateConversionService` |
| **Event** | `src/domain/events/` | `LayerCreatedEvent` |
| **Event Bus** | `src/ui/EventBus.js` | `EventBus` |
| **Store** | `src/ui/stores/` | `AppStore`, `ZoomStore` |

---

## Key Concepts

### Domain Layer (Pure Logic)
- No DOM, no HTTP, no UI frameworks
- Business rules and validations
- Immutable value objects
- Coordinate transformations
- Event publishing

### Application Layer (Thin Orchestration)
- Commands for state changes
- Queries for data retrieval
- Handlers execute commands/queries
- DTOs for data transfer
- AppService coordinates everything

### Infrastructure Layer (Pluggable)
- Repository pattern for data access
- Adapters for external services
- Cache implementations
- Configuration management

### UI Layer (Reactive)
- Components render based on stores
- Stores maintain application state
- Event bus for pub/sub
- Commands triggered by user actions
- Event subscriptions update UI

---

## Coordinate Systems at a Glance

| System | Used For | Properties |
|--------|----------|-----------|
| **World** | Storage, game position | x, y, z, rotation |
| **Map** | Map-local calculations | x, y |
| **Screen** | SVG/Canvas rendering | x, y (pixels) |
| **Continent** | GW2 API tiles | tileX, tileY, tileSize |

**Transformation Flow**:
```
World → Map (subtract origin)
      → Screen (apply zoom/pan)
      → SVG (render)
```

---

## Testing

### Run All Tests
```bash
# Open test.html in browser
# Uses QUnit framework
```

### Test Structure
```
tests/
├── domain/          # Unit tests for business logic
├── application/     # Unit tests for handlers
└── integration/     # End-to-end workflow tests
```

### Example Test
```javascript
QUnit.test('Layer should validate name', function(assert) {
  assert.throws(() => {
    new Layer(new LayerId('1'), ''); // Empty name
  });
});
```

---

## Common Commands

### Create a New Feature
1. Add domain logic to `src/domain/`
2. Create command in `src/application/commands/`
3. Create handler in `src/application/handlers/`
4. Wire UI in `src/ui/`
5. Add tests in `tests/`

### Add a Domain Service
```javascript
// src/domain/MyService.js
export class MyService {
  doSomething(input) {
    // Pure function, no side effects
    return result;
  }
}
```

### Add a Command Handler
```javascript
// src/application/handlers/MyCommandHandler.js
export class MyCommandHandler {
  constructor(repository, eventBus) {
    this.repository = repository;
    this.eventBus = eventBus;
  }

  handle(command) {
    // Validate
    // Call domain logic
    // Persist
    // Publish event
    return result;
  }
}
```

---

## Validation Rules

### Layer
- ✅ Name must be non-empty
- ✅ Cannot have duplicate decoration IDs
- ✅ Can contain 0+ decorations

### Decoration
- ✅ Must have unique ID in layer
- ✅ Position must be valid WorldCoordinate
- ✅ Rotation must be 0-360°
- ✅ Scale must be > 0

### Layout
- ✅ Must have at least one layer
- ✅ All layers must have unique IDs
- ✅ Must have map loaded

---

## Error Handling

### Domain Errors
```javascript
try {
  const layer = new Layer(id, ''); // Invalid name
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

### Command Errors
```javascript
try {
  const result = appService.executeCommand(command);
} catch (error) {
  if (error.message.includes('not found')) {
    // Handle not found
  }
}
```

### Validation Results
```javascript
const validation = validationService.validateLayout(layout);
if (!validation.isValid) {
  validation.errors.forEach(err => {
    console.error(`${err.field}: ${err.message}`);
  });
}
```

---

## Performance Tips

1. **Batch Operations**: Combine multiple changes into single command
2. **Memoization**: Domain services use pure functions (good for caching)
3. **Lazy Loading**: Load decorations only when needed
4. **Zoom Limits**: Set appropriate zoom constraints
5. **Cache GW2 API**: Use `LocalStorageCacheAdapter`

---

## Debugging

### Check Application State
```javascript
const appStore = new AppStore();
console.log('Current state:', appStore.getState());
```

### Monitor Events
```javascript
eventBus.subscribe('*', (event) => {
  console.log('Event:', event.type, event);
});
```

### Trace Command Execution
```javascript
class DebugAppService extends AppService {
  executeCommand(command) {
    console.log('Before:', this.getState());
    const result = super.executeCommand(command);
    console.log('After:', this.getState());
    return result;
  }
}
```

### Validate Objects
```javascript
try {
  layer.validate();
  layout.validate();
} catch (error) {
  console.error('Invalid:', error.message);
}
```

---

## Best Practices

✅ **DO**:
- Put business logic in domain layer
- Use value objects for immutability
- Keep handlers thin (10-20 lines)
- Publish events for side effects
- Subscribe to events for reactions
- Write tests for domain logic
- Keep domain pure (no side effects)
- Use DTOs for data transfer

❌ **DON'T**:
- Put DOM in domain layer
- Use global variables (use stores)
- Make handlers do business logic
- Directly mutate domain objects
- Skip validation
- Tightly couple UI to logic
- Create circular dependencies
- Modify repositories directly

---

## Documentation Map

```
Start Here ↓
├─ README.md (Overview)
│
├─ docs/
│  ├─ architecture.md (System design)
│  │  └─ For understanding the layers
│  │
│  ├─ domain-model.md (Entities & rules)
│  │  └─ For understanding business logic
│  │
│  ├─ coordinate-systems.md (Transformations)
│  │  └─ For working with positions
│  │
│  ├─ api-guide.md (Usage examples)
│  │  └─ For using the API
│  │
│  └─ adding-features.md (Development)
│     └─ For adding new features
│
└─ Source Code (src/)
   ├─ domain/ (Pure logic)
   ├─ application/ (Orchestration)
   ├─ infrastructure/ (Plugins)
   └─ ui/ (User interface)
```

---

## Cheat Sheet: Layer Responsibilities

### Domain Layer
**Question**: Does it contain business logic?  
**Answer**: Domain layer

**Question**: Does it validate data?  
**Answer**: Domain layer

**Question**: Is it a pure function?  
**Answer**: Domain layer

### Application Layer
**Question**: Does it coordinate domain and infrastructure?  
**Answer**: Application layer (handler)

**Question**: Does it transfer data?  
**Answer**: Application layer (DTO)

**Question**: Does it validate commands?  
**Answer**: Application layer

### Infrastructure Layer
**Question**: Does it call an external API?  
**Answer**: Infrastructure layer (adapter)

**Question**: Does it load/save data?  
**Answer**: Infrastructure layer (repository)

### UI Layer
**Question**: Does it interact with the DOM?  
**Answer**: UI layer

**Question**: Does it manage user state?  
**Answer**: UI layer (store)

**Question**: Does it handle user events?  
**Answer**: UI layer

---

## Quick Fixes

**Problem**: "Cannot read property 'x' of undefined"  
**Solution**: Check if coordinate is initialized: `if (coord && coord.x) { ... }`

**Problem**: "Layer not found"  
**Solution**: Verify layoutId and layerId in command

**Problem**: "Event not firing"  
**Solution**: Check event subscription is on EventBus instance

**Problem**: "Decoration not appearing"  
**Solution**: Check layer visibility and zoom level

**Problem**: "Test failing"  
**Solution**: Check mock objects have required methods

---

## Contact & Support

- Check [README.md](../README.md) for overview
- See [docs/api-guide.md](../docs/api-guide.md) for examples
- Review [docs/adding-features.md](../docs/adding-features.md) for development
- Check [tests/](../tests/) for working examples

---

**Last Updated**: February 6, 2026
