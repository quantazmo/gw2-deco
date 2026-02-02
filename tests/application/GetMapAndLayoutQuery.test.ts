// @ts-nocheck
/**
 * Tests for GetMapQuery and GetLayoutQuery (trivial constructors).
 */
import GetMapQuery from '../../src/application/queries/GetMapQuery.js';
import { GetLayoutQuery } from '../../src/application/queries/GetLayoutQuery.js';

test('GetMapQuery can be instantiated', () => {
    const q = new GetMapQuery();
    expect(q).toBeTruthy();
});

test('GetLayoutQuery can be instantiated', () => {
    const q = new GetLayoutQuery();
    expect(q).toBeTruthy();
});
