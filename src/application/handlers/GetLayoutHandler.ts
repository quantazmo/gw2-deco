// @ts-nocheck
/**
 * Handler for GetLayoutQuery
 */
export class GetLayoutHandler {
    layout: any; // JS domain object � fully typed once domain migrates to TypeScript

    /**
     * @param {HomesteadLayout} layout - The layout aggregate root
     */
    constructor(layout: unknown) {
        this.layout = layout;
    }

    /**
     * Executes the get layout query
     * @param {GetLayoutQuery} query - The query to execute
     * @returns {Object} The layout as a DTO
     */
    execute(query) {
        return this.layout.toDTO();
    }
}

export default GetLayoutHandler;
