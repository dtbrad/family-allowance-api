import createResponse from "./common/createResponse";

export const handler = async function signout(event: AWSLambda.APIGatewayEvent) {
    const {origin} = event.headers;

    const date = new Date();
    date.setDate(date.getDate() - 1);
    const utcDate = date.toUTCString();

    const refreshToken = "clear";

    return createResponse(origin, {
        statusCode: 200,
        cookie: {"Set-Cookie": `refreshtoken=${refreshToken}; Secure; HttpOnly; SameSite=None; Expires=${utcDate}`}
    });
};
