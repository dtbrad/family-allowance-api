import * as AWS from "aws-sdk";
import createResponse from "./helpers/createResponse";

const TableName = process.env.TABLE_NAME;
const dynamo = new AWS.DynamoDB.DocumentClient();

interface Transaction {
    amount: number;
    transactionDate: string;
    description?: string;
}

export const handler = async function createTransactions(event: AWSLambda.APIGatewayEvent) {
    const {origin} = event.headers;
    const {userId} = event.pathParameters;
    const body = JSON.parse(event.body);
    const transactions = body.transactions as Transaction[];
    const total = transactions.reduce((acc, curr) => acc + curr.amount, 0);
    const role = event.requestContext.authorizer?.role;

    if (role !== "admin") {
        return createResponse(origin, {statusCode: 404});
    }

    try {
        await Promise.all(transactions.map(async function ({amount, transactionDate, description = "allowance"}) {
            return dynamo.put({
                TableName,
                Item: {
                    PK: userId,
                    SK: transactionDate,
                    amount,
                    description
                }
            }).promise();
        }));

        await dynamo.update({
            TableName,
            Key: {PK: userId, SK: userId},
            UpdateExpression: "ADD balance :amount",
            ConditionExpression: "PK = :userId And SK = :userId",
            ExpressionAttributeValues: {
                ":amount": total,
                ":userId": userId
            },
            ReturnValues: "UPDATED_NEW"
        }).promise();

        return createResponse(origin, {statusCode: 200, body: {total, transactionLength: transactions.length}});


    } catch (error) {
        if (error.code === "ConditionalCheckFailedException") {
            return createResponse(origin, {statusCode: 200, body: {message: "User does not exist"}});
        }

        return createResponse(origin, {statusCode: 500, body: {message: "Uh oh, something went wrong on the server"}});
    }
};
