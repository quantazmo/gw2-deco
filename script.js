import { loadMap } from './gw2.js';

// Handle collapsable groups
function toggleGroup(header) {
    header.classList.toggle('collapsed');
    var content = header.nextElementSibling;
    content.classList.toggle('collapsed');
}

/** @type {GW2Map} */
let map = { id: 0, name: '', boundary: [] };

// Disable add-layer button until a template is loaded
function updateAddLayerButtonState() {
    const addLayerBtn = document.getElementById('add-layer-btn');
    addLayerBtn.disabled = map.id === 0;
}

var zoom;
var xZoom;
var yZoom;
var xZoomBase;
var yZoomBase;

let mapLayer;
let mapTiles;

// Layer management
let layerCount = 0;
let activeLayerId = 0;
let currentTemplateName = '';
const layers = [];

/**
 * Add a new layer
 * @return {Object} The newly added layer
 */
function addLayer() {
    const newLayer = {
        id: layers.length + 1,
        name: 'Layer ' + (++layerCount),
        isVisible: true
    }
    layers.push(newLayer);
    updateLayers();
    return newLayer;
}

function setActiveLayer(layerElement, layerId) {
    // Remove active class from all layers
    document.querySelectorAll('.layer-item').forEach(item => {
        item.classList.remove('active-layer');
    });

    // Set as active
    activeLayerId = layerId;
    layerElement.classList.add('active-layer');
}

/**
 * Delete a layer
 * @param {Element} button 
 */
function deleteLayer(button) {
    var layerItem = button.parentElement;
    var layersList = document.getElementById('layers-list');

    const index = Array.from(layersList.children).indexOf(layerItem);
    layers.splice(index, 1);
    updateLayers();
}

/**
 * Update the layers list UI
 */
function updateLayers() {
    var layersList = document.getElementById('layers-list');
    layersList.replaceChildren();

    // Add template name label at the top
    if (currentTemplateName) {
        var templateLabel = document.createElement('div');
        templateLabel.className = 'template-label';
        templateLabel.textContent = currentTemplateName;
        layersList.appendChild(templateLabel);
    }

    layers.forEach(layer => {
        var newLayer = document.createElement('div');
        newLayer.className = 'layer-item';
        if (layer.id === activeLayerId) {
            newLayer.classList.add('active-layer');
        }
        newLayer.innerHTML = `
            <span class="visibility-icon" data-visible="${layer.isVisible}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            </span>
            <span class="layer-name">${layer.name}</span>
            <button class="delete-layer-btn" onclick="deleteLayer(this)">✕</button>`;
        const visibilityIcon = newLayer.querySelector('.visibility-icon');
        const layerNameSpan = newLayer.querySelector('.layer-name');

        visibilityIcon.addEventListener('click', function (e) {
            e.stopPropagation();
            layer.isVisible = !layer.isVisible;
            visibilityIcon.setAttribute('data-visible', layer.isVisible);
            layer.data.style("opacity", layer.isVisible ? 1 : 0);
        });

        layerNameSpan.addEventListener('dblclick', function (e) {
            e.stopPropagation();
            editLayerName(layerNameSpan, layer);
        });

        newLayer.addEventListener('click', function () {
            setActiveLayer(newLayer, layer.id);
        });
        layersList.appendChild(newLayer);
    });
}

/**
 * Enable editing of layer name
 * @param {Element} nameSpan - The layer name span element
 * @param {Object} layer - The layer object
 */
function editLayerName(nameSpan, layer) {
    const currentName = layer.name;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'layer-name-input';
    input.value = currentName;

    nameSpan.replaceWith(input);
    input.focus();
    input.select();

    function saveLayerName() {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
            layer.name = newName;
        }
        updateLayers();
    }

    input.addEventListener('blur', saveLayerName);
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            saveLayerName();
        } else if (e.key === 'Escape') {
            updateLayers();
        }
    });
}

// Function triggered during zoom
function zoomed() {
    var newXScale = d3.event.transform.rescaleX(xZoomBase);
    var newYScale = d3.event.transform.rescaleY(yZoomBase);

    xZoom.domain(newXScale.domain());
    yZoom.domain(newYScale.domain());

    // Update circle positions
    for (const layer of layers) {
        layer.svg
            .attr("cx", function (d) { return xZoom(d.x); })
            .attr("cy", function (d) { return yZoom(d.y); });
    }

    if (mapTiles !== undefined) {
        mapTiles
            .attr("x", function (tile) { return Math.round(xZoom(tile.mapCoords.x)); })
            .attr("y", function (tile) { return Math.round(yZoom(tile.mapCoords.y + tile.tileSize)); })
            .attr("width", function (tile) { return Math.round(xZoom(tile.mapCoords.x + tile.tileSize) - xZoom(tile.mapCoords.x)) + 1; })
            .attr("height", function (tile) { return Math.round(yZoom(tile.mapCoords.y) - yZoom(tile.mapCoords.y + tile.tileSize)) + 1; });
    }

    if (mapLayer !== undefined) {
        mapLayer.attr("points", map.boundary.map(function (d) {
            return xZoom(d.x) + "," + yZoom(d.y);
        }).join(" ")) // Format the points into a "x1,y1 x2,y2..." string
    }
}

