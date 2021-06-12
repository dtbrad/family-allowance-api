import cookieManager from "cookie";
import jwt, {verify} from "jsonwebtoken";
import createResponse from "./helpers/createResponse";

const secret = process.env.JWT_SECRET;

interface Payload {
    userId: string;
    exp: string;
    ia: string;
    role: string;
}

export const handler = async function getAccessToken(event: AWSLambda.APIGatewayEvent) {
    const {origin} = event.headers;
    const unparsedCookie = event.headers?.Cookie;
    const params = event.queryStringParameters;

    if (params?.flo) {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        const utcDate = date.toUTCString();
        const refreshToken = "some-new-value";

        return createResponse(origin, {
            statusCode: 401,
            cookie: {"Set-Cookie": `refreshtoken=${refreshToken}; Secure; HttpOnly; SameSite=None; Expires=${utcDate}`}
        });
    }

    if (!unparsedCookie) {
        return createResponse(origin, {statusCode: 401});
    }

    const parsedCookie = cookieManager.parse(unparsedCookie);
    const refreshToken = parsedCookie?.refreshtoken;

    if (!refreshToken) {
        return createResponse(origin, {statusCode: 401});
    }

    try {
        let accessToken;
        const refreshTokenPayload = verify(refreshToken, secret) as Payload;

        if (refreshTokenPayload) {
            const {userId, role} = refreshTokenPayload;
            accessToken = jwt.sign(
                {userId, role},
                secret,
                {expiresIn: "15m"}
            );
        }

        return createResponse(origin, {
            statusCode: 200,
            body: {accessToken}
        });

    } catch (error) {
        return createResponse(origin, {statusCode: 401});
    }
};
