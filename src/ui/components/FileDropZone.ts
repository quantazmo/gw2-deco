// @ts-nocheck
/**
 * FileDropZone Component
 * Encapsulate drag/drop handlers
 * Validate dropped files
 * Publish LoadLayoutCommand
 */

import * as domHelpers from '../domHelpers.js';
import * as eventBinders from '../eventBinders.js';

class FileDropZone {
    constructor(containerElement, appService, eventBus, options = {}) {
        this.container = containerElement;
        this.appService = appService;
        this.eventBus = eventBus;
        this.options = options;

        this.dropZone = null;
        this.fileInput = null;
        this.useExistingUI = options.useExistingUI || false;

        this.initialize();
        this.bindEvents();
    }

    /**
     * Initialize component structure
     */
    initialize() {
        if (this.useExistingUI) {
            // Use existing HTML structure - just find the file input
            this.fileInput = this.options.fileInputElement || document.getElementById('file-input');
            this.dropZone = this.container;
        } else {
            // Create new UI structure
            domHelpers.empty(this.container);
            domHelpers.addClass(this.container, 'file-drop-zone');

            // Create drop zone display
            this.dropZone = domHelpers.createElement('div', {
                className: 'drop-zone-display'
            });

            const icon = domHelpers.createElement('div', {
                className: 'drop-zone-icon',
                textContent: '📁'
            });

            const message = domHelpers.createElement('div', {
                className: 'drop-zone-message'
            });

            const mainText = domHelpers.createElement('p', {
                textContent: 'Drop layout file here'
            });

            const subText = domHelpers.createElement('p', {
                className: 'drop-zone-subtext',
                textContent: 'or click to browse'
            });

            message.appendChild(mainText);
            message.appendChild(subText);

            this.dropZone.appendChild(icon);
            this.dropZone.appendChild(message);

            this.container.appendChild(this.dropZone);

            // Create hidden file input
            this.fileInput = domHelpers.createElement('input', {
                attributes: {
                    type: 'file',
                    accept: '.xml',
                    style: 'display: none'
                }
            });

            this.container.appendChild(this.fileInput);
        }
    }

    /**
     * Bind events
     */
    bindEvents() {
        if (this.useExistingUI) {
            // Bind drag/drop to existing container (chart-container)
            this.bindDragDropEvents();

            // File input change
            if (this.fileInput) {
                this.fileInput.addEventListener('change', (event) => {
                    this.handleFileSelect(event.target.files);
                });
            }
        } else {
            // Drag and drop using eventBinders
            eventBinders.bindFileDropZone(
                this.dropZone,
                this.appService,
                this.eventBus
            );

            // Click to browse
            this.dropZone.addEventListener('click', () => {
                this.fileInput.click();
            });

            // File input change
            this.fileInput.addEventListener('change', (event) => {
                this.handleFileSelect(event.target.files);
            });
        }
    }

