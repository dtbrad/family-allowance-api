import * as AWS from "aws-sdk";
import {TransactionsQueryParams} from "./TransactionQueryParams";

const table = process.env.TABLE_NAME || "";
const dynamo = new AWS.DynamoDB.DocumentClient();

export async function getAfterStartDate({startDate, userId, sort, limit}: TransactionsQueryParams) {
    return await dynamo.query({
        TableName: table,
        KeyConditionExpression: "#pk = :pk and #sk > :startDate",
        ExpressionAttributeNames: {
            "#pk": "PK",
            "#sk": "SK"
        },
        ExpressionAttributeValues: {
            ":pk": userId,
            ":startDate": startDate
        },
        ScanIndexForward: sort === "asc",
        Limit: limit
    }).promise();
}

export async function getBeforeEndDate({endDate, userId, sort, limit}: TransactionsQueryParams) {
    return await dynamo.query({
        TableName: table,
        KeyConditionExpression: "#pk = :pk and #sk < :endDate",
        ExpressionAttributeNames: {
            "#pk": "PK",
            "#sk": "SK"
        },
        ExpressionAttributeValues: {
            ":pk": userId,
            ":endDate": endDate
        },
        ScanIndexForward: sort === "asc",
        Limit: limit
    }).promise();
}

export async function getBetweenDates({startDate, endDate, userId, sort, limit}: TransactionsQueryParams) {
    return await dynamo.query({
        TableName: table,
        KeyConditionExpression: "#pk = :pk and #sk Between :startDate And :endDate",
        ExpressionAttributeNames: {
            "#pk": "PK",
            "#sk": "SK"
        },
        ExpressionAttributeValues: {
            ":pk": userId,
            ":startDate": startDate,
            ":endDate": endDate
        },
        ScanIndexForward: sort === "asc",
        Limit: limit
    }).promise();
}

export default async function getTransactions({startDate, endDate, userId, sort, limit}: TransactionsQueryParams) {
    if (startDate && endDate) {
        return await getBetweenDates({startDate, endDate, userId, sort, limit});
    }

    if (startDate) {
        return await getAfterStartDate({startDate, userId, sort, limit});
    }

    return await getBeforeEndDate({endDate, userId, sort, limit});
}