/** 
 * Reset zoom
 */
function resetZoom() {
    if (map.id === 0) return;

    // Find min/max coordinates from boundary polygon points
    let minX = Math.min(...map.boundary.map(point => point.x));
    let maxX = Math.max(...map.boundary.map(point => point.x));
    let minY = Math.min(...map.boundary.map(point => point.y));
    let maxY = Math.max(...map.boundary.map(point => point.y));

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;

    // set the dimensions and margins of the graph
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    const width = window.innerWidth - margin.left - margin.right - toolPanel.offsetWidth;
    const height = window.innerHeight - margin.top - margin.bottom;

    const chartAspect = width / height;
    const dataAspect = rangeX / rangeY;
    if (chartAspect > dataAspect) {
        // Chart is wider than data
        const desiredRangeX = rangeY * chartAspect;
        const difference = desiredRangeX - rangeX;
        minX -= Math.round(difference / 2);
        maxX += Math.round(difference / 2);
    } else if (dataAspect > chartAspect) {
        // Data is wider than chart
        const desiredRangeY = rangeX / chartAspect;
        const difference = desiredRangeY - rangeY;
        minY -= Math.round(difference / 2);
        maxY += Math.round(difference / 2);
    }
    console.log(`Reset Zoom - minX: ${minX}, maxX: ${maxX}, minY: ${minY}, maxY: ${maxY}`);

    // Add X axis
    var x = d3.scaleLinear()
        .domain([minX, maxX])
        .range([0, width]);

    // Add Y axis
    var y = d3.scaleLinear()
        .domain([minY, maxY])
        .range([height, 0]);

    // Create scales for zoom transformation
    xZoom = x.copy();
    yZoom = y.copy();

    // Store the original copy for proper rescaling
    xZoomBase = x.copy();
    yZoomBase = y.copy();

    d3.select('svg').call(zoom.transform, d3.zoomIdentity);
}

/**
 * Load map data from XML string
 * @param {string} xmlString - The XML content as a string
 * @returns {Promise<GW2Template>}
 */
async function loadTemplateFromXml(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

    // Check for parsing errors
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('XML parsing error: Invalid XML file');
    }

    const xmlMap = xmlDoc.documentElement;
    const mapId = parseInt(xmlMap.getAttribute("mapId"));

    const template = {
        id: mapId,
        name: xmlMap.getAttribute("mapName"),
        decorations: [...xmlDoc.getElementsByTagName("prop")]
            .map(xmlProp => {
                let position = xmlProp.getAttribute('pos').split(' ');
                let rotation = xmlProp.getAttribute('rot').split(' ');
                return {
                    id: parseInt(xmlProp.getAttribute('id')),
                    name: xmlProp.getAttribute('name'),
                    position: {
                        x: parseFloat(position[0]),
                        y: parseFloat(position[1]),
                        z: parseFloat(position[2])
                    },
                    rotation: {
                        x: parseFloat(rotation[0]),
                        y: parseFloat(rotation[1]),
                        z: parseFloat(rotation[2])
                    },
                    scale: parseFloat(xmlProp.getAttribute('scl'))
                };
            })
    };

    return template;
}



// Handle panel resizing
var isResizing = false;
var startX = 0;
var startWidth = 0;

var panelResizer = document.getElementById('panel-resizer');
var toolPanel = document.getElementById('tool-panel');

panelResizer.addEventListener('mousedown', function (e) {
    isResizing = true;
    startX = e.clientX;
    startWidth = toolPanel.offsetWidth;
});

document.addEventListener('mousemove', function (e) {
    if (!isResizing) return;

    var deltaX = startX - e.clientX; // Subtract because moving right should decrease panel width
    var newWidth = startWidth + deltaX;

    // Set minimum width of 200px
    if (newWidth < 200) newWidth = 200;

    toolPanel.style.width = newWidth + 'px';
});

document.addEventListener('mouseup', function () {
    isResizing = false;
});

// Handle drag and drop for file uploads
const chartContainer = document.getElementById('chart-container');

chartContainer.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.stopPropagation();
    chartContainer.classList.add('drag-over');
});

chartContainer.addEventListener('dragenter', function (e) {
    e.preventDefault();
    e.stopPropagation();
    chartContainer.classList.add('drag-over');
});

