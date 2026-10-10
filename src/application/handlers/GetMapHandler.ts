/**
 * Handler for GetMapQuery
 */
import { HomesteadLayout } from '../../domain/HomesteadLayout.ts';

export class GetMapHandler {
    layout: HomesteadLayout;

    /**
     * @param {HomesteadLayout} layout - The layout aggregate root
     */
    constructor(layout: HomesteadLayout) {
        this.layout = layout;
    }

    /**
     * Executes the get map query
     * @param {GetMapQuery} query - The query to execute
     * @returns {Object} The map from the layout as a DTO
     */
    execute(_query: unknown): Record<string, unknown> | null {
        const map = this.layout.map;
        return map ? map.toDTO() : null;
    }
}

export default GetMapHandler;
