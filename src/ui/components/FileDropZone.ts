/**
 * FileDropZone Component
 * Encapsulate drag/drop handlers
 * Validate dropped files
 * Publish LoadLayoutCommand
 */

import * as domHelpers from '../domHelpers.js';
import * as eventBinders from '../eventBinders.js';
import type { AppService } from '../../application/AppService.js';
import type { EventBus } from '../EventBus.js';

interface FileDropZoneOptions {
    useExistingUI?: boolean;
    fileInputElement?: HTMLInputElement;
}

interface FileSystemFileHandleLike {
    getFile(): Promise<File>;
}

interface FilePickerWindow extends Window {
    showOpenFilePicker?: (options: {
        startIn: 'documents';
        types: Array<{ description: string; accept: Record<string, string[]> }>;
        excludeAcceptAllOption: boolean;
        multiple: boolean;
    }) => Promise<FileSystemFileHandleLike[]>;
}

declare global {
    interface Window {
        completeLayoutLoadingWorkflow?: (xmlContent: string, fileName: string) => Promise<void>;
    }
}

class FileDropZone {
    private container: HTMLElement;
    private appService: AppService;
    private eventBus: EventBus | null;
    private options: FileDropZoneOptions;
    private dropZone: HTMLElement | null;
    private fileInput: HTMLInputElement | null;
    private useExistingUI: boolean;

    constructor(containerElement: HTMLElement, appService: AppService, eventBus: EventBus | null, options: FileDropZoneOptions = {}) {
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
    initialize(): void {
        if (this.useExistingUI) {
            // Use existing HTML structure - just find the file input
            const existingInput = this.options.fileInputElement ?? document.getElementById('file-input');
            this.fileInput = existingInput instanceof HTMLInputElement ? existingInput : null;
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
    bindEvents(): void {
        if (this.useExistingUI) {
            // Bind drag/drop to existing container (map-container)
            this.bindDragDropEvents();

            // File input change
            if (this.fileInput) {
                this.fileInput.addEventListener('change', (event) => {
                    const input = event.currentTarget as HTMLInputElement;
                    if (input.files) this.handleFileSelect(input.files);
                });
            }
        } else {
            const dropZone = this.dropZone;
            const fileInput = this.fileInput;
            if (!dropZone || !fileInput) return;
            // Drag and drop using eventBinders
            if (this.eventBus) {
                eventBinders.bindFileDropZone(
                    dropZone,
                    this.appService,
                    this.eventBus
                );
            }

            // Click to browse
            dropZone.addEventListener('click', () => {
                fileInput.click();
            });

            // File input change
            fileInput.addEventListener('change', (event) => {
                const input = event.currentTarget as HTMLInputElement;
                if (input.files) this.handleFileSelect(input.files);
            });
        }
    }

    /**
     * Bind drag/drop events manually to existing element
     */
    bindDragDropEvents(): void {
        const dropZone = this.dropZone;
        if (!dropZone) return;
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Only remove drag-over if we're leaving the container entirely
            if (e.target === dropZone) {
                dropZone.classList.remove('drag-over');
            }
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');

            if (e.dataTransfer) this.handleFileSelect(e.dataTransfer.files);
        });
    }

    /**
     * Handle file selection
     * @param {FileList} files - Selected files
     */
    handleFileSelect(files: FileList | File[]): void {
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

        reader.onload = async () => {
            try {
                const xmlContent = reader.result;
                if (typeof xmlContent !== 'string') throw new Error('File contents could not be read as text');

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

                    if (typeof result === 'object' && result !== null && 'requiresConfirmation' in result && result.requiresConfirmation) {
                        const confirmation = result as { currentMapName?: string; newMapName?: string };
                        // Different map — publish event for confirmation dialog handling
                        if (this.eventBus) {
                            this.eventBus.publish('confirm:mapSwitch', {
                                currentMapName: confirmation.currentMapName,
                                newMapName: confirmation.newMapName,
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
                alert('Error loading layout: ' + (error instanceof Error ? error.message : String(error)));
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
    showSuccess(message: string): void {
        if (this.useExistingUI) {
            // When using existing UI, just log success
            console.log('[FileDropZone] ✅', message);
            // Could publish a success event to EventBus if needed
            if (this.eventBus) {
                this.eventBus.publish('FILE_LOADED', { message });
            }
            return;
        }

        const dropZone = this.dropZone;
        if (!dropZone) return;
        const originalClass = dropZone.className;

        domHelpers.addClass(dropZone, 'success');

        const messageEl = dropZone.querySelector<HTMLParagraphElement>('.drop-zone-message p');
        if (messageEl) {
            const originalText = messageEl.textContent;
            messageEl.textContent = message;

            setTimeout(() => {
                dropZone.className = originalClass;
                messageEl.textContent = originalText;
            }, 3000);
        }
    }

    /**
     * Reset file input
     */
    resetInput(): void {
        if (this.fileInput) {
            this.fileInput.value = '';
        }
    }

    /**
     * Get the container element
     * @returns {HTMLElement}
     */
    getElement(): HTMLElement {
        return this.container;
    }

    /**
     * Trigger file browser.
     * Uses the File System Access API (showOpenFilePicker) when available so the
     * dialog opens in the user's Documents folder by default.
     * Falls back to a hidden <input type="file"> click for browsers that don't
     * support the API.
     */
    async browse(): Promise<void> {
        const filePickerWindow = window as FilePickerWindow;
        if (filePickerWindow.showOpenFilePicker) {
            try {
                const [fileHandle] = await filePickerWindow.showOpenFilePicker({
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
                if (!(err instanceof DOMException && err.name === 'AbortError')) {
                    console.error('[FileDropZone] Error opening file picker:', err);
                }
            }
        } else {
            this.fileInput?.click();
        }
    }
}

export { FileDropZone };
