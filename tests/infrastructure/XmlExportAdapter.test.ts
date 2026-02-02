// @ts-nocheck
/**
 * Tests for src/infrastructure/XmlExportAdapter.js
 * Covers XML serialisation, numeric precision, special-character escaping, and rotation fields.
 */
import { XmlExportAdapter } from '../../src/infrastructure/XmlExportAdapter.js';
import { Layer } from '../../src/domain/Layer.js';
import { Decoration } from '../../src/domain/Decoration.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';

function makeLayer(id, name, decorations = []) {
    const layer = new Layer(id, name);
    for (const d of decorations) {
        layer.addDecoration(d);
    }
    return layer;
}

function makeDecoration(id, name, x, y, z, ry = 0, scale = 1, rotX = 0, rotZ = 0) {
    const pos = new WorldCoordinate(x, y, z, 0);
    const dec = new Decoration(String(id), name, pos, ry, scale);
    dec.rotX = rotX;
    dec.rotZ = rotZ;
    return dec;
}

const testMap = { id: 1558, name: "Hearth's Glow" };

describe('XmlExportAdapter.serialize', () => {
    describe('structure', () => {
        test('produces XML declaration as first line', () => {
            const xml = XmlExportAdapter.serialize(testMap, []);
            expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
        });

        test('root element is <Decorations> with correct attributes', () => {
            const xml = XmlExportAdapter.serialize(testMap, []);
            expect(xml).toContain('<Decorations version="1" mapId="1558" mapName="Hearth\'s Glow" type="0">');
        });

        test('root element is closed with </Decorations>', () => {
            const xml = XmlExportAdapter.serialize(testMap, []);
            expect(xml.endsWith('</Decorations>')).toBe(true);
        });
    });

    describe('empty layers', () => {
        test('empty layers array produces valid XML with no <prop> elements', () => {
            const xml = XmlExportAdapter.serialize(testMap, []);
            expect(xml).not.toContain('<prop');
            expect(xml).toContain('<Decorations');
            expect(xml).toContain('</Decorations>');
        });

        test('layer with no decorations produces no <prop> elements', () => {
            const xml = XmlExportAdapter.serialize(testMap, [makeLayer('l1', 'Empty Layer')]);
            expect(xml).not.toContain('<prop');
        });
    });

    describe('single decoration', () => {
        test('serialises a single decoration as a self-closing <prop> element', () => {
            const dec = makeDecoration(327, 'Kodan Dining Chair', 4130.535156, -5150.777344, -585.671875, 0.098175, 1.0, 0, 4.614214);
            const layer = makeLayer('l1', 'Layer 1', [dec]);
            const xml = XmlExportAdapter.serialize(testMap, [layer]);
            expect(xml).toContain('<prop id="327" name="Kodan Dining Chair"');
        });

        test('pos attribute uses toFixed(6) for all three components', () => {
            const dec = makeDecoration(1, 'Test', 4130.535156, -5150.777344, -585.671875);
            const layer = makeLayer('l1', 'L', [dec]);
            const xml = XmlExportAdapter.serialize(testMap, [layer]);
            expect(xml).toContain('pos="4130.535156 -5150.777344 -585.671875"');
        });

        test('scl attribute uses toFixed(6)', () => {
            const dec = makeDecoration(1, 'Test', 0, 0, 0, 0, 0.781746);
            const layer = makeLayer('l1', 'L', [dec]);
            const xml = XmlExportAdapter.serialize(testMap, [layer]);
            expect(xml).toContain('scl="0.781746"');
        });

        test('id is an integer with no decimal point', () => {
            const dec = makeDecoration(327, 'Test', 0, 0, 0);
            const layer = makeLayer('l1', 'L', [dec]);
            const xml = XmlExportAdapter.serialize(testMap, [layer]);
            expect(xml).toContain('id="327"');
            expect(xml).not.toContain('id="327.0"');
        });

        test('decoration with numeric id exports that id directly', () => {
            // decoration.id is the XML prop-type id — it must be numeric for valid XML output
            const dec = new Decoration('327', 'Kodan Chair', new WorldCoordinate(0, 0, 0, 0));
            const layer = makeLayer('l1', 'L', [dec]);
            const xml = XmlExportAdapter.serialize(testMap, [layer]);
            expect(xml).toContain('id="327"');
            expect(xml).not.toContain('id="NaN"');
        });
    });

    describe('rotation (rot attribute)', () => {
        test('rot attribute encodes rotX, rotation (ry), rotZ with toFixed(6)', () => {
            const dec = makeDecoration(1, 'Test', 0, 0, 0, 0.098175, 1.0, 0.0, 4.614214);
            const layer = makeLayer('l1', 'L', [dec]);
            const xml = XmlExportAdapter.serialize(testMap, [layer]);
            expect(xml).toContain('rot="0.000000 0.098175 4.614214"');
        });

        test('all-zero rotation produces "0.000000 0.000000 0.000000"', () => {
            const dec = makeDecoration(1, 'Test', 0, 0, 0, 0, 1, 0, 0);
            const layer = makeLayer('l1', 'L', [dec]);
            const xml = XmlExportAdapter.serialize(testMap, [layer]);
            expect(xml).toContain('rot="0.000000 0.000000 0.000000"');
        });

        test('non-zero rotX appears as first rot component', () => {
            const dec = makeDecoration(1, 'Test', 0, 0, 0, 0, 1, 1.5, 0);
            const layer = makeLayer('l1', 'L', [dec]);
            const xml = XmlExportAdapter.serialize(testMap, [layer]);
            expect(xml).toContain('rot="1.500000 0.000000 0.000000"');
        });

        test('non-zero rotZ appears as third rot component', () => {
            const dec = makeDecoration(1, 'Test', 0, 0, 0, 0, 1, 0, 2.5);
            const layer = makeLayer('l1', 'L', [dec]);
            const xml = XmlExportAdapter.serialize(testMap, [layer]);
            expect(xml).toContain('rot="0.000000 0.000000 2.500000"');
        });
    });

    describe('XML special-character escaping', () => {
        test('ampersand in decoration name is escaped', () => {
            const dec = makeDecoration(1, 'Salt & Pepper Shaker', 0, 0, 0);
            const layer = makeLayer('l1', 'L', [dec]);
            const xml = XmlExportAdapter.serialize(testMap, [layer]);
            expect(xml).toContain('name="Salt &amp; Pepper Shaker"');
        });

        test('double-quote in decoration name is escaped', () => {
            const dec = makeDecoration(1, '"Quoted"', 0, 0, 0);
            const layer = makeLayer('l1', 'L', [dec]);
            const xml = XmlExportAdapter.serialize(testMap, [layer]);
            expect(xml).toContain('name="&quot;Quoted&quot;"');
        });

        test('mapName with special characters is escaped in root element', () => {
            const specialMap = { id: 1, name: 'A & B <Test>' };
            const xml = XmlExportAdapter.serialize(specialMap, []);
            expect(xml).toContain('mapName="A &amp; B &lt;Test&gt;"');
        });
    });

    describe('multi-layer flattening', () => {
        test('decorations from multiple layers are flattened in layer order', () => {
            const dec1 = makeDecoration(1, 'Alpha', 0, 0, 0);
            const dec2 = makeDecoration(2, 'Beta', 1, 0, 0);
            const dec3 = makeDecoration(3, 'Gamma', 2, 0, 0);
            const layer1 = makeLayer('l1', 'Layer 1', [dec1, dec2]);
            const layer2 = makeLayer('l2', 'Layer 2', [dec3]);
            const xml = XmlExportAdapter.serialize(testMap, [layer1, layer2]);
            const alphaIdx = xml.indexOf('name="Alpha"');
            const betaIdx = xml.indexOf('name="Beta"');
            const gammaIdx = xml.indexOf('name="Gamma"');
            expect(alphaIdx).toBeLessThan(betaIdx);
            expect(betaIdx).toBeLessThan(gammaIdx);
        });
    });

    describe('attribute order', () => {
        test('<prop> element has attributes in order: id, name, pos, rot, scl', () => {
            const dec = makeDecoration(327, 'Chair', 1, 2, 3, 0.1, 1.0);
            const layer = makeLayer('l1', 'L', [dec]);
            const xml = XmlExportAdapter.serialize(testMap, [layer]);
            const propLine = xml.split('\n').find(l => l.includes('<prop'));
            const idIdx = propLine.indexOf('id=');
            const nameIdx = propLine.indexOf('name=');
            const posIdx = propLine.indexOf('pos=');
            const rotIdx = propLine.indexOf('rot=');
            const sclIdx = propLine.indexOf('scl=');
            expect(idIdx).toBeLessThan(nameIdx);
            expect(nameIdx).toBeLessThan(posIdx);
            expect(posIdx).toBeLessThan(rotIdx);
            expect(rotIdx).toBeLessThan(sclIdx);
        });
    });

    describe('error handling', () => {
        test('throws when map is null', () => {
            expect(() => XmlExportAdapter.serialize(null, [])).toThrow();
        });

        test('throws when layers is not an array', () => {
            expect(() => XmlExportAdapter.serialize(testMap, null)).toThrow();
        });
    });
});
