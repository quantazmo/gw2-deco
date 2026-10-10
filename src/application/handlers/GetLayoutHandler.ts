/**
 * Handler for GetLayoutQuery
 */
import { HomesteadLayout } from '../../domain/HomesteadLayout.ts';

export class GetLayoutHandler {
    layout: HomesteadLayout;

    /**
     * @param {HomesteadLayout} layout - The layout aggregate root
     */
    constructor(layout: HomesteadLayout) {
        this.layout = layout;
    }

    /**
     * Executes the get layout query
     * @param {GetLayoutQuery} query - The query to execute
     * @returns {Object} The layout as a DTO
     */
    execute(_query: unknown): ReturnType<HomesteadLayout['toDTO']> {
        return this.layout.toDTO();
    }
}

export default GetLayoutHandler;
