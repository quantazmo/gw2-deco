/**
 * ICommand - Base interface for all application commands
 */
export interface ICommand {
    readonly type: string;
}

/**
 * ICommandHandler - Interface for command handlers in the application layer
 * @layout TCommand - The command type this handler processes
 * @layout TResult - The result type (defaults to void for fire-and-forget commands)
 */
export interface ICommandHandler<TCommand extends ICommand, TResult = void> {
    execute(command: TCommand): TResult;
}
