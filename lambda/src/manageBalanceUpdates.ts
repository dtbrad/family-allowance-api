import * as AWS from "aws-sdk";
import updateBalance from "./helpers/updateBalance";

const TableName = process.env.TABLE_NAME;
const dynamo = new AWS.DynamoDB.DocumentClient();

export const handler = async function manageBalanceUpdates() {
    const usersResult = await dynamo.scan({
        TableName,
        IndexName: "userIdIndex"
    }).promise();

    const userIds = usersResult.Items.map(function (user) {
        return {
            userId: user.PK,
            allowanceAmount: user.allowanceAmount,
            dayPreference: user.dayPreference
        };
    });

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = new Date();
    const todayName = days[today.getDay()];
    const usersToUpdate = userIds.filter((user) => user.dayPreference === todayName);

    await Promise.all(usersToUpdate.map(function ({userId, allowanceAmount}) {
        return updateBalance({
            userId,
            amount: allowanceAmount,
            transactionDate: new Date().toISOString(),
            TableName,
            description: "Weekly Allowance"
        });
    }));
};
