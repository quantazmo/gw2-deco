/**
 * BoundaryCalculationService - Domain Service for boundary and bounds calculations
 */
type Bounds = { min: { x: number; y: number }; max: { x: number; y: number }; width: number; height: number };

export class BoundaryCalculationService {
    /**
     * Calculate the bounding rectangle from a boundary
     * @param {MapBoundary} boundary - The boundary to calculate bounds for
     * @returns {Object} - {min: {x, y}, max: {x, y}, width, height}
     */
    static calculateBoundsFromBoundary(boundary: { getBounds(): unknown }) {
        if (!boundary || typeof boundary.getBounds !== 'function') {
            throw new Error('BoundaryCalculationService.calculateBoundsFromBoundary: boundary must be a MapBoundary instance');
        }
        return boundary.getBounds();
    }

    /**
     * Calculate the bounding rectangle from tiles
     * @param {Array} tiles - Array of tile objects with x, y coordinates
     * @returns {Object} - {min: {x, y}, max: {x, y}, width, height}
     */
    static calculateBoundsFromTiles(tiles: unknown[]) {
        if (!Array.isArray(tiles) || tiles.length === 0) {
            throw new Error('BoundaryCalculationService.calculateBoundsFromTiles: tiles must be a non-empty array');
        }

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        for (const tile of tiles) {
            const t = tile as { x: number; y: number };
            if (typeof t.x !== 'number' || typeof t.y !== 'number') {
                throw new Error('BoundaryCalculationService.calculateBoundsFromTiles: each tile must have x and y properties');
            }
            minX = Math.min(minX, t.x);
            maxX = Math.max(maxX, t.x);
            minY = Math.min(minY, t.y);
            maxY = Math.max(maxY, t.y);
        }

        return {
            min: { x: minX, y: minY },
            max: { x: maxX, y: maxY },
            width: maxX - minX,
            height: maxY - minY
        };
    }

    /**
     * Expand bounds to fit a specific aspect ratio
     * @param {Object} bounds - {min: {x, y}, max: {x, y}, width, height}
     * @param {number} targetAspect - Desired aspect ratio (width/height)
     * @returns {Object} - Expanded bounds maintaining the aspect ratio
     */
    static expandBoundsToAspectRatio(bounds: Bounds, targetAspect: number): Bounds {
        if (!bounds || typeof bounds.min !== 'object') {
            throw new Error('BoundaryCalculationService.expandBoundsToAspectRatio: invalid bounds');
        }
        if (typeof targetAspect !== 'number' || targetAspect <= 0) {
            throw new Error('BoundaryCalculationService.expandBoundsToAspectRatio: targetAspect must be a positive number');
        }

        const currentWidth = bounds.width;
        const currentHeight = bounds.height;
        const currentAspect = currentWidth / currentHeight;

        let newWidth = currentWidth;
        let newHeight = currentHeight;

        if (currentAspect < targetAspect) {
            // Need to expand width
            newWidth = currentHeight * targetAspect;
        } else if (currentAspect > targetAspect) {
            // Need to expand height
            newHeight = currentWidth / targetAspect;
        }

        // Center the original bounds in the new expanded bounds
        const widthDiff = newWidth - currentWidth;
        const heightDiff = newHeight - currentHeight;
        const centerX = bounds.min.x + currentWidth / 2;
        const centerY = bounds.min.y + currentHeight / 2;

        return {
            min: {
                x: centerX - newWidth / 2,
                y: centerY - newHeight / 2
            },
            max: {
                x: centerX + newWidth / 2,
                y: centerY + newHeight / 2
            },
            width: newWidth,
            height: newHeight
        };
    }

    /**
     * Center bounds within a viewport, optionally maintaining margin
     * @param {Object} bounds - {min: {x, y}, max: {x, y}, width, height}
     * @param {Object} viewport - {width, height}
     * @param {number} margin - Optional margin around bounds (default 0)
     * @returns {Object} - {x, y} offsets to center bounds in viewport
     */
    static centerBoundsInViewport(bounds: Bounds, viewport: { width: number; height: number }, margin: number = 0) {
        if (!bounds || typeof bounds.min !== 'object') {
            throw new Error('BoundaryCalculationService.centerBoundsInViewport: invalid bounds');
        }
        if (!viewport || typeof viewport.width !== 'number') {
            throw new Error('BoundaryCalculationService.centerBoundsInViewport: invalid viewport');
        }
        if (typeof margin !== 'number') {
            throw new Error('BoundaryCalculationService.centerBoundsInViewport: margin must be a number');
        }

        const boundsWidth = bounds.width + (margin * 2);
        const boundsHeight = bounds.height + (margin * 2);

        // Calculate center of bounds
        const boundsCenterX = bounds.min.x + bounds.width / 2;
        const boundsCenterY = bounds.min.y + bounds.height / 2;

        // Viewport center
        const viewportCenterX = viewport.width / 2;
        const viewportCenterY = viewport.height / 2;

        // Offsets to center
        return {
            x: viewportCenterX - boundsCenterX,
            y: viewportCenterY - boundsCenterY,
            boundsWidth,
            boundsHeight
        };
    }

    /**
     * Calculate padding/margin needed to center content
     * @param {Object} contentSize - {width, height}
     * @param {Object} containerSize - {width, height}
     * @returns {Object} - {top, bottom, left, right}
     */
    static calculateCenteringPadding(contentSize: { width: number; height: number }, containerSize: { width: number; height: number }) {
        if (!contentSize || typeof contentSize.width !== 'number') {
            throw new Error('BoundaryCalculationService.calculateCenteringPadding: invalid contentSize');
        }
        if (!containerSize || typeof containerSize.width !== 'number') {
            throw new Error('BoundaryCalculationService.calculateCenteringPadding: invalid containerSize');
        }

        const horizontalPadding = Math.max(0, (containerSize.width - contentSize.width) / 2);
        const verticalPadding = Math.max(0, (containerSize.height - contentSize.height) / 2);

        return {
            left: horizontalPadding,
            right: horizontalPadding,
            top: verticalPadding,
            bottom: verticalPadding
        };
    }
}

export default BoundaryCalculationService;
