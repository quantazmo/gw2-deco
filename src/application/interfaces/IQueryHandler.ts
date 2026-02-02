/**
 * IQuery - Base interface for all application queries
 */
export interface IQuery {
    readonly type: string;
}

/**
 * IQueryHandler - Interface for query handlers in the application layer
 * @layout TQuery - The query type this handler processes
 * @layout TResult - The result type
 */
export interface IQueryHandler<TQuery extends IQuery, TResult = unknown> {
    handle(query: TQuery): TResult;
}
