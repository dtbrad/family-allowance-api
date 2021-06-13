import createResponse from "../helpers/createResponse";

export const handler = async function getUserSummary(event: AWSLambda.APIGatewayEvent) {
    const {origin} = event.headers;
    const params = event.pathParameters;
    const userId = params?.userId.toLowerCase();

    const {role, userId: userIdFromJwt} = event.requestContext.authorizer;

    if (userId !== userIdFromJwt && role !== "admin") {
        return createResponse(origin, {
            statusCode: 403
        });
    }

    return createResponse(origin, {
        statusCode: 200,
        body: {userId, userIdFromJwt}
    });
};
