/**
 * ResetLayoutCommand
 * Signals that the layout should be reset to the default configuration.
 * No fields required — the default is defined by LayoutConfiguration.createDefault().
 */
export class ResetLayoutCommand {
    type: string;

    constructor() {
        this.type = 'ResetLayoutCommand';
    }
}
