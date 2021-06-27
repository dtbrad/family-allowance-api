import * as AWS from "aws-sdk";
import {APIGatewayEvent} from "aws-lambda";
import generatePassword from "./common/generatePassword";
import createResponse from "./common/createResponse";

const salt = process.env.SALT || "";
const tableName = process.env.TABLE_NAME;
const dynamo = new AWS.DynamoDB.DocumentClient();

export interface User {
    userId: string;
    balance: number;
    dayPreference: string;
    allowanceAmount: number;
    role: string;
    password: string;
}

export const handler = async function createUser(event: APIGatewayEvent) {
    const {origin} = event.headers;
    const {role: userRole} = event.requestContext.authorizer;

    if (!userRole || userRole !== "admin") {
        return createResponse(origin, {statusCode: 403});
    }

    const {
        userId,
        role = "standard",
        password,
        allowanceAmount = 0,
        dayPreference = "Sunday",
        balance = 0
    } = JSON.parse(event.body) as User;

    if (!userId || !password || !salt) {
        throw new Error("missing arguments");
    }

    const lowerCaseUserId = userId.toLowerCase();

    const user = {
        PK: lowerCaseUserId,
        SK: lowerCaseUserId,
        role: role,
        passwordDigest: generatePassword(password, salt),
        allowanceAmount,
        dayPreference,
        balance,
        userId: lowerCaseUserId
    };

    try {
        await dynamo.put({
            TableName: tableName,
            Item: {
                PK: user.userId,
                ...user
            },
            ConditionExpression: "attribute_not_exists(PK)"
        }).promise();

        return createResponse(origin, {
            statusCode: 201,
            body: {newUser: user}
        });
    } catch (error) {
        if (error.code === "ConditionalCheckFailedException") {
            return createResponse(origin, {
                statusCode: 200,
                body: {message: "User already exists"}
            });
        }

        return createResponse(origin, {
            statusCode: 500,
            body: {message: "Uh oh, something went wrong on the server"}
        });
    }
};
