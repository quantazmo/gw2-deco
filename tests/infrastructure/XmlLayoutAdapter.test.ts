// @ts-nocheck
/**
 * Tests for src/infrastructure/XmlLayoutAdapter.js
 * Covers: validateXmlString, _validatePropElement, parseLayout, _extractLayout
 */
import { XmlLayoutAdapter } from '../../src/infrastructure/XmlLayoutAdapter.js';

const VALID_XML = `<?xml version="1.0" encoding="UTF-8"?><Decorations version="1" mapId="1558" mapName="Queensdale" type="0"></Decorations>`;
const VALID_XML_WITH_PROP = `<?xml version="1.0" encoding="UTF-8"?><Decorations version="1" mapId="1558" mapName="Queensdale" type="0"><prop id="327" name="Kodan Chair" pos="4130.535156 -5150.777344 -585.671875" rot="0 0.098175 0" scl="1.0"/></Decorations>`;

describe('XmlLayoutAdapter', () => {

    // ─────────────────────────────────────────────────────────────────────────
    // validateXmlString – empty / null / non-string (lines 41-42 area)
    // ─────────────────────────────────────────────────────────────────────────
    describe('validateXmlString – empty inputs', () => {
        test('null string returns isValid:false with empty error', () => {
            const result = XmlLayoutAdapter.validateXmlString(null);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('empty') || e.includes('cannot'))).toBe(true);
        });

        test('empty string returns isValid:false', () => {
            const result = XmlLayoutAdapter.validateXmlString('');
            expect(result.isValid).toBe(false);
        });

        test('whitespace-only string returns isValid:false', () => {
            const result = XmlLayoutAdapter.validateXmlString('   \n\t  ');
            expect(result.isValid).toBe(false);
        });

        test('non-string number returns isValid:false', () => {
            const result = XmlLayoutAdapter.validateXmlString(123);
            expect(result.isValid).toBe(false);
        });

        test('boolean false returns isValid:false', () => {
            const result = XmlLayoutAdapter.validateXmlString(false);
            expect(result.isValid).toBe(false);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // validateXmlString – invalid XML syntax
    // ─────────────────────────────────────────────────────────────────────────
    describe('validateXmlString – malformed XML', () => {
        test('malformed XML returns isValid:false with parse error', () => {
            const result = XmlLayoutAdapter.validateXmlString('<unclosed tag');
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.toLowerCase().includes('pars'))).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // validateXmlString – missing required root attributes
    // ─────────────────────────────────────────────────────────────────────────
    describe('validateXmlString – missing root attributes', () => {
        test('missing mapId attribute returns error', () => {
            const result = XmlLayoutAdapter.validateXmlString(
                '<Decorations mapName="Queensdale"></Decorations>'
            );
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('mapId'))).toBe(true);
        });

        test('missing mapName attribute returns error', () => {
            const result = XmlLayoutAdapter.validateXmlString(
                '<Decorations mapId="1558"></Decorations>'
            );
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('mapName'))).toBe(true);
        });

        test('non-numeric mapId returns error', () => {
            const result = XmlLayoutAdapter.validateXmlString(
                '<Decorations mapId="abc" mapName="Test"></Decorations>'
            );
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('mapId') || e.includes('number'))).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // _validatePropElement – missing required attributes (lines 102-134 area)
    // ─────────────────────────────────────────────────────────────────────────
    describe('validateXmlString – prop missing required attributes', () => {
        test('prop missing id attribute returns error', () => {
            const xml = '<Decorations mapId="1" mapName="T"><prop name="Chair" pos="1 2 3" rot="0 0 0" scl="1.0"/></Decorations>';
            const result = XmlLayoutAdapter.validateXmlString(xml);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('"id"'))).toBe(true);
        });

        test('prop missing name attribute returns error', () => {
            const xml = '<Decorations mapId="1" mapName="T"><prop id="1" pos="1 2 3" rot="0 0 0" scl="1.0"/></Decorations>';
            const result = XmlLayoutAdapter.validateXmlString(xml);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('"name"'))).toBe(true);
        });

        test('prop missing pos attribute returns error', () => {
            const xml = '<Decorations mapId="1" mapName="T"><prop id="1" name="Chair" rot="0 0 0" scl="1.0"/></Decorations>';
            const result = XmlLayoutAdapter.validateXmlString(xml);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('"pos"'))).toBe(true);
        });

        test('prop missing rot attribute returns error', () => {
            const xml = '<Decorations mapId="1" mapName="T"><prop id="1" name="Chair" pos="1 2 3" scl="1.0"/></Decorations>';
            const result = XmlLayoutAdapter.validateXmlString(xml);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('"rot"'))).toBe(true);
        });

        test('prop missing scl attribute returns error', () => {
            const xml = '<Decorations mapId="1" mapName="T"><prop id="1" name="Chair" pos="1 2 3" rot="0 0 0"/></Decorations>';
            const result = XmlLayoutAdapter.validateXmlString(xml);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('"scl"'))).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // _validatePropElement – invalid attribute formats
    // ─────────────────────────────────────────────────────────────────────────
    describe('validateXmlString – prop invalid attribute formats', () => {
        test('invalid pos format (wrong number of values) returns error', () => {
            const xml = '<Decorations mapId="1" mapName="T"><prop id="1" name="Chair" pos="1 2" rot="0 0 0" scl="1.0"/></Decorations>';
            const result = XmlLayoutAdapter.validateXmlString(xml);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('pos'))).toBe(true);
        });

        test('invalid pos format (non-numeric) returns error', () => {
            const xml = '<Decorations mapId="1" mapName="T"><prop id="1" name="Chair" pos="x y z" rot="0 0 0" scl="1.0"/></Decorations>';
            const result = XmlLayoutAdapter.validateXmlString(xml);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('pos'))).toBe(true);
        });

        test('invalid rot format (wrong number of values) returns error', () => {
            const xml = '<Decorations mapId="1" mapName="T"><prop id="1" name="Chair" pos="1 2 3" rot="0 0" scl="1.0"/></Decorations>';
            const result = XmlLayoutAdapter.validateXmlString(xml);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('rot'))).toBe(true);
        });

        test('invalid rot format (non-numeric) returns error', () => {
            const xml = '<Decorations mapId="1" mapName="T"><prop id="1" name="Chair" pos="1 2 3" rot="a b c" scl="1.0"/></Decorations>';
            const result = XmlLayoutAdapter.validateXmlString(xml);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('rot'))).toBe(true);
        });

        test('invalid scl (non-numeric) returns error', () => {
            const xml = '<Decorations mapId="1" mapName="T"><prop id="1" name="Chair" pos="1 2 3" rot="0 0 0" scl="xyz"/></Decorations>';
            const result = XmlLayoutAdapter.validateXmlString(xml);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('scl'))).toBe(true);
        });

        test('invalid id (non-integer) returns error', () => {
            const xml = '<Decorations mapId="1" mapName="T"><prop id="abc" name="Chair" pos="1 2 3" rot="0 0 0" scl="1.0"/></Decorations>';
            const result = XmlLayoutAdapter.validateXmlString(xml);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.includes('"id"') || e.toLowerCase().includes('id'))).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // validateXmlString – valid XML passes
    // ─────────────────────────────────────────────────────────────────────────
    describe('validateXmlString – valid inputs', () => {
        test('valid XML with no props passes validation', () => {
            const result = XmlLayoutAdapter.validateXmlString(VALID_XML);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('valid XML with a prop passes validation', () => {
            const result = XmlLayoutAdapter.validateXmlString(VALID_XML_WITH_PROP);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // parseLayout – success path (lines 27-28)
    // ─────────────────────────────────────────────────────────────────────────
    describe('parseLayout – success path', () => {
        test('parses valid XML and returns layout object with id and name', async () => {
            const layout = await XmlLayoutAdapter.parseLayout(VALID_XML);
            expect(layout.id).toBe(1558);
            expect(layout.name).toBe('Queensdale');
            expect(layout.decorations).toHaveLength(0);
        });

        test('parses valid XML with a prop and returns decoration data', async () => {
            const layout = await XmlLayoutAdapter.parseLayout(VALID_XML_WITH_PROP);
            expect(layout.decorations).toHaveLength(1);
            expect(layout.decorations[0].id).toBe(327);
            expect(layout.decorations[0].name).toBe('Kodan Chair');
            expect(layout.decorations[0].scale).toBe(1.0);
        });

        test('throws when validation fails (invalid XML)', async () => {
            await expect(XmlLayoutAdapter.parseLayout('<bad')).rejects.toThrow('XML validation failed');
        });

        test('throws when validation fails (empty string)', async () => {
            await expect(XmlLayoutAdapter.parseLayout('')).rejects.toThrow('XML validation failed');
        });

        test('parseLayout returns rotation as {x, y, z} object with all three components', async () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>` +
                `<Decorations version="1" mapId="1558" mapName="Queensdale" type="0">` +
                `<prop id="327" name="Kodan Chair" pos="4130.0 -5150.0 -585.0" rot="0.000000 0.098175 4.614214" scl="1.000000"/>` +
                `</Decorations>`;
            const layout = await XmlLayoutAdapter.parseLayout(xml);
            const dec = layout.decorations[0];
            expect(typeof dec.rotation).toBe('object');
            expect(dec.rotation.x).toBeCloseTo(0, 5);
            expect(dec.rotation.y).toBeCloseTo(0.098175, 5);
            expect(dec.rotation.z).toBeCloseTo(4.614214, 5);
        });

        test('parseLayout preserves non-zero rotZ even when rotY is zero', async () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>` +
                `<Decorations version="1" mapId="1558" mapName="Queensdale" type="0">` +
                `<prop id="375" name="Wayfinder Table" pos="10464.0 -6180.0 -1104.0" rot="0.000000 0.000000 4.908739" scl="1.000000"/>` +
                `</Decorations>`;
            const layout = await XmlLayoutAdapter.parseLayout(xml);
            const dec = layout.decorations[0];
            expect(dec.rotation.y).toBeCloseTo(0, 5);
            expect(dec.rotation.z).toBeCloseTo(4.908739, 5);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // _parseXmlString – throws on parseerror (line 150)
    // ─────────────────────────────────────────────────────────────────────────
    describe('_parseXmlString – private static method', () => {
        test('throws when XML has a parseerror element', () => {
            expect(() => XmlLayoutAdapter._parseXmlString('<bad unclosed')).toThrow('XML parsing failed');
        });

        test('returns xmlDoc for valid XML', () => {
            const doc = XmlLayoutAdapter._parseXmlString('<root attr="x"></root>');
            expect(doc).toBeTruthy();
            expect(doc.documentElement.tagName).toBe('root');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // _extractLayout – extraction error (line 170)
    // ─────────────────────────────────────────────────────────────────────────
    describe('_extractLayout – private static method', () => {
        test('rethrows _extractDecoration errors with index context', () => {
            // Build a document where a <prop> is missing the 'pos' attribute
            // so _extractDecoration throws when it tries to call .trim() on null
            const doc = new DOMParser().parseFromString(
                '<Decorations mapId="1" mapName="T"><prop id="1" name="Chair"/></Decorations>',
                'application/xml'
            );
            expect(() => XmlLayoutAdapter._extractLayout(doc))
                .toThrow('Error parsing decoration #1');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // validateXmlString – unexpected error in catch block (line 83)
    // ─────────────────────────────────────────────────────────────────────────
    describe('validateXmlString – catch block for unexpected errors', () => {
        test('catches unexpected errors and returns isValid:false', () => {
            const orig = DOMParser.prototype.parseFromString;
            DOMParser.prototype.parseFromString = () => { throw new Error('unexpected'); };
            try {
                const result = XmlLayoutAdapter.validateXmlString('<root/>');
                expect(result.isValid).toBe(false);
                expect(result.errors.some(e => e.includes('unexpected'))).toBe(true);
            } finally {
                DOMParser.prototype.parseFromString = orig;
            }
        });
    });
});
