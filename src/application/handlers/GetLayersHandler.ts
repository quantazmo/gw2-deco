/**
 * Handler for GetLayersQuery
 */
import { HomesteadLayout } from '../../domain/HomesteadLayout.ts';

export class GetLayersHandler {
    layout: HomesteadLayout;

    /**
     * @param {HomesteadLayout} layout - The layout aggregate root
     */
    constructor(layout: HomesteadLayout) {
        this.layout = layout;
    }

    /**
     * Executes the get layers query
     * @param {GetLayersQuery} query - The query to execute
     * @returns {Object[]} The layers in the layout as DTOs
     */
    execute(_query: unknown): Array<Record<string, unknown>> {
        const layers = this.layout.getAllLayers();
        return layers.map(layer => layer.toDTO());
    }

    /**
     * Alias for execute() to match test interface
     * @param {GetLayersQuery} query - The query to execute
     * @returns {Layer[]} The layers in the layout
     */
    handle(query: { layout: HomesteadLayout }): { layout: HomesteadLayout; layers: Array<Record<string, unknown>> } {
        if (!query || !query.layout) {
            throw new Error('GetLayersHandler.handle: query with layout is required');
        }
        const layers = query.layout.getAllLayers();
        return {
            layout: query.layout,
            layers: layers.map(layer => layer.toDTO())
        };
    }
}

export default GetLayersHandler;
