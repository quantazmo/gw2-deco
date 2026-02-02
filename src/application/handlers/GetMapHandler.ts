// @ts-nocheck
/**
 * Handler for GetMapQuery
 */
export class GetMapHandler {
    layout: any; // JS domain object � fully typed once domain migrates to TypeScript

    /**
     * @param {HomesteadLayout} layout - The layout aggregate root
     */
    constructor(layout: unknown) {
        this.layout = layout;
    }

    /**
     * Executes the get map query
     * @param {GetMapQuery} query - The query to execute
     * @returns {Object} The map from the layout as a DTO
     */
    execute(query) {
        const map = this.layout.map;
        return map ? map.toDTO() : null;
    }
}

export default GetMapHandler;
