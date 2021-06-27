import * as jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET;

interface IEvent {
    authorizationToken: string;
    methodArn?: string;
}

interface IStatement {
    Action: string;
    Effect: string;
    Resource: string;
}

interface IAuthResponse {
    principalId: string;
    context: {
      stringKey: string;
      numberKey: number;
      booleanKey: boolean;
    };
    policyDocument?: {
      Version: string;
      Statement: IStatement[];
    };
}

function generatePolicy(
    principalId: string,
    effect: string,
    resource: string,
    payload?: jwt.JwtPayload
): IAuthResponse {
    const authResponse = {
        principalId,
        context: {
            stringKey: "stringval",
            numberKey: 123,
            booleanKey: true,
            role: payload?.role,
            userId: payload?.userId
        }
    };

    if (effect && resource) {
        return {
            ...authResponse,
            policyDocument: {
                Version: "2012-10-17",
                Statement: [
                    {
                        Action: "execute-api:Invoke",
                        Effect: effect,
                        Resource: resource
                    }
                ]
            }
        };
    }

    // Optional output with custom properties of the String, Number or Boolean type.
    return authResponse;
}

export const handler = async function accessTokenAuthorizer(event: IEvent) {
    const token = event.authorizationToken?.split(" ")[1] || "nothing";

    try {
        const payload = jwt.verify(token, secret) as jwt.JwtPayload;

        if (payload) {
            return generatePolicy("user", "Allow", event.methodArn, payload);
        }
        return generatePolicy("user", "Deny", event.methodArn);
    } catch (error) {

        if (error.name === "TokenExpiredError") {
            return generatePolicy("user", "Deny", event.methodArn);
        }
        return "Error: Invalid token"; // Return a 500 Invalid token response
    }
};