    /**
     * Bind drag/drop events manually to existing element
     */
    bindDragDropEvents() {
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.add('drag-over');
        });

        this.dropZone.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.add('drag-over');
        });

        this.dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Only remove drag-over if we're leaving the container entirely
            if (e.target === this.dropZone) {
                this.dropZone.classList.remove('drag-over');
            }
        });

        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.remove('drag-over');

            const files = e.dataTransfer.files;
            this.handleFileSelect(files);
        });
    }

    /**
     * Handle file selection
     * @param {FileList} files - Selected files
     */
    handleFileSelect(files) {
        if (files.length === 0) return;

        const file = files[0];

        // Validate file type
        if (!file.name.endsWith('.xml')) {
            if (this.eventBus) {
                this.eventBus.publish('ERROR', {
                    message: 'Please select an XML layout file'
                });
            }
            return;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            if (this.eventBus) {
                this.eventBus.publish('ERROR', {
                    message: 'File is too large (max 10MB)'
                });
            }
            return;
        }

        // Read file
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const xmlContent = e.target.result;

                // Check if layers already exist — use LoadAdditionalLayoutCommand
                // to add as a new layer instead of replacing everything
                const hasExistingLayers = this.appService &&
                    this.appService.layout &&
                    this.appService.layout.getLayerCount() > 0;

                if (hasExistingLayers) {
                    const command = {
                        type: 'LoadAdditionalLayoutCommand',
                        payload: {
                            xmlContent,
                            fileName: file.name
                        }
                    };
                    const result = await this.appService.execute(command);

                    if (result && result.requiresConfirmation) {
                        // Different map — publish event for confirmation dialog handling
                        if (this.eventBus) {
                            this.eventBus.publish('confirm:mapSwitch', {
                                currentMapName: result.currentMapName,
                                newMapName: result.newMapName,
                                xmlContent,
                                fileName: file.name
                            });
                        }
                    } else {
                        this.showSuccess(`Added layer: ${file.name}`);
                    }
                } else if (window.completeLayoutLoadingWorkflow) {
                    // First load — use the complete layout loading workflow from script.js
                    await window.completeLayoutLoadingWorkflow(xmlContent, file.name);
                    this.showSuccess(`Loaded: ${file.name}`);
                } else {
                    // Fallback: just execute the LoadLayoutCommand (won't complete full workflow)
                    console.warn('[FileDropZone] completeLayoutLoadingWorkflow not available, using fallback');
                    const command = {
                        type: 'LoadLayoutCommand',
                        payload: {
                            xmlContent,
                            fileName: file.name
                        }
                    };
                    await this.appService.execute(command);
                    this.showSuccess(`Loaded: ${file.name}`);
                }

                this.resetInput();
            } catch (error) {
                console.error('Error loading layout:', error);
                if (this.eventBus) {
                    this.eventBus.publish('ERROR', {
                        message: 'Failed to load layout file'
                    });
                }
                alert('Error loading layout: ' + error.message);
            }
        };

        reader.onerror = () => {
            if (this.eventBus) {
                this.eventBus.publish('ERROR', {
                    message: 'Failed to read file'
                });
            }
            this.resetInput();
        };

        reader.readAsText(file);
    }

    /**
     * Show success state
     * @param {string} message - Success message
     */
    showSuccess(message) {
        if (this.useExistingUI) {
            // When using existing UI, just log success
            console.log('[FileDropZone] ✅', message);
            // Could publish a success event to EventBus if needed
            if (this.eventBus) {
                this.eventBus.publish('FILE_LOADED', { message });
            }
            return;
        }

        const originalClass = this.dropZone.className;

        domHelpers.addClass(this.dropZone, 'success');

        const messageEl = this.dropZone.querySelector('.drop-zone-message p');
        if (messageEl) {
            const originalText = messageEl.textContent;
            messageEl.textContent = message;

            setTimeout(() => {
                this.dropZone.className = originalClass;
                messageEl.textContent = originalText;
            }, 3000);
        }
    }

    /**
     * Reset file input
     */
    resetInput() {
        if (this.fileInput) {
            this.fileInput.value = '';
        }
    }

    /**
     * Get the container element
     * @returns {HTMLElement}
     */
    getElement() {
        return this.container;
    }

    /**
     * Trigger file browser.
     * Uses the File System Access API (showOpenFilePicker) when available so the
     * dialog opens in the user's Documents folder by default.
     * Falls back to a hidden <input type="file"> click for browsers that don't
     * support the API.
     */
    async browse() {
        if ('showOpenFilePicker' in window) {
            try {
                const [fileHandle] = await window.showOpenFilePicker({
                    startIn: 'documents',
                    types: [{
                        description: 'XML Layout Files',
                        accept: { 'text/xml': ['.xml'] }
                    }],
                    excludeAcceptAllOption: false,
                    multiple: false
                });
                const file = await fileHandle.getFile();
                this.handleFileSelect([file]);
            } catch (err) {
                // AbortError means the user cancelled — not an error condition
                if (err.name !== 'AbortError') {
                    console.error('[FileDropZone] Error opening file picker:', err);
                }
            }
        } else {
            this.fileInput.click();
        }
    }
}

export { FileDropZone };
