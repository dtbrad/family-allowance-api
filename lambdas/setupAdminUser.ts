import * as AWS from "aws-sdk";
import * as lambda from "aws-lambda";
import generatePassword from "./common/generatePassword";

const dynamo = new AWS.DynamoDB.DocumentClient();

async function setupAdminUser(event: lambda.CloudFormationCustomResourceEventCommon): Promise<void> {
    const {tableName, user, password, salt} = event.ResourceProperties;
    if (!user || !password || !salt) {
        return;
    }

    await dynamo.put({
        TableName: tableName,
        Item: {
            PK: user,
            SK: user,
            role: "admin",
            passwordDigest: generatePassword(password, salt),
            allowanceAmount: 25,
            dayPreference: "Saturday",
            balance: 0,
            userId: user
        }
    }).promise();
}

export const handler = setupAdminUser;
