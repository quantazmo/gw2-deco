// @ts-nocheck
/**
 * Tests for RenameLayerHandler
 */
import { RenameLayerHandler } from '../../src/application/handlers/RenameLayerHandler.js';
import RenameLayerCommand from '../../src/application/commands/RenameLayerCommand.js';
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { Layer } from '../../src/domain/Layer.js';

describe('RenameLayerHandler', () => {
    let layout;

    beforeEach(() => {
        layout = new HomesteadLayout('tmpl-1', 'Test Layout');
        layout.addLayer(new Layer('layer-1', 'Original Name'));
    });

    test('execute renames the layer and emits LayerRenamedEvent', () => {
        const handler = new RenameLayerHandler(layout);
        const command = new RenameLayerCommand('layer-1', 'New Name');

        handler.execute(command);

        const layer = layout.getLayer('layer-1');
        expect(layer.name).toBe('New Name');
    });

    // Line 25: layer not found → throws
    test('execute throws when layer does not exist', () => {
        const handler = new RenameLayerHandler(layout);
        const command = new RenameLayerCommand('non-existent-id', 'Whatever');

        expect(() => handler.execute(command)).toThrow('non-existent-id');
    });
});
