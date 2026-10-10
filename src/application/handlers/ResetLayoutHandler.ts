/**
 * ResetLayoutHandler
 * Handles ResetLayoutCommand.
 *
 * Replaces the LayoutStore state with the canonical default layout and
 * removes the persisted entry from localStorage (via LayoutRepository.clear).
 */

import { DockLayoutConfiguration } from '../../domain/DockLayoutConfiguration.js';
import { DockPanelLayoutStore } from '../../ui/stores/DockPanelLayoutStore.ts';
import { ResetLayoutCommand } from '../commands/ResetLayoutCommand.ts';

type ClearableRepository = { clear(): void };

export class ResetLayoutHandler {
    _layoutStore: DockPanelLayoutStore;
    _repository: ClearableRepository | null;

    /**
     * @param {import('../../ui/stores/LayoutStore.js').LayoutStore} layoutStore
     * @param {import('../../infrastructure/repositories/LayoutRepository.js').LayoutRepository|null} [repository]
     *   Optional. When provided, clear() is called to remove the persisted layout.
     */
    constructor(layoutStore: DockPanelLayoutStore, repository: ClearableRepository | null = null) {
        this._layoutStore = layoutStore;
        this._repository = repository;
    }

    /**
     * @param {import('../commands/ResetLayoutCommand.js').ResetLayoutCommand} _command
     */
    execute(_command: ResetLayoutCommand): void {
        return this.handle(_command);
    }

    /**
     * @param {import('../commands/ResetLayoutCommand.js').ResetLayoutCommand} _command
     */
    handle(_command: ResetLayoutCommand): void {
        // Replace store state with the default layout
        this._layoutStore.setState(DockLayoutConfiguration.createDefault());

        // Remove the persisted layout so the next load also uses the default
        if (this._repository) {
            this._repository.clear();
        }
    }
}
