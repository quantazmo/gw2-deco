/**
 * ResizeDockCommand
 * Resize a split region by updating the ratio of a specific SplitNode identified by its path.
 */
import { DockNodePath } from '../../domain/DockLayoutConfiguration.ts';

export class ResizeDockCommand {
    splitNodePath: DockNodePath;
    newRatio: number;

    constructor(splitNodePath: DockNodePath, newRatio: number) {
        this.splitNodePath = splitNodePath;
        this.newRatio = newRatio;
    }
}
