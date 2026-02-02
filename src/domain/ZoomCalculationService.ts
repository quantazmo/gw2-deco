/**
 * ZoomCalculationService - Domain Service for zoom level and pan calculations
 */
import { ZoomLevel } from './ZoomLevel.ts';

export class ZoomCalculationService {
    /**
     * Calculate uniform scale to fit content in viewport while maintaining aspect ratio
     * @param {Object} mapSize - {width, height} in map units
     * @param {Object} viewportSize - {width, height} in pixels
     * @returns {number} - Scale factor
     */
    static calculateUniformScale(mapSize: { width: number; height: number }, viewportSize: { width: number; height: number }): number {
        if (!mapSize || typeof mapSize.width !== 'number') {
            throw new Error('ZoomCalculationService.calculateUniformScale: invalid mapSize');
        }
        if (!viewportSize || typeof viewportSize.width !== 'number') {
            throw new Error('ZoomCalculationService.calculateUniformScale: invalid viewportSize');
        }
        if (mapSize.width <= 0 || mapSize.height <= 0) {
            throw new Error('ZoomCalculationService.calculateUniformScale: map dimensions must be positive');
        }
        if (viewportSize.width <= 0 || viewportSize.height <= 0) {
            throw new Error('ZoomCalculationService.calculateUniformScale: viewport dimensions must be positive');
        }

        const scaleX = viewportSize.width / mapSize.width;
        const scaleY = viewportSize.height / mapSize.height;

        // Use the smaller scale to ensure the entire map fits
        return Math.min(scaleX, scaleY);
    }

    /**
     * Calculate zoom limits (min and max) based on map and viewport size
     * @param {Object} mapSize - {width, height} in map units
     * @param {Object} viewportSize - {width, height} in pixels
     * @param {number} maxZoom - Maximum zoom multiplier (default 10)
     * @returns {Object} - {min: minZoom, max: maxZoom}
     */
    static calculateZoomLimits(mapSize: { width: number; height: number }, viewportSize: { width: number; height: number }, maxZoom: number = 10) {
        if (!mapSize || typeof mapSize.width !== 'number') {
            throw new Error('ZoomCalculationService.calculateZoomLimits: invalid mapSize');
        }
        if (!viewportSize || typeof viewportSize.width !== 'number') {
            throw new Error('ZoomCalculationService.calculateZoomLimits: invalid viewportSize');
        }
        if (typeof maxZoom !== 'number' || maxZoom <= 0) {
            throw new Error('ZoomCalculationService.calculateZoomLimits: maxZoom must be positive');
        }

        const baseScale = this.calculateUniformScale(mapSize, viewportSize);

        // Minimum zoom: fit entire map in viewport
        const minZoom = baseScale;

        // Maximum zoom: allow zooming in significantly
        // Ensure a minimum reasonable zoom level of at least 4 for usability
        const maxZoomLevel = Math.max(4, baseScale * maxZoom);

        return {
            min: Math.max(0.1, minZoom),
            max: maxZoomLevel
        };
    }

    /**
     * Constrain a zoom level to be within min/max bounds
     * @param {number} currentZoom - Current zoom value
     * @param {number} minZoom - Minimum allowed zoom
     * @param {number} maxZoom - Maximum allowed zoom
     * @returns {number} - Constrained zoom value
     */
    static constrainZoom(currentZoom: number, minZoom: number, maxZoom: number) {
        if (typeof currentZoom !== 'number') {
            throw new Error('ZoomCalculationService.constrainZoom: currentZoom must be a number');
        }
        if (typeof minZoom !== 'number' || typeof maxZoom !== 'number') {
            throw new Error('ZoomCalculationService.constrainZoom: min and max zoom must be numbers');
        }
        if (minZoom <= 0) {
            throw new Error('ZoomCalculationService.constrainZoom: minZoom must be positive');
        }
        if (maxZoom <= 0) {
            throw new Error('ZoomCalculationService.constrainZoom: maxZoom must be positive');
        }
        if (minZoom > maxZoom) {
            throw new Error('ZoomCalculationService.constrainZoom: minZoom cannot be greater than maxZoom');
        }

        const constrainedValue = Math.max(minZoom, Math.min(maxZoom, currentZoom));
        return new ZoomLevel(constrainedValue, minZoom, maxZoom);
    }

