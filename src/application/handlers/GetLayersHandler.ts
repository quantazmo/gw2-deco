// @ts-nocheck
/**
 * Handler for GetLayersQuery
 */
export class GetLayersHandler {
    layout: any; // JS domain object � fully typed once domain migrates to TypeScript

    /**
     * @param {HomesteadLayout} layout - The layout aggregate root
     */
    constructor(layout: unknown) {
        this.layout = layout;
    }

    /**
     * Executes the get layers query
     * @param {GetLayersQuery} query - The query to execute
     * @returns {Object[]} The layers in the layout as DTOs
     */
    execute(query) {
        const layers = this.layout.getAllLayers();
        return layers.map(layer => layer.toDTO());
    }

    /**
     * Alias for execute() to match test interface
     * @param {GetLayersQuery} query - The query to execute
     * @returns {Layer[]} The layers in the layout
     */
    handle(query) {
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
