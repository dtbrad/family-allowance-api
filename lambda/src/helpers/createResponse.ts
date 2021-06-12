interface CreateResponseParams {
    statusCode: number;
    body?: Record<string, any>,
    cookie?: Record<string, string>
}

export default function createResponse(origin: string, {statusCode, body, cookie}: CreateResponseParams) {
    return {
        statusCode,
        headers: {
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "OPTIONS,GET,POST,DELETE",
            ...cookie
        },
        body: JSON.stringify(body)
    };
}