    /**
     * Calculate pan offset after zoom to keep a point centered
     * Useful when user zooms at a specific mouse position
     * @param {Object} mousePos - {x, y} in screen coordinates
     * @param {number} currentZoom - Current zoom level
     * @param {number} newZoom - New zoom level
     * @param {Object} currentPan - Current {x, y} pan offset
     * @returns {Object} - New {x, y} pan offsets
     */
    static calculatePanAfterZoom(mousePos: { x: number; y: number }, currentZoom: number, newZoom: number, currentPan: { x: number; y: number } = { x: 0, y: 0 }) {
        if (!mousePos || typeof mousePos.x !== 'number') {
            throw new Error('ZoomCalculationService.calculatePanAfterZoom: invalid mousePos');
        }
        if (typeof currentZoom !== 'number' || typeof newZoom !== 'number') {
            throw new Error('ZoomCalculationService.calculatePanAfterZoom: zoom levels must be numbers');
        }
        if (currentZoom <= 0 || newZoom <= 0) {
            throw new Error('ZoomCalculationService.calculatePanAfterZoom: zoom levels must be positive');
        }
        if (!currentPan || typeof currentPan.x !== 'number') {
            throw new Error('ZoomCalculationService.calculatePanAfterZoom: invalid currentPan');
        }

        // The point under the mouse should remain at the same screen position after zoom
        // Formula: newPan = currentPan + mousePos * (1 - newZoom / currentZoom)

        const zoomRatio = newZoom / currentZoom;

        return {
            x: currentPan.x + mousePos.x * (1 - zoomRatio),
            y: currentPan.y + mousePos.y * (1 - zoomRatio)
        };
    }

    /**
     * Calculate zoom to fit a specific rectangular area in viewport
     * @param {Object} area - {min: {x, y}, max: {x, y}, width, height} in map units
     * @param {Object} viewportSize - {width, height} in pixels
     * @param {number} padding - Padding around area as percentage (0-1, default 0.1)
     * @returns {Object} - {zoom: zoomLevel, pan: {x, y}}
     */
    static calculateZoomToFitArea(area: { min: { x: number; y: number }; width: number; height: number }, viewportSize: { width: number; height: number }, padding: number = 0.1) {
        if (!area || typeof area.width !== 'number') {
            throw new Error('ZoomCalculationService.calculateZoomToFitArea: invalid area');
        }
        if (!viewportSize || typeof viewportSize.width !== 'number') {
            throw new Error('ZoomCalculationService.calculateZoomToFitArea: invalid viewportSize');
        }
        if (typeof padding !== 'number' || padding < 0 || padding > 1) {
            throw new Error('ZoomCalculationService.calculateZoomToFitArea: padding must be between 0 and 1');
        }

        // Add padding to area
        const paddedArea = {
            width: area.width * (1 + padding * 2),
            height: area.height * (1 + padding * 2),
            min: {
                x: area.min.x - (area.width * padding),
                y: area.min.y - (area.height * padding)
            }
        };

        // Calculate zoom to fit padded area
        const scaleX = viewportSize.width / paddedArea.width;
        const scaleY = viewportSize.height / paddedArea.height;
        const zoom = Math.min(scaleX, scaleY);

        // Calculate pan to center the area
        const areaCenterX = paddedArea.min.x + paddedArea.width / 2;
        const areaCenterY = paddedArea.min.y + paddedArea.height / 2;
        const viewportCenterX = viewportSize.width / (2 * zoom);
        const viewportCenterY = viewportSize.height / (2 * zoom);

        return {
            zoom,
            pan: {
                x: (viewportCenterX - areaCenterX) * zoom,
                y: (viewportCenterY - areaCenterY) * zoom
            }
        };
    }

    /**
     * Calculate the visible area in map coordinates given current zoom and pan
     * @param {Object} viewportSize - {width, height} in pixels
     * @param {number} zoom - Current zoom level
     * @param {Object} pan - Current {x, y} pan offsets
     * @returns {Object} - Visible area {min: {x, y}, max: {x, y}, width, height}
     */
    static calculateVisibleArea(viewportSize: { width: number; height: number }, zoom: number, pan: { x: number; y: number } = { x: 0, y: 0 }) {
        if (!viewportSize || typeof viewportSize.width !== 'number') {
            throw new Error('ZoomCalculationService.calculateVisibleArea: invalid viewportSize');
        }
        if (typeof zoom !== 'number' || zoom <= 0) {
            throw new Error('ZoomCalculationService.calculateVisibleArea: zoom must be positive');
        }

        const unzoomedWidth = viewportSize.width / zoom;
        const unzoomedHeight = viewportSize.height / zoom;

        return {
            min: {
                x: -pan.x / zoom,
                y: -pan.y / zoom
            },
            max: {
                x: (-pan.x / zoom) + unzoomedWidth,
                y: (-pan.y / zoom) + unzoomedHeight
            },
            width: unzoomedWidth,
            height: unzoomedHeight
        };
    }
}

export default ZoomCalculationService;
