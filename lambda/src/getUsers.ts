import * as AWS from "aws-sdk";
import createResponse from "./helpers/createResponse";

const tableName = process.env.TABLE_NAME;
const dynamo = new AWS.DynamoDB.DocumentClient();

export const handler = async function getUsers(event: AWSLambda.APIGatewayEvent) {
    const {origin} = event.headers;
    const {role: userRole} = event.requestContext.authorizer;

    if (!userRole || userRole !== "admin") {
        return createResponse(origin, {statusCode: 403});
    }

    const result = await dynamo.scan({
        TableName: tableName,
        IndexName: "userIdIndex"
    }).promise();

    const users = result.Items.map((item) => ({
        userId: item.userId,
        allowanceAmount: item.allowanceAmount,
        balance: item.balance,
        dayPreference: item.dayPreference,
        primaryKiddo: item.primaryKiddo
    }));

    return createResponse(origin, {
        statusCode: 200,
        body: users
    });
};