chartContainer.addEventListener('dragleave', function (e) {
    e.preventDefault();
    e.stopPropagation();
    // Only remove drag-over if we're leaving the container entirely
    if (e.target === chartContainer) {
        chartContainer.classList.remove('drag-over');
    }
});

chartContainer.addEventListener('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();
    chartContainer.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    handleDroppedFiles(files);
});

/**
 * Handle files dropped onto the container
 * @param {FileList} files - The dropped files
 */
function handleDroppedFiles(files) {
    for (const file of files) {
        if (file.type === 'text/xml' || file.name.endsWith('.xml')) {
            const reader = new FileReader();
            reader.onload = async function (event) {
                try {
                    const xmlString = event.target.result;

                    const template = await loadTemplateFromXml(xmlString);
                    const newMap = await loadMap(template.id);
                    // Enable add-layer button when a valid map is loaded
                    updateAddLayerButtonState();

                    if (map.id === 0) {
                        initializeMapElements();
                    }
                    if (newMap.id !== map.id) {
                        map = newMap;
                    }

                    addTemplate(template);
                    resetZoom();
                } catch (error) {
                    console.error("Error reading file:", error);
                    alert('Error reading file: ' + error.message);
                }
            };
            reader.readAsText(file);
        } else {
            console.warn('Skipped non-XML file:', file.name);
        }
    }
}

/**
 * Initialize map elements after loading a new map.
 */
function initializeMapElements() {
    const chartContainer = document.getElementById('chart-container');
    chartContainer.innerHTML = `
        <svg>
            <g></g>
        </svg>`;
    // set the dimensions and margins of the graph
    var margin = { top: 10, right: 10, bottom: 10, left: 10 };
    var width = window.innerWidth - margin.left - margin.right - toolPanel.offsetWidth;
    var height = window.innerHeight - margin.top - margin.bottom;

    updateLayers();

    // append the svg object to the body of the page
    var svg = d3.select('svg g')
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Add X axis
    var x = d3.scaleLinear()
        .domain([0, 100])
        .range([0, width]);

    // Add Y axis
    var y = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);

    // Create scales for zoom transformation
    xZoom = x.copy();
    yZoom = y.copy();

    // Store the original copy for proper rescaling
    xZoomBase = x.copy();
    yZoomBase = y.copy();

    // Define zoom behavior
    zoom = d3.zoom()
        .filter(function () {
            // Allow zoom on middle mouse (button 1) and left mouse (button 0)
            return (event.button === 0 || event.button === 1);
        })
        .on("zoom", zoomed)
        .scaleExtent([1, 30]); // Allow zooming from 0.5x to 10x

    // Apply zoom to the main SVG element
    d3.select('svg')
        .style('pointer-events', 'all')
        .call(zoom);
}

/**
 * Draw the decorations from the loaded template
 * @param {GW2Template} template 
 */
function addTemplate(template) {
    console.log("Loaded template from file:", template);
    // Store the template name
    currentTemplateName = template.name;
    // Clear existing map and layers
    layers.splice(0);
    layerCount = 0;
    activeLayerId = 0;
    var svg = d3.select('svg g')
    svg.selectAll("*").remove();

    // Draw the map tiles
    mapTiles = svg.selectAll("image.tile")
        .data(map.tiles)
        .enter()
        .append("image")
        .attr("class", "tile")
        .attr("xlink:href", function (tile) { return tile.url; });

    // Draw the map boundary
    mapLayer = svg.append("polygon")
        .attr("fill", "tan")
        .attr("stroke", "white")
        .attr("opacity", "0.25")
        .attr("stroke-width", 2);

    const layer = addLayer();
    layer.decorations = template.decorations.map(decoration => ({
        x: decoration.position.x,
        y: decoration.position.y
    }));
    // Draw decoration layers
    layer.svg = svg.selectAll("circle")
        .data(layer.decorations)
        .enter()
        .append("circle")
        .attr("cx", function (d) { return d.x; })
        .attr("cy", function (d) { return d.y; })
        .attr("r", 4);
}

/**
 * Open file dialog to select an XML file
 */
function openFileDialog() {
    const fileInput = document.getElementById('file-input');
    fileInput.click();
}

// Handle file input change
const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', function (e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleDroppedFiles(files);
        // Reset the input so the same file can be selected again
        fileInput.value = '';
    }
});

// Expose functions to global scope for inline onclick handlers
window.resetZoom = resetZoom;
window.toggleGroup = toggleGroup;
window.addLayer = addLayer;
window.deleteLayer = deleteLayer;
window.setActiveLayer = setActiveLayer;
window.openFileDialog = openFileDialog;

// Initialize button state on page load
document.addEventListener('DOMContentLoaded', function () {
    updateAddLayerButtonState();
});
