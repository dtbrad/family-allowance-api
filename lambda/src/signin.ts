import jwt from "jsonwebtoken";
import {APIGatewayEvent} from "aws-lambda";
import {createHmac} from "crypto";
import * as AWS from "aws-sdk";
import createResponse from "./helpers/createResponse";

const table = process.env.TABLE_NAME;
const secret = process.env.JWT_SECRET;
const cryptoSalt = process.env.CRYPTO_SALT;

function hasher(password: string, salt: string) {
    const hash = createHmac("sha512", salt);
    hash.update(password);
    const value = hash.digest("hex");
    return {
        salt,
        hashedpassword: value
    };
}

interface Hash {
    hashedPassword: string;
    salt: string;
}

function compare(password: string, hash: Hash) {
    const passwordData = hasher(password, hash.salt);

    return passwordData.hashedpassword === hash.hashedPassword;
}

function passwordsMatch(password: string, passwordDigest: string) {
    return compare(
        password,
        {
            salt: cryptoSalt,
            hashedPassword: passwordDigest
        }
    );
}

const dynamo = new AWS.DynamoDB.DocumentClient();

export const handler = async function signin(event: APIGatewayEvent) {
    const {origin} = event.headers;
    const {userId: userIdWithMixedCasing, password} = JSON.parse(event.body);
    const userId = userIdWithMixedCasing.toLowerCase();

    const result = await dynamo.get({
        TableName: table,
        Key: {PK: userId, SK: userId}
    }).promise();

    const userFromDB = result.Item;

    if (userFromDB && passwordsMatch(password, userFromDB.passwordDigest)) {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        const utcDate = date.toUTCString();

        const refreshToken = jwt.sign(
            {userId, role: userFromDB.role},
            secret,
            {expiresIn: "1d"}
        );

        const accessToken = jwt.sign(
            {userId, role: userFromDB.role},
            secret,
            {expiresIn: "15m"}
        );

        return createResponse(origin, {
            statusCode: 200,
            body: {accessToken},
            cookie: {"Set-Cookie": `refreshtoken=${refreshToken}; Secure; HttpOnly; SameSite=None; Expires=${utcDate}`}
        });
    }
    return createResponse(origin, {statusCode: 401});
};
