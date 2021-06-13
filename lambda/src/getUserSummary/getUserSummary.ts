import * as AWS from "aws-sdk";
import createResponse from "../helpers/createResponse";
import getTransactionsWithPagination from "./getTransactionsWithPagination";

const tableName = process.env.TABLE_NAME;
const dynamo = new AWS.DynamoDB.DocumentClient();

export const handler = async function getUserSummary(event: AWSLambda.APIGatewayEvent) {
    const {origin} = event.headers;
    const params = event.pathParameters;
    const userId = params?.userId.toLowerCase();
    const query = event.queryStringParameters;
    const {
        startDate,
        endDate = new Date().toISOString(), // because default sort is descending and don't want to use a scan
        sort = "desc", // default
        limit = "10" // default
    } = query || {};

    const {role, userId: userIdFromJwt} = event.requestContext.authorizer;

    if (userId !== userIdFromJwt && role !== "admin") {
        return createResponse(origin, {
            statusCode: 404
        });
    }

    const balanceResult = await dynamo.get({
        TableName: tableName,
        Key: {PK: userId, SK: userId}
    }).promise();

    const balance = balanceResult.Item?.balance;

    const transactions = await getTransactionsWithPagination({
        userId,
        startDate,
        endDate,
        sort,
        limit: parseInt(limit, 10) || 10
    });

    return createResponse(origin, {
        statusCode: 200,
        body: {userId, balance, transactions}
    });
};
