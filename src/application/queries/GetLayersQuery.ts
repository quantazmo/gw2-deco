/**
 * Query to get all layers from the layout
 */
export class GetLayersQuery {
    layout: unknown;

    constructor(layout: unknown) {
        if (!layout) {
            throw new Error('GetLayersQuery: layout is required');
        }
        this.layout = layout;
    }
}

export default GetLayersQuery;
