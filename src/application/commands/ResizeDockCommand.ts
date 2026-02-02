/**
 * ResizeDockCommand
 * Resize a split region by updating the ratio of a specific SplitNode identified by its path.
 */
export class ResizeDockCommand {
    splitNodePath: string[];
    newRatio: number;

    constructor(splitNodePath: string[], newRatio: number) {
        this.splitNodePath = splitNodePath;
        this.newRatio = newRatio;
    }
}
