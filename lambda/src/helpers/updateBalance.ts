import * as AWS from "aws-sdk";

const dynamo = new AWS.DynamoDB.DocumentClient();

interface UpdateBalanceParams {
    userId: string;
    amount: number;
    transactionDate?: string;
    TableName: string,
    description?: string
}

export default async function updateBalance({
    userId,
    amount,
    transactionDate = new Date().toISOString(),
    description = "allowance",
    TableName
}: UpdateBalanceParams) {
    const params = {
        TransactItems: [
            {
                Put: {
                    TableName,
                    Item: {
                        PK: userId,
                        SK: transactionDate,
                        amount,
                        description
                    }
                }
            },
            {
                Update: {
                    TableName,
                    Key: {PK: userId, SK: userId},
                    UpdateExpression: "ADD balance :amount",
                    ConditionExpression: "PK = :userId And SK = :userId",
                    ExpressionAttributeValues: {
                        ":amount": amount,
                        ":userId": userId
                    },
                    ReturnValues: "UPDATED_NEW"
                }
            }
        ]
    };

    try {
        await dynamo.transactWrite(params).promise();
    } catch (error) {
        console.log({THE_ERROR: error});
        throw new Error("Boom!!");
    }
}
