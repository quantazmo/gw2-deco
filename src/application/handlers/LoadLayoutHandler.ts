// @ts-nocheck
/**
 * Handler for LoadLayoutCommand
 */
import { XmlLayoutAdapter } from '../../infrastructure/XmlLayoutAdapter.js';

export class LoadLayoutHandler {
    xmlAdapter: any; // JS domain object � fully typed once domain migrates to TypeScript
    layoutRepository: any; // JS domain object � fully typed once domain migrates to TypeScript

    /**
     * @param {XmlLayoutAdapter} xmlAdapter - XML layout adapter
     * @param {LocalLayoutRepository} layoutRepository - Optional repository for loading saved layouts
     */
    constructor(xmlAdapter: unknown, layoutRepository: unknown = null) {
        this.xmlAdapter = xmlAdapter;
        this.layoutRepository = layoutRepository;
    }

    /**
     * Executes the load layout command
     * @param {LoadLayoutCommand} command - The command to execute
     * @returns {Object} The parsed layout data (DTO or domain entity)
     */
    async execute(command) {
        // If layout ID is provided and repository is available, load from repository
        if (command.layoutId && this.layoutRepository) {
            const layout = await this.layoutRepository.loadById(command.layoutId);
            if (!layout) {
                throw new Error(`Layout with ID '${command.layoutId}' not found`);
            }
            return layout;
        }

        // Otherwise, parse XML content (legacy/import workflow)
        if (command.xmlContent) {
            const layoutData = await XmlLayoutAdapter.parseLayout(command.xmlContent);
            return layoutData;
        }

        throw new Error('LoadLayoutHandler: Either layoutId or xmlContent must be provided');
    }

    /**
     * Alias for execute() to match test interface (synchronous version)
     * @param {LoadLayoutCommand} command - The command to execute
     * @returns {Object} The parsed layout data
     */
    handle(command: any) { // TODO: typed command interface pending domain migration
        if (!command) {
            throw new Error('LoadLayoutHandler.handle: command is required');
        }

        // Repository-based loading (synchronous wrapper)
        if (command.layoutId && this.layoutRepository) {
            try {
                // Note: loadById is async, this is a simplified sync version
                // In production, prefer using execute() which is async
                throw new Error('LoadLayoutHandler.handle: Use execute() for repository-based loading');
            } catch (error) {
                throw new Error(`LoadLayoutHandler.handle: ${error.message}`);
            }
        }

        // XML-based loading (legacy)
        if (!command.xmlContent || String(command.xmlContent).trim().length === 0) {
            throw new Error('LoadLayoutHandler.handle: xmlContent cannot be empty');
        }

        try {
            const layoutData = XmlLayoutAdapter.parseLayoutSync(command.xmlContent);
            return layoutData;
        } catch (error) {
            throw new Error(`LoadLayoutHandler.handle: Failed to parse layout - ${error.message}`);
        }
    }
}

export default LoadLayoutHandler;
