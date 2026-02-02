# Adding Features to the GW2 Decoration Editor

This guide walks through the process of adding a new feature to the application using the clean architecture pattern. We'll use "Duplicate Layer" as an example.

## Table of Contents
1. [Overview](#overview)
2. [Step 1: Understand Requirements](#step-1-understand-requirements)
3. [Step 2: Implement Domain Logic](#step-2-implement-domain-logic)
4. [Step 3: Create Command & Handler](#step-3-create-command--handler)
5. [Step 4: Wire UI](#step-4-wire-ui)
6. [Step 5: Add Tests](#step-5-add-tests)
7. [Step 6: Update Documentation](#step-6-update-documentation)
8. [Common Scenarios](#common-scenarios)

---

## Overview

### The Process

```
1. Requirements
   ↓
2. Domain Logic (Business Rules)
   ↓
3. Application Layer (Commands/Queries)
   ↓
4. UI Layer (Components/Events)
   ↓
5. Tests
   ↓
6. Documentation
```

### Key Principle
**Put business logic in the domain layer, keep application and UI layers thin.**

---

## Step 1: Understand Requirements

Before coding, clearly define what needs to happen.

### Example: "Duplicate Layer" Feature

**Requirement**: 
- User can right-click on a layer and select "Duplicate"
- New layer contains all decorations from original
- New layer gets a unique name (e.g., "Layer Name (Copy)")
- New layer is inserted right after original layer
- All decoration IDs are regenerated to ensure uniqueness

**Business Rules**:
- New layer must validate (name, decorations valid)
- Original layer cannot be modified
- Decorations must be deep-copied
- Layer IDs must be unique within layout
- Event published for auditing/undo

**Inputs**:
- layoutId: string
- layerId: string (of layer to duplicate)

**Outputs**:
- newLayer: Layer (the duplicated layer)

**Error Cases**:
- Layout not found
- Layer not found
- Name generation conflict (though unlikely)

---

## Step 2: Implement Domain Logic

Add methods to domain entities to support the feature.

### Option A: Add to Layer Entity

```javascript
// src/domain/Layer.js

export class Layer {
  constructor(id, name, isVisible = true) {
    this.id = id;
    this.name = name;
    this.isVisible = isVisible;
    this.decorations = [];
  }

  /**
   * Create a deep copy of this layer with new ID
   * @param {LayerId} newId - ID for the new layer
   * @param {string} newName - Name for the new layer
   * @returns {Layer} New layer with copied decorations
   */
  duplicate(newId, newName) {
    if (!newId) {
      throw new Error('newId required');
    }
    if (!newName || newName.trim() === '') {
      throw new Error('newName required');
    }

    const copy = new Layer(newId, newName, this.isVisible);

    // Deep copy decorations with new IDs
    for (const decoration of this.decorations) {
      const newDecId = 'dec-' + Date.now() + '-' + Math.random();
      const newDec = new Decoration(
        newDecId,
        decoration.name,
        decoration.position,
        decoration.rotation,
        decoration.scale
      );
      copy.decorations.push(newDec);
    }

    return copy;
  }
}
```

### Option B: Add to HomesteadLayout Aggregate

```javascript
// src/domain/HomesteadLayout.js

export class HomesteadLayout {
  // ... existing code ...

  /**
   * Duplicate a layer within this layout
   * @param {string} layerId - ID of layer to duplicate
   * @returns {Layer} The new duplicated layer
   */
  duplicateLayer(layerId) {
    const layer = this.layers.find(l => l.id.equals(layerId));
    if (!layer) {
      throw new Error(`Layer not found: ${layerId}`);
    }

    // Generate unique new ID
    const newId = new LayerId('layer-' + Date.now());
    
    // Generate unique new name
    let newName = layer.name + ' (Copy)';
    let counter = 1;
    while (this.layers.some(l => l.name === newName)) {
      newName = layer.name + ` (Copy ${counter})`;
      counter++;
    }

    // Duplicate the layer
    const newLayer = layer.duplicate(newId, newName);
    
    // Validate before adding
    newLayer.validate();

    return newLayer;
  }
}
```

Choose the approach based on encapsulation:
- **Layer.duplicate()** if logic is about the layer itself
- **Layout.duplicateLayer()** if layout rules apply (uniqueness, ordering)

---

## Step 3: Create Command & Handler

### Create the Command

```javascript
// src/application/commands/DuplicateLayerCommand.js

/**
 * Command to duplicate an existing layer
 */
export class DuplicateLayerCommand {
  /**
   * @param {string} layoutId - ID of layout
   * @param {string} layerId - ID of layer to duplicate
   */
  constructor(layoutId, layerId) {
    if (!layoutId || typeof layoutId !== 'string') {
      throw new Error('layoutId is required');
    }
    if (!layerId || typeof layerId !== 'string') {
      throw new Error('layerId is required');
    }

    this.layoutId = layoutId;
    this.layerId = layerId;
  }
}
```

### Create the Handler

```javascript
// src/application/handlers/DuplicateLayerHandler.js

import { LayerCreatedEvent } from '../../domain/events/LayerCreatedEvent.js';

export class DuplicateLayerHandler {
  /**
   * @param {LayoutRepository} layoutRepository
   * @param {EventBus} eventBus
   */
  constructor(layoutRepository, eventBus) {
    this.layoutRepository = layoutRepository;
    this.eventBus = eventBus;
  }

  /**
   * Handle duplicate layer command
   * @param {DuplicateLayerCommand} command
   * @returns {Object} { layer: Layer, originalLayer: Layer }
   */
  handle(command) {
    if (!command) {
      throw new Error('command is required');
    }

    // Load layout
    const layout = this.layoutRepository.getById(command.layoutId);
    if (!layout) {
      throw new Error(`Layout not found: ${command.layoutId}`);
    }

    // Perform duplication in domain
    const newLayer = layout.duplicateLayer(command.layerId);

    // Add new layer to layout (update aggregate)
    layout.addLayer(newLayer);

    // Persist changes
    this.layoutRepository.save(layout);

    // Publish event
    const event = new LayerCreatedEvent(
      command.layoutId,
      newLayer.id,
      newLayer.name
    );
    this.eventBus.publish(event);

    return {
      layer: newLayer,
      layoutId: command.layoutId
    };
  }
}
```

### Register with AppService

```javascript
// src/application/AppService.js

import { DuplicateLayerHandler } from './handlers/DuplicateLayerHandler.js';
import { DuplicateLayerCommand } from './commands/DuplicateLayerCommand.js';

export class AppService {
  constructor(layoutRepository, eventBus) {
    this.handlers = {
      // Existing handlers...
      [DuplicateLayerCommand.name]: new DuplicateLayerHandler(layoutRepository, eventBus)
    };
  }

  executeCommand(command) {
    const handler = this.handlers[command.constructor.name];
    if (!handler) {
      throw new Error(`No handler for command: ${command.constructor.name}`);
    }
    return handler.handle(command);
  }
}
```

---

## Step 4: Wire UI

### Add UI Control

```javascript
// src/ui/components/LayerPanel.js

export class LayerPanel {
  renderLayerItem(layer) {
    const div = document.createElement('div');
    div.className = 'layer-item';
    
    // ... existing rendering ...
    
    // Add context menu or duplicate button
    const duplicateBtn = document.createElement('button');
    duplicateBtn.className = 'btn-duplicate';
    duplicateBtn.textContent = '⎘ Duplicate';
    duplicateBtn.onclick = () => this.onDuplicateClick(layer.id);
    
    div.appendChild(duplicateBtn);
    return div;
  }

  onDuplicateClick(layerId) {
    try {
      // Get layout ID from app store
      const appStore = this.appStore;
      const layoutId = appStore.getState().layout.id;

      // Create and execute command
      const command = new DuplicateLayerCommand(layoutId, layerId);
      const result = this.appService.executeCommand(command);

      // UI updates automatically via event subscription
      console.log('Layer duplicated:', result.layer.id);
    } catch (error) {
      this.showError('Failed to duplicate layer: ' + error.message);
    }
  }
}
```

### Wire Event Subscription

```javascript
// src/ui/components/LayerPanel.js

export class LayerPanel {
  constructor(appService, eventBus) {
    this.appService = appService;
    this.eventBus = eventBus;

    // Subscribe to layer changes
    this.eventBus.subscribe('LayerCreatedEvent', (event) => {
      this.onLayerCreated(event);
    });
  }

  onLayerCreated(event) {
    // Re-render layers list
    this.render();
  }
}
```

---

## Step 5: Add Tests

### Unit Test: Domain Logic

```javascript
// tests/domain/Layer.test.js

import { Layer } from '../../src/domain/Layer.js';
import { LayerId } from '../../src/domain/LayerId.js';
import { Decoration } from '../../src/domain/Decoration.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';

describe('Layer.duplicate', () => {
  it('should copy all decorations', () => {
    const layer = new Layer(new LayerId('layer-1'), 'Original');

    const dec1 = new Decoration(
      'dec-1',
      'Tree',
      new WorldCoordinate(100, 200, 0, 0),
      0,
      1.0
    );
    const dec2 = new Decoration(
      'dec-2',
      'Flower',
      new WorldCoordinate(150, 250, 0, 0),
      0,
      0.8
    );

    layer.addDecoration(dec1);
    layer.addDecoration(dec2);

    const copy = layer.duplicate(
      new LayerId('layer-2'),
      'Copy'
    );

    expect(copy.name).toBe('Copy');
    expect(copy.decorations).toHaveLength(2);
    expect(copy.decorations[0].name).toBe('Tree');
    expect(copy.decorations[0].id).not.toBe(dec1.id);
  });

  it('should produce an independent copy', () => {
    const layer = new Layer(new LayerId('layer-1'), 'Original');
    const dec = new Decoration('dec-1', 'Tree', new WorldCoordinate(100, 200, 0, 0), 0, 1.0);
    layer.addDecoration(dec);

    const copy = layer.duplicate(new LayerId('layer-2'), 'Copy');

    copy.addDecoration(
      new Decoration('dec-3', 'Flower', new WorldCoordinate(150, 250, 0, 0), 0, 0.8)
    );

    expect(layer.decorations).toHaveLength(1);
    expect(copy.decorations).toHaveLength(2);
  });
});
```

### Unit Test: Handler

```javascript
// tests/application/DuplicateLayerHandler.test.js

import { DuplicateLayerHandler } from '../../src/application/handlers/DuplicateLayerHandler.js';
import { DuplicateLayerCommand } from '../../src/application/commands/DuplicateLayerCommand.js';
import { Layer } from '../../src/domain/Layer.js';
import { LayerId } from '../../src/domain/LayerId.js';

describe('DuplicateLayerHandler', () => {
  it('should duplicate a layer', () => {
    const mockRepo = {
      getById: () => ({
        duplicateLayer: () => new Layer(new LayerId('layer-2'), 'Original (Copy)'),
        addLayer: () => {},
        validate: () => {}
      }),
      save: () => {}
    };
    const mockBus = { publish: () => {} };

    const handler = new DuplicateLayerHandler(mockRepo, mockBus);
    const command = new DuplicateLayerCommand('layout-1', 'layer-1');

    const result = handler.handle(command);

    expect(result.layer).toBeDefined();
    expect(result.layer.name).toBe('Original (Copy)');
  });

  it('should throw if layout not found', () => {
    const mockRepo = { getById: () => null };

    const handler = new DuplicateLayerHandler(mockRepo, {});
    const command = new DuplicateLayerCommand('layout-1', 'layer-1');

    expect(() => handler.handle(command)).toThrow();
  });
});
```

### Integration Test

```javascript
// tests/integration/DuplicateLayerWorkflow.test.js

import { DuplicateLayerHandler } from '../../src/application/handlers/DuplicateLayerHandler.js';
import { DuplicateLayerCommand } from '../../src/application/commands/DuplicateLayerCommand.js';
import { CreateLayerCommand } from '../../src/application/commands/CreateLayerCommand.js';
import { CreateLayerHandler } from '../../src/application/handlers/CreateLayerHandler.js';

describe('Duplicate layer workflow', () => {
  it('should produce a distinct layer with a (Copy) name', () => {
    const createHandler = new CreateLayerHandler();
    const createResult = createHandler.handle(
      new CreateLayerCommand('layout-1', 'My Layer')
    );
    const layerId = createResult.layer.id;

    const duplicateHandler = new DuplicateLayerHandler(
      { getById: () => createResult.layout, save: () => {} },
      { publish: () => {} }
    );
    const dupResult = duplicateHandler.handle(
      new DuplicateLayerCommand('layout-1', layerId)
    );

    expect(dupResult.layer).toBeDefined();
    expect(dupResult.layer.id).not.toBe(layerId);
    expect(dupResult.layer.name).toContain('Copy');
  });
});
```

---

## Step 6: Update Documentation

### Update API Guide

Add new section to [api-guide.md](./api-guide.md):

```markdown
### Duplicate a Layer

```javascript
import { DuplicateLayerCommand } from './src/application/commands/DuplicateLayerCommand.js';

const command = new DuplicateLayerCommand(layoutId, layerId);
const result = appService.executeCommand(command);

console.log('Layer duplicated:', result.layer.id);
```
```

### Update Architecture Doc

Add to sequence diagram or data flow section.

### Add Comment to Code

```javascript
// src/domain/Layer.js

/**
 * Duplicate this layer with all its decorations
 * 
 * Useful for:
 * - Creating variations of layer configurations
 * - Quick setup of similar decoration patterns
 * 
 * Example:
 *   const original = layout.layers[0];
 *   const copy = original.duplicate(newId, 'Copy');
 *   layout.addLayer(copy);
 */
duplicate(newId, newName) {
  // ... implementation ...
}
```

---

## Common Scenarios

### Scenario 1: Read-Only Query (Get Data)

Instead of a Command, use a Query:

```javascript
// src/application/queries/GetLayerDecorationCountQuery.js
export class GetLayerDecorationCountQuery {
  constructor(layoutId, layerId) {
    this.layoutId = layoutId;
    this.layerId = layerId;
  }
}

// src/application/handlers/GetLayerDecorationCountHandler.js
export class GetLayerDecorationCountHandler {
  handle(query) {
    const layout = this.repo.getById(query.layoutId);
    const layer = layout.layers.find(l => l.id === query.layerId);
    return { count: layer.decorations.length };
  }
}

// Usage
const query = new GetLayerDecorationCountQuery(layoutId, layerId);
const result = appService.executeQuery(query);
console.log('Decoration count:', result.count);
```

### Scenario 2: Modify Multiple Objects

Use a compound command or transaction:

```javascript
// src/application/commands/BatchAddDecorationsCommand.js
export class BatchAddDecorationsCommand {
  constructor(layoutId, layerId, decorations) {
    this.layoutId = layoutId;
    this.layerId = layerId;
    this.decorations = decorations; // Array
  }
}

// src/application/handlers/BatchAddDecorationsHandler.js
export class BatchAddDecorationsHandler {
  handle(command) {
    const layout = this.repo.getById(command.layoutId);
    const layer = layout.layers.find(l => l.id === command.layerId);
    
    const results = [];
    for (const dec of command.decorations) {
      layer.addDecoration(dec);
      results.push(dec);
    }
    
    layout.validate();
    this.repo.save(layout);
    
    // Publish one event per decoration
    for (const dec of results) {
      this.eventBus.publish(new DecorationAddedEvent(
        command.layoutId,
        command.layerId,
        dec.id
      ));
    }
    
    return { decorations: results };
  }
}
```

### Scenario 3: Custom Business Logic

Add a Domain Service:

```javascript
// src/domain/LayerDeduplicationService.js
export class LayerDeduplicationService {
  /**
   * Remove duplicate decorations from layer
   * (keeps first occurrence)
   */
  deduplicateByName(layer) {
    const seen = new Set();
    const unique = [];
    
    for (const dec of layer.decorations) {
      if (!seen.has(dec.name)) {
        seen.add(dec.name);
        unique.push(dec);
      }
    }
    
    layer.decorations = unique;
    return layer;
  }
}

// Usage in handler
const deduplicator = new LayerDeduplicationService();
deduplicator.deduplicateByName(layer);
```

### Scenario 4: Validation Service

```javascript
// src/domain/DuplicateLayerValidationService.js
export class DuplicateLayerValidationService {
  validate(layer, layout) {
    const errors = [];
    
    if (!layer) {
      errors.push({ field: 'layer', message: 'Layer not found' });
    }
    
    if (layer.decorations.length === 0) {
      errors.push({ field: 'decorations', message: 'Layer has no decorations to copy' });
    }
    
    return { isValid: errors.length === 0, errors };
  }
}

// Use in handler
const validation = this.validationService.validate(layer, layout);
if (!validation.isValid) {
  throw new Error(validation.errors.map(e => e.message).join(', '));
}
```

---

## Checklist: Before Marking Feature Complete

- [ ] Domain logic implemented (Layer/Layout methods)
- [ ] Command created with validation
- [ ] Handler created and registered in AppService
- [ ] UI component updated or created
- [ ] Event published for side effects
- [ ] Event subscription in UI
- [ ] Unit tests for domain logic
- [ ] Unit tests for handler
- [ ] Integration test for complete workflow
- [ ] UI tested manually
- [ ] Error cases handled gracefully
- [ ] Documentation updated (API guide, architecture)
- [ ] Code comments added
- [ ] No console errors or warnings
- [ ] Undo/redo works if applicable

---

## Tips & Tricks

1. **Test domains in isolation** - Use unit tests, no mocks needed
2. **Mock repositories in handler tests** - Focus on handler logic
3. **Use integration tests** for real workflows
4. **Events are free** - Publish generously for auditing/undo
5. **Keep handlers thin** - 10-20 lines max
6. **Domain entities should validate themselves**
7. **Use clear naming** - `duplicateLayer()` not `dup()`
8. **Document business rules** in domain classes
9. **Consider edge cases** - Empty layers, no decorations, etc.
10. **Use enums for constants** - Don't hardcode strings

---

## Reference

- [Architecture.md](./architecture.md) - System design
- [Domain-Model.md](./domain-model.md) - Entity definitions
- [API-Guide.md](./api-guide.md) - Using the API
