/**
 * ResetLayoutHandler
 * Handles ResetLayoutCommand.
 *
 * Replaces the LayoutStore state with the canonical default layout and
 * removes the persisted entry from localStorage (via LayoutRepository.clear).
 */

import { DockLayoutConfiguration } from '../../domain/DockLayoutConfiguration.js';

export class ResetLayoutHandler {
    _layoutStore: any; // JS domain object � fully typed once domain migrates to TypeScript
    _repository: any; // JS domain object � fully typed once domain migrates to TypeScript

    /**
     * @param {import('../../ui/stores/LayoutStore.js').LayoutStore} layoutStore
     * @param {import('../../infrastructure/repositories/LayoutRepository.js').LayoutRepository|null} [repository]
     *   Optional. When provided, clear() is called to remove the persisted layout.
     */
    constructor(layoutStore: unknown, repository: unknown = null) {
        this._layoutStore = layoutStore;
        this._repository = repository;
    }

    /**
     * @param {import('../commands/ResetLayoutCommand.js').ResetLayoutCommand} _command
     */
    execute(_command: any) { // TODO: typed command interface pending domain migration
        return this.handle(_command);
    }

    /**
     * @param {import('../commands/ResetLayoutCommand.js').ResetLayoutCommand} _command
     */
    handle(_command: any) { // TODO: typed command interface pending domain migration
        // Replace store state with the default layout
        this._layoutStore.setState(DockLayoutConfiguration.createDefault());

        // Remove the persisted layout so the next load also uses the default
        if (this._repository) {
            this._repository.clear();
        }
    }
}
