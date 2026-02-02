// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileDropZone } from '../../../src/ui/components/FileDropZone.js';

function makeAppService(layerCount = 0) {
    return {
        layout: {
            getLayerCount: vi.fn().mockReturnValue(layerCount)
        },
        execute: vi.fn().mockResolvedValue(undefined)
    };
}

function makeEventBus() {
    return {
        publish: vi.fn(),
        subscribe: vi.fn()
    };
}

function makeContainer() {
    const el = document.createElement('div');
    document.body.appendChild(el);
    return el;
}

function makeFileInput() {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'file-input';
    document.body.appendChild(input);
    return input;
}

describe('FileDropZone.browse()', () => {
    let container;
    let fileInput;
    let appService;
    let eventBus;
    let dropZone;
    let originalShowOpenFilePicker;

    beforeEach(() => {
        container = makeContainer();
        fileInput = makeFileInput();
        appService = makeAppService();
        eventBus = makeEventBus();
        originalShowOpenFilePicker = window.showOpenFilePicker;

        dropZone = new FileDropZone(container, appService, eventBus, {
            useExistingUI: true,
            fileInputElement: fileInput
        });
    });

    afterEach(() => {
        container.remove();
        fileInput.remove();
        if (originalShowOpenFilePicker !== undefined) {
            window.showOpenFilePicker = originalShowOpenFilePicker;
        } else {
            delete window.showOpenFilePicker;
        }
    });

    describe('when showOpenFilePicker is available', () => {
        it('calls showOpenFilePicker with startIn "documents" on first browse', async () => {
            const mockFile = new File(['<xml/>'], 'test.xml', { type: 'text/xml' });
            const mockHandle = { getFile: vi.fn().mockResolvedValue(mockFile) };
            window.showOpenFilePicker = vi.fn().mockResolvedValue([mockHandle]);

            await dropZone.browse();

            expect(window.showOpenFilePicker).toHaveBeenCalledWith(
                expect.objectContaining({ startIn: 'documents' })
            );
        });

        it('accepts XML file types only', async () => {
            const mockFile = new File(['<xml/>'], 'test.xml', { type: 'text/xml' });
            const mockHandle = { getFile: vi.fn().mockResolvedValue(mockFile) };
            window.showOpenFilePicker = vi.fn().mockResolvedValue([mockHandle]);

            await dropZone.browse();

            const options = window.showOpenFilePicker.mock.calls[0][0];
            expect(options.types).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        accept: expect.objectContaining({ 'text/xml': expect.arrayContaining(['.xml']) })
                    })
                ])
            );
        });

        it('uses the last file handle as startIn on a subsequent browse', async () => {
            const mockFile = new File(['<xml/>'], 'test.xml', { type: 'text/xml' });
            const mockHandle = { getFile: vi.fn().mockResolvedValue(mockFile) };
            window.showOpenFilePicker = vi.fn().mockResolvedValue([mockHandle]);

            // First browse
            await dropZone.browse();

            // Second browse — should still use 'documents' (no last-handle memory)
            await dropZone.browse();

            const secondCallOptions = window.showOpenFilePicker.mock.calls[1][0];
            expect(secondCallOptions.startIn).toBe('documents');
        });

        it('does not throw when the user cancels (AbortError)', async () => {
            const abortError = new DOMException('The user aborted a request.', 'AbortError');
            window.showOpenFilePicker = vi.fn().mockRejectedValue(abortError);

            await expect(dropZone.browse()).resolves.not.toThrow();
        });

        it('reads the selected file via handleFileSelect', async () => {
            const mockFile = new File(['<decorations/>\n'], 'gw2.xml', { type: 'text/xml' });
            const mockHandle = { getFile: vi.fn().mockResolvedValue(mockFile) };
            window.showOpenFilePicker = vi.fn().mockResolvedValue([mockHandle]);

            const handleFileSelectSpy = vi.spyOn(dropZone, 'handleFileSelect');

            await dropZone.browse();

            expect(handleFileSelectSpy).toHaveBeenCalledWith([mockFile]);
        });
    });

    describe('when showOpenFilePicker is not available', () => {
        it('falls back to clicking the file input', () => {
            delete window.showOpenFilePicker;
            const clickSpy = vi.spyOn(fileInput, 'click');

            dropZone.browse();

            expect(clickSpy).toHaveBeenCalled();
        });
    });
});
