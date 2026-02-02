# API Guide - Using the GW2 Decoration Editor

This guide shows you how to use the GW2 Decoration Editor's public API to perform common tasks.

## Table of Contents
1. [Loading a Layout](#loading-a-layout)
2. [Creating Layers](#creating-layers)
3. [Adding Decorations](#adding-decorations)
4. [Managing Selections](#managing-selections)
5. [Zoom and Pan](#zoom-and-pan)
6. [Exporting](#exporting)
7. [Working with Events](#working-with-events)
8. [Error Handling](#error-handling)

---

## Loading a Layout

### From XML File
```javascript
import { AppService } from './src/application/AppService.js';
import { LoadLayoutCommand } from './src/application/commands/LoadLayoutCommand.js';

// Initialize app service
const appService = new AppService();

// Read XML file content
const fileContent = await file.text();

// Create and execute command
const command = new LoadLayoutCommand(fileContent);
const result = appService.executeCommand(command);

console.log('Layout loaded:', result.layout.id);
console.log('Map:', result.layout.map.name);
console.log('Layers:', result.layout.layers.length);
```

### Handling Load Errors
```javascript
try {
  const command = new LoadLayoutCommand(xmlContent);
  const result = appService.executeCommand(command);
} catch (error) {
  if (error.message.includes('parsing')) {
    console.error('Invalid XML format');
  } else if (error.message.includes('required')) {
    console.error('Missing required layout elements');
  } else {
    console.error('Failed to load layout:', error.message);
  }
}
```

---

## Creating Layers

### Add a Single Layer
```javascript
import { CreateLayerCommand } from './src/application/commands/CreateLayerCommand.js';

const layoutId = 'layout-123';
const layerName = 'My Decorations';

const command = new CreateLayerCommand(layoutId, layerName);
const result = appService.executeCommand(command);

const newLayer = result.layer;
console.log('Layer created:', newLayer.id, newLayer.name);
```

### Create Multiple Layers
```javascript
const layerNames = ['Base Layer', 'Decorations', 'Markers'];
const layers = [];

for (const name of layerNames) {
  const command = new CreateLayerCommand(layoutId, name);
  const result = appService.executeCommand(command);
  layers.push(result.layer);
}

console.log(`Created ${layers.length} layers`);
```

### Rename a Layer
```javascript
import { RenameLayerCommand } from './src/application/commands/RenameLayerCommand.js';

const layerId = 'layer-456';
const newName = 'Updated Name';

const command = new RenameLayerCommand(layoutId, layerId, newName);
const result = appService.executeCommand(command);

console.log('Layer renamed:', result.layer.name);
```

### Delete a Layer
```javascript
import { DeleteLayerCommand } from './src/application/commands/DeleteLayerCommand.js';

const layerId = 'layer-456';

const command = new DeleteLayerCommand(layoutId, layerId);
appService.executeCommand(command);

console.log('Layer deleted');
```

### List All Layers
```javascript
import { GetLayersQuery } from './src/application/queries/GetLayersQuery.js';

const query = new GetLayersQuery(layoutId);
const result = appService.executeQuery(query);

const layers = result.layers;
layers.forEach(layer => {
  console.log(`${layer.name}: ${layer.decorations.length} decorations`);
});
```

---

## Adding Decorations

### Add a Single Decoration
```javascript
import { AddDecorationCommand } from './src/application/commands/AddDecorationCommand.js';
import { WorldCoordinate } from './src/domain/WorldCoordinate.js';

const decoration = {
  id: 'dec-' + Date.now(),
  name: 'Garden Statue',
  position: new WorldCoordinate(
    5632.5,      // x coordinate
    22048.75,    // y coordinate
    10.25,       // z (altitude)
    45           // rotation (0-360°)
  ),
  rotation: 0,   // object rotation (0-360°)
  scale: 1.0     // size multiplier
};

const command = new AddDecorationCommand(
  layoutId,
  layerId,
  decoration
);
const result = appService.executeCommand(command);

console.log('Decoration added:', result.decoration.id);
```

### Add Multiple Decorations
```javascript
const decorations = [
  {
    id: 'tree-1',
    name: 'Oak Tree',
    position: new WorldCoordinate(5700, 22100, 10, 0),
    rotation: 0,
    scale: 1.0
  },
  {
    id: 'stone-1',
    name: 'Stone Marker',
    position: new WorldCoordinate(5800, 22200, 10, 90),
    rotation: 90,
    scale: 0.8
  }
];

for (const dec of decorations) {
  const command = new AddDecorationCommand(layoutId, layerId, dec);
  appService.executeCommand(command);
}

console.log(`Added ${decorations.length} decorations`);
```

### Delete a Decoration
```javascript
import { DeleteDecorationCommand } from './src/application/commands/DeleteDecorationCommand.js';

const command = new DeleteDecorationCommand(
  layoutId,
  layerId,
  decorationId
);
appService.executeCommand(command);

console.log('Decoration deleted');
```

### Position in Game Coordinates

When placing decorations, use world coordinates directly from the game:

```javascript
// Player is at 5632.5, 22048.75 in world
// Looking at direction 45° (northeast)

const decoration = {
  id: 'shrine-1',
  name: 'Shrine',
  position: new WorldCoordinate(
    5632.5,   // From in-game coordinates
    22048.75,
    10.25,
    0
  ),
  rotation: 45,   // Direction it's facing
  scale: 1.0
};
```

---

## Managing Selections

### Get Active Layer
```javascript
import { SelectionStore } from './src/ui/stores/SelectionStore.js';

const selectionStore = new SelectionStore();
const activeLayerId = selectionStore.getActiveLayerId();

console.log('Active layer:', activeLayerId);
```

### Change Active Layer
```javascript
const newLayerId = 'layer-789';
selectionStore.setActiveLayerId(newLayerId);
```

### Get Selected Decoration
```javascript
const selectedDecId = selectionStore.getSelectedDecorationId();
console.log('Selected decoration:', selectedDecId);
```

### Change Selected Decoration
```javascript
selectionStore.setSelectedDecorationId('dec-123');
```

### Listen to Selection Changes
```javascript
selectionStore.onChange((event) => {
  console.log('Selection changed:', event.activeLayerId, event.selectedDecId);
});
```

---

## Zoom and Pan

### Initialize Zoom Store
```javascript
import { ZoomStore } from './src/ui/stores/ZoomStore.js';

const zoomStore = new ZoomStore();

// After scales are set up (typically from scaleFactory)
zoomStore.initialize(xZoom, yZoom, xZoomBase, yZoomBase);
```

### Zoom In/Out
```javascript
// Zoom in by 20%
const factor = 1.2;
const centerX = 1024;  // Screen center
const centerY = 768;
zoomStore.zoom(factor, centerX, centerY);

// Zoom out
zoomStore.zoom(0.8, centerX, centerY);
```

### Pan (Move View)
```javascript
// Pan right 100 pixels, down 50 pixels
zoomStore.pan(100, 50);

// Pan left and up
zoomStore.pan(-100, -50);
```

### Reset Zoom and Pan
```javascript
zoomStore.reset();
```

### Get Current Transform
```javascript
const transform = zoomStore.getTransform();
console.log('Scale:', transform.scaleX, transform.scaleY);
console.log('Pan:', transform.translateX, transform.translateY);
```

### Set Zoom Limits
```javascript
zoomStore.setZoomLimits(0.1, 10);  // min 0.1x, max 10x
```

### Undo/Redo Zoom
```javascript
// Undo last zoom/pan
if (zoomStore.canUndo()) {
  zoomStore.undo();
}

// Redo
if (zoomStore.canRedo()) {
  zoomStore.redo();
}
```

### Listen to Zoom Changes
```javascript
zoomStore.onChange((event) => {
  console.log('Zoom changed:', event.type);
  console.log('Transform:', event.transform);
});
```

---

## Exporting

### Export to XML
```javascript
import { XmlLayoutAdapter } from './src/infrastructure/XmlLayoutAdapter.js';

// Get layout from store
const appStore = new AppStore();
const layout = appStore.getLayout();

// Convert to DTO
const layoutDTO = layout.toDTO();

// Export to XML
const xmlAdapter = new XmlLayoutAdapter();
const xmlContent = xmlAdapter.toXml(layoutDTO);

// Save file
const blob = new Blob([xmlContent], { type: 'application/xml' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'layout.xml';
a.click();
```

### Export Specific Layer
```javascript
const appStore = new AppStore();
const layout = appStore.getLayout();
const layer = layout.layers.find(l => l.id === layerId);

const layerData = {
  id: layer.id,
  name: layer.name,
  decorations: layer.decorations.map(d => d.toDTO())
};

console.log('Layer data:', JSON.stringify(layerData, null, 2));
```

---

## Working with Events

### Subscribe to Layout Loaded
```javascript
import { EventBus } from './src/ui/EventBus.js';

const eventBus = new EventBus();

eventBus.subscribe('LayoutLoadedEvent', (event) => {
  console.log('Layout loaded:', event.layoutId);
  console.log('Map:', event.mapName);
  console.log('Layers:', event.layerCount);
});
```

### Subscribe to Layer Changes
```javascript
eventBus.subscribe('LayerCreatedEvent', (event) => {
  console.log('Layer created:', event.layerId, event.name);
});

eventBus.subscribe('LayerDeletedEvent', (event) => {
  console.log('Layer deleted:', event.layerId);
});

eventBus.subscribe('LayerRenamedEvent', (event) => {
  console.log(`Layer renamed: ${event.oldName} → ${event.newName}`);
});
```

### Subscribe to Decoration Changes
```javascript
eventBus.subscribe('DecorationAddedEvent', (event) => {
  console.log('Decoration added:', event.decorationId);
});

eventBus.subscribe('DecorationDeletedEvent', (event) => {
  console.log('Decoration deleted:', event.decorationId);
});
```

### Subscribe to Zoom Changes
```javascript
eventBus.subscribe('ZoomChangedEvent', (event) => {
  console.log('Zoom changed:', event.transform);
});
```

### Unsubscribe from Events
```javascript
const unsubscribe = eventBus.subscribe('LayerCreatedEvent', handler);

// Later, when done listening:
unsubscribe();
```

---

## Error Handling

### Validation Errors
```javascript
import { LayoutValidationService } from './src/domain/LayoutValidationService.js';

const validationService = new LayoutValidationService();

const layer = new Layer(new LayerId('layer-1'), '');  // Empty name
const result = validationService.validateLayer(layer);

if (!result.isValid) {
  result.errors.forEach(error => {
    console.error(`${error.field}: ${error.message}`);
  });
}
```

### Command Errors
```javascript
try {
  const command = new CreateLayerCommand('', 'My Layer');  // Empty layout ID
  appService.executeCommand(command);
} catch (error) {
  console.error('Command failed:', error.message);
  
  // Specific error handling
  if (error.message.includes('layout')) {
    console.error('Layout not found');
  } else if (error.message.includes('name')) {
    console.error('Invalid layer name');
  }
}
```

### File Loading Errors
```javascript
async function loadLayoutFile(file) {
  try {
    const content = await file.text();
    
    if (!content.trim()) {
      throw new Error('File is empty');
    }
    
    const command = new LoadLayoutCommand(content);
    const result = appService.executeCommand(command);
    
    return result.layout;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('Invalid XML:', error.message);
    } else {
      console.error('Failed to load layout:', error.message);
    }
    throw error;
  }
}
```

### Coordinate Validation
```javascript
import { WorldCoordinate } from './src/domain/WorldCoordinate.js';

try {
  const coord = new WorldCoordinate(5632, 22048, 0, 361);  // 361° invalid
} catch (error) {
  console.error('Invalid coordinate:', error.message);
}
```

---

## Complete Example: Load and Edit Layout

```javascript
import { AppService } from './src/application/AppService.js';
import { LoadLayoutCommand } from './src/application/commands/LoadLayoutCommand.js';
import { CreateLayerCommand } from './src/application/commands/CreateLayerCommand.js';
import { AddDecorationCommand } from './src/application/commands/AddDecorationCommand.js';
import { WorldCoordinate } from './src/domain/WorldCoordinate.js';

async function loadAndEditLayout(xmlFile) {
  const appService = new AppService();
  
  try {
    // 1. Load layout from file
    const xmlContent = await xmlFile.text();
    const loadCommand = new LoadLayoutCommand(xmlContent);
    const loadResult = appService.executeCommand(loadCommand);
    const layoutId = loadResult.layout.id;
    
    console.log('✓ Layout loaded:', loadResult.layout.map.name);
    
    // 2. Create new layer
    const createLayerCommand = new CreateLayerCommand(layoutId, 'My Garden');
    const layerResult = appService.executeCommand(createLayerCommand);
    const layerId = layerResult.layer.id;
    
    console.log('✓ Layer created:', layerResult.layer.name);
    
    // 3. Add decorations
    const decorations = [
      {
        id: 'tree-1',
        name: 'Oak Tree',
        position: new WorldCoordinate(5700, 22100, 10, 0),
        rotation: 0,
        scale: 1.0
      },
      {
        id: 'flower-1',
        name: 'Flower Patch',
        position: new WorldCoordinate(5750, 22150, 10, 0),
        rotation: 0,
        scale: 0.8
      }
    ];
    
    for (const dec of decorations) {
      const addCommand = new AddDecorationCommand(layoutId, layerId, dec);
      appService.executeCommand(addCommand);
      console.log('✓ Added decoration:', dec.name);
    }
    
    console.log('✓ All done! Created', decorations.length, 'decorations');
    
    return loadResult.layout;
  } catch (error) {
    console.error('✗ Error:', error.message);
    throw error;
  }
}

// Usage
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
  const layout = await loadAndEditLayout(e.target.files[0]);
});
```

---

## Best Practices

1. **Always validate input** before creating commands
2. **Handle errors gracefully** with try/catch
3. **Use event listeners** for UI updates, not polling
4. **Keep decorations in layers** for organization
5. **Use meaningful names** for layers and decorations
6. **Store coordinates in world space** in domain objects
7. **Convert coordinates only when needed** (for rendering)
8. **Unsubscribe from events** when components unmount
9. **Test commands independently** from UI
10. **Use undo/redo** for better UX

---

## Common Patterns

### Load → Create → Add → Export
```javascript
// See complete example above
```

### Batch Operations
```javascript
// Disable events during batch, then refresh UI once
const items = [...];
for (const item of items) {
  appService.executeCommand(new CreateItemCommand(item));
}
// UI updates once at the end
```

### Reactive UI Updates
```javascript
// Subscribe once, component updates automatically
appStore.onChange((state) => {
  renderLayers(state.layers);
  renderDecoration(state.activeDecoration);
});
```

### Validation Before Save
```javascript
const validationService = new LayoutValidationService();
const errors = validationService.validateLayout(layout);

if (errors.length > 0) {
  showErrorDialog(errors);
  return; // Don't save
}

// Safe to save
exportLayout(layout);
```
