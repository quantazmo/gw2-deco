/**
 * Coordinate Systems Documentation
 *
 * This module documents and explains all coordinate system transformations
 * used in the GW2 Decoration Editor. Understanding these systems is critical
 * for proper positioning and rendering of decorations.
 *
 * COORDINATE SYSTEMS IN GW2:
 *
 * 1. WORLD COORDINATE (WorldCoordinate)
 *    - 3D coordinates in Guild Wars 2 world space
 *    - Range: x, y = [-32768, 32768], z = altitude (variable)
 *    - Rotation: 0-360 degrees (yaw)
 *    - Properties: x, y, z, rotation
 *    - Used for: Storing final decoration positions in layouts
 *
 * 2. CONTINENT COORDINATE (ContinentCoordinate)
 *    - Grid coordinates on the continent tile system
 *    - Continent is divided into 7 zoom levels of tiles
 *    - Each tile represents a square area in continent space
 *    - Properties: x, y (tile grid coordinates), zoom level
 *    - Used for: Fetching the correct map tiles from GW2 API
 *    - Relationship: Continent [0, 32768] is subdivided into 2^7 = 128 tiles per dimension
 *
 * 3. MAP COORDINATE (MapCoordinate)
 *    - Local coordinate system within a specific map
 *    - Origin and range vary per map
 *    - Range depends on map_rect returned by GW2 API
 *    - Properties: x, y (local map space coordinates)
 *    - Used for: Positioning within a specific map's boundaries
 *
 * 4. SCREEN COORDINATE (ScreenCoordinate)
 *    - 2D coordinates in the SVG viewport/screen space
 *    - Origin: Top-left corner of the SVG container
 *    - Range: 0 to container width/height in pixels
 *    - Properties: x, y (pixel coordinates)
 *    - Used for: Rendering on screen and mouse position tracking
 *
 * TRANSFORMATION CHAIN:
 * =====================
 *
 * Workflow for displaying a decoration:
 *
 *   World Coordinate (stored in layout)
 *        ↓
 *   [API query uses continent coordinate]
 *        ↓
 *   Continent → Map conversion (via API floor data)
 *        ↓
 *   Map Coordinate
 *        ↓
 *   [Apply zoom/pan transforms]
 *        ↓
 *   Screen Coordinate (rendered to SVG)
 *
 * DETAILED TRANSFORMATIONS:
 * ========================
 *
 * 1. WORLD → CONTINENT (WorldCoordinate → ContinentCoordinate)
 *    This transformation is direct - World coordinates ARE continent coordinates
 *    in GW2 terms. However, we use distinct types for semantic clarity.
 *
 *    Formula:
 *      continentX = worldX
 *      continentY = worldY
 *
 *    Tile calculation (for zoom level 7, typical for detail):
 *      tileX = Math.floor(continentX / tileSize)
 *      tileY = Math.floor(continentY / tileSize)
 *      where tileSize = 32768 / Math.pow(2, 7) = 256
 *
 * 2. CONTINENT → MAP (via API floor data)
 *    The GW2 API returns transformation data in the floor response:
 *    - continent_rect: bounds of this map in continent coordinates [NW, SE]
 *    - map_rect: bounds of this map in map coordinates [SW, NE]
 *
 *    Transformation matrix calculated from these bounds:
 *      scale = (map_rect.width / continent_rect.width, map_rect.height / continent_rect.height)
 *      offset = (map_rect.min_x - continent_rect.min_x * scale.x, ...)
 *
 *      mapX = continentX * scale.x + offset.x
 *      mapY = continentY * scale.y + offset.y
 *
 *    CoordinateConversionService.continentToMap() implements this.
 *
 * 3. MAP → SCREEN (MapCoordinate → ScreenCoordinate)
 *    This involves:
 *    a) Accounting for map boundaries and viewport
 *    b) Applying zoom/scale transformation
 *    c) Applying pan/translation
 *
 *    Formula:
 *      // Step 1: Normalize to [0, 1] range
 *      normalized.x = (mapX - mapBounds.min.x) / mapBounds.width
 *      normalized.y = (mapY - mapBounds.min.y) / mapBounds.height
 *
 *      // Step 2: Scale to viewport
 *      scaledX = normalized.x * viewportWidth
 *      scaledY = normalized.y * viewportHeight
 *
 *      // Step 3: Apply zoom
 *      zoomedX = (scaledX - viewportCenter.x) * zoom + viewportCenter.x
 *      zoomedY = (scaledY - viewportCenter.y) * zoom + viewportCenter.y
 *
 *      // Step 4: Apply pan
 *      screenX = zoomedX + pan.x
 *      screenY = zoomedY + pan.y
 *
 *    CoordinateConversionService.mapToScreen() implements this.
 *
 * 4. SCREEN → MAP (Inverse transformation for mouse clicks)
 *    To find which map location the user clicked on:
 *
 *    Formula (inverse of MAP → SCREEN):
 *      // Step 1: Remove pan
 *      unPanX = screenX - pan.x
 *      unPanY = screenY - pan.y
 *
 *      // Step 2: Undo zoom
 *      unZoomedX = (unPanX - viewportCenter.x) / zoom + viewportCenter.x
 *      unZoomedY = (unPanY - viewportCenter.y) / zoom + viewportCenter.y
 *
 *      // Step 3: Scale to [0, 1] range
 *      normalized.x = unZoomedX / viewportWidth
 *      normalized.y = unZoomedY / viewportHeight
 *
 *      // Step 4: Scale to map bounds
 *      mapX = normalized.x * mapBounds.width + mapBounds.min.x
 *      mapY = normalized.y * mapBounds.height + mapBounds.min.y
 *
 *    CoordinateConversionService.screenToMap() implements this.
 *
 * EXAMPLE TRANSFORMATION SEQUENCE:
 * ================================
 *
 * Storing a decoration:
 *   1. User clicks on SVG at screen coordinates (500, 300)
 *   2. screenToMap() converts to map coords: (1245.5, 2340.2)
 *   3. Store in layout with world coords (approximately same as map coords for this map)
 *
 * Loading and displaying:
 *   1. Read world coords from layout: (1245.5, 2340.2)
 *   2. mapToScreen() with current zoom/pan: (520, 315)
 *   3. Render circle at (520, 315) on SVG canvas
 *
 * IMPORTANT NOTES:
 * ================
 *
 * - Some maps have scaling factors that differ from 1:1
 *   The API provides this via continent_rect and map_rect ratios
 *
 * - Y-axis orientation varies:
 *   GW2 world: Y increases northward (typical)
 *   SVG: Y increases downward
 *   Transformations must account for this flip
 *
 * - Zoom is typically applied around the viewport center, not world origin
 *   This ensures intuitive mouse wheel zoom behavior
 *
 * - Pan values can be negative (showing areas beyond map bounds initially)
 *   Viewport constraints should limit pan to reasonable ranges
 *
 * - Rotation (yaw) stored with world coordinates but not used for positioning
 *   Used by rendering system to orient decoration models if 3D rendering added
 *
 * COMMON PITFALLS:
 * ================
 *
 * 1. Forgetting to handle map_rect orientation (SW-NE vs NW-SE)
 *    → Always verify API response coordinate order
 *
 * 2. Not accounting for Y-axis flip between world and SVG
 *    → Decorations appear at wrong vertical position
 *
 * 3. Applying transformations in wrong order
 *    → Zoom BEFORE pan, not after (for zoom-around-point semantics)
 *
 * 4. Using integer division when pixel-perfect positioning needed
 *    → Keep coordinates as floats during calculations, round only at render
 *
 * 5. Assuming continent ≈ map coordinates
 *    → Some maps have significant scaling factors
 */

/**
 * Coordinate System Reference Sheet
 *
 * | System | Range | Origin | Used For |
 * |--------|-------|--------|----------|
 * | World | [-32768, 32768] | World center | Persistent storage |
 * | Continent | [0, 32768] | Top-left | API tile queries |
 * | Map | Variable (per map) | Varies (API defined) | Map-local positioning |
 * | Screen | [0, width] × [0, height] | Top-left | SVG rendering |
 *
 * Transformation Functions:
 * - CoordinateConversionService.continentToMap(c, mapData): MapCoordinate
 * - CoordinateConversionService.mapToScreen(m, zoom, pan): ScreenCoordinate
 * - CoordinateConversionService.screenToMap(s, zoom, pan): MapCoordinate
 * - [Inverse] screenToContinent via: screenToMap → mapToContinentEstimate
 */

// This is documentation-only; no exported code
// File serves as reference documentation for coordinate systems
