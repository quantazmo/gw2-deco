// @ts-nocheck
/**
 * Tests for all application command classes
 */
import { AddDecorationCommand } from '../../src/application/commands/AddDecorationCommand.js';
import { DeleteDecorationCommand } from '../../src/application/commands/DeleteDecorationCommand.js';
import { DeleteDecorationsCommand } from '../../src/application/commands/DeleteDecorationsCommand.js';
import { ExportLayersCommand } from '../../src/application/commands/ExportLayersCommand.js';
import { LoadAdditionalLayoutCommand } from '../../src/application/commands/LoadAdditionalLayoutCommand.js';
import { MoveDecorationsCommand } from '../../src/application/commands/MoveDecorationsCommand.js';
import RenameLayerCommand from '../../src/application/commands/RenameLayerCommand.js';
import { SwitchMapCommand } from '../../src/application/commands/SwitchMapCommand.js';
import { MergeLayerCommand } from '../../src/application/commands/MergeLayerCommand.js';

describe('AddDecorationCommand', () => {
    test('stores all properties', () => {
        const pos = { x: 1, y: 2 };
        const cmd = new AddDecorationCommand('layer-1', 'deco-1', 'Bench', pos, 45, 1.5);
        expect(cmd.layerId).toBe('layer-1');
        expect(cmd.decorationId).toBe('deco-1');
        expect(cmd.name).toBe('Bench');
        expect(cmd.position).toBe(pos);
        expect(cmd.rotation).toBe(45);
        expect(cmd.scale).toBe(1.5);
    });

    test('rotation defaults to 0', () => {
        const cmd = new AddDecorationCommand('layer-1', 'deco-1', 'Bench', { x: 0, y: 0 });
        expect(cmd.rotation).toBe(0);
    });

    test('scale defaults to 1', () => {
        const cmd = new AddDecorationCommand('layer-1', 'deco-1', 'Bench', { x: 0, y: 0 });
        expect(cmd.scale).toBe(1);
    });
});

describe('DeleteDecorationCommand', () => {
    test('stores layerId and decorationId', () => {
        const cmd = new DeleteDecorationCommand('layer-1', 'deco-42');
        expect(cmd.layerId).toBe('layer-1');
        expect(cmd.decorationId).toBe('deco-42');
    });
});

describe('DeleteDecorationsCommand', () => {
    test('stores decorationIds array', () => {
        const ids = ['a', 'b', 'c'];
        const cmd = new DeleteDecorationsCommand(ids);
        expect(cmd.decorationIds).toEqual(ids);
    });

    test('works with empty array', () => {
        const cmd = new DeleteDecorationsCommand([]);
        expect(cmd.decorationIds).toEqual([]);
    });
});

describe('ExportLayersCommand', () => {
    test('stores selectedLayerIds in payload', () => {
        const cmd = new ExportLayersCommand(['layer-1', 'layer-2']);
        expect(cmd.type).toBe('ExportLayersCommand');
        expect(cmd.payload.selectedLayerIds).toEqual(['layer-1', 'layer-2']);
    });

    test('works with single layer', () => {
        const cmd = new ExportLayersCommand(['only-layer']);
        expect(cmd.payload.selectedLayerIds).toHaveLength(1);
    });
});

describe('LoadAdditionalLayoutCommand', () => {
    test('stores xmlContent and fileName', () => {
        const xml = '<root/>';
        const cmd = new LoadAdditionalLayoutCommand(xml, 'my-file.xml');
        expect(cmd.xmlContent).toBe(xml);
        expect(cmd.fileName).toBe('my-file.xml');
    });
});

describe('MoveDecorationsCommand', () => {
    test('stores decorationIds and targetLayerId', () => {
        const cmd = new MoveDecorationsCommand(['d1', 'd2'], 'target-layer');
        expect(cmd.decorationIds).toEqual(['d1', 'd2']);
        expect(cmd.targetLayerId).toBe('target-layer');
    });
});

describe('RenameLayerCommand', () => {
    test('stores layerId and newName', () => {
        const cmd = new RenameLayerCommand('layer-5', 'New Name');
        expect(cmd.layerId).toBe('layer-5');
        expect(cmd.newName).toBe('New Name');
    });
});

describe('SwitchMapCommand', () => {
    test('stores xmlContent and fileName', () => {
        const xml = '<homestead/>';
        const cmd = new SwitchMapCommand(xml, 'layout.xml');
        expect(cmd.xmlContent).toBe(xml);
        expect(cmd.fileName).toBe('layout.xml');
    });
});

describe('MergeLayerCommand', () => {
    test('stores sourceLayerId and targetLayerId', () => {
        const cmd = new MergeLayerCommand('layer-1', 'layer-2');
        expect(cmd.sourceLayerId).toBe('layer-1');
        expect(cmd.targetLayerId).toBe('layer-2');
    });

    test('stores distinct source and target IDs', () => {
        const cmd = new MergeLayerCommand('source', 'target');
        expect(cmd.sourceLayerId).not.toBe(cmd.targetLayerId);
    });
});
