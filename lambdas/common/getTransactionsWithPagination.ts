import getTransactions from "./getTransactions";
import {TransactionsQueryParams} from "./TransactionQueryParams";

// if sort is asc, adds a second to the time, otherwise subtracts a second
function calculateNextStartDate(timeString: string, sort: string) {
    const date = new Date(timeString);
    const adjustment = sort === "asc" ? 1 : -1;

    date.setSeconds(date.getSeconds() + adjustment);
    return date.toISOString();
}

export default async function getTransactionsWithPagination(queryArgs: TransactionsQueryParams) {
    const result = await getTransactions(queryArgs);
    const entries = result.Items.map((item) => ({
        date: item.SK,
        amount: item.amount,
        description: item.description
    }));

    // if there is no LastEvaluatedKey, then we are certain there are no more transactions for our query
    if (!result.LastEvaluatedKey) {
        return {entries};
    }

    // there may not be more items even if a LastEvaluatedKey is returned, because dynamodb is weird,
    // so using screwed up second-query logic below to confirm items

    // generate new start or end date based on the LastEvaluatedKey SK and the sort order
    const {userId, startDate, endDate: endDate, sort, limit} = queryArgs;
    const lastEvaluatedDate = result.LastEvaluatedKey.SK;
    const newQueryDate = calculateNextStartDate(lastEvaluatedDate, sort);
    const newStartDate = sort === "asc" ? newQueryDate : startDate;
    const newEndDate = sort === "asc" ? endDate : newQueryDate;

    // then run a second query using the revised start or end date to see if there are any items left
    const secondResult = await getTransactions({
        userId,
        startDate: newStartDate,
        endDate: newEndDate,
        sort,
        limit
    });

    // if there are items in secondResult, then send the newQueryDate with the response
    return {
        entries,
        nextDateToQuery: secondResult?.Items?.length > 0 ? newQueryDate : undefined
    };
}
