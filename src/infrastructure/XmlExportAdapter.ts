// @ts-nocheck
/**
 * XmlExportAdapter
 * Pure static utility — serialises Layer[] to a GW2 homestead XML string.
 * No DOM side-effects; the browser download trigger lives in ExportLayersHandler.
 */

/**
 * Escape characters that are special in XML attribute values.
 * @param {string} value
 * @returns {string}
 */
function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export class XmlExportAdapter {
    /**
     * Serialise a set of layers to an XML string matching the GW2 homestead format.
     *
     * @param {{ id: string|number, name: string }} map - Provides mapId and mapName
     * @param {Array} layers - Ordered Layer instances; decorations are flattened in order
     * @returns {string} Complete XML document string
     */
    static serialize(map, layers) {
        if (!map) {
            throw new Error('XmlExportAdapter.serialize: map is required');
        }
        if (!Array.isArray(layers)) {
            throw new Error('XmlExportAdapter.serialize: layers must be an array');
        }

        const mapId = map.id;
        const mapName = escapeXml(map.name ?? '');

        const propLines = [];
        for (const layer of layers) {
            const decorations = layer.getAllDecorations ? layer.getAllDecorations() : [];
            for (const d of decorations) {
                // d.id is the XML prop-type id (e.g. "419") — use it directly.
                const id = parseInt(d.id, 10) || 0;
                const name = escapeXml(d.name);
                const px = d.position.x.toFixed(6);
                const py = d.position.y.toFixed(6);
                const pz = d.position.z.toFixed(6);
                const rx = (d.rotX ?? 0).toFixed(6);
                const ry = d.rotation.toFixed(6);
                const rz = (d.rotZ ?? 0).toFixed(6);
                const scl = d.scale.toFixed(6);
                propLines.push(
                    `    <prop id="${id}" name="${name}" pos="${px} ${py} ${pz}" rot="${rx} ${ry} ${rz}" scl="${scl}"/>`
                );
            }
        }

        const propsBlock = propLines.length > 0 ? '\n' + propLines.join('\n') + '\n' : '';

        return (
            `<?xml version="1.0" encoding="UTF-8"?>\n` +
            `<Decorations version="1" mapId="${mapId}" mapName="${mapName}" type="0">${propsBlock}</Decorations>`
        );
    }
}

export default XmlExportAdapter;
