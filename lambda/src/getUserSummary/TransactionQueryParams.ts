export interface TransactionsQueryParams {
    userId: string;
    startDate?: string;
    endDate?: string;
    sort: string;
    limit: number;
}
