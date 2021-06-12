import * as cdk from "@aws-cdk/core";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as lambda from "@aws-cdk/aws-lambda";
import * as cr from "@aws-cdk/custom-resources";
import path from "path";
import * as apiGateway from "@aws-cdk/aws-apigateway";

require("dotenv").config();

export class FamilyAllowanceBackend extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string) {
        super(scope, id);

        // db ----------------------------------------------------------------------------------------------------------
        const tableName = "FamilyAllowanceTable";
        const familyAllowanceTable = new dynamodb.Table(this, tableName, {
            tableName,
            partitionKey: {
                name: "PK",
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: "SK",
                type: dynamodb.AttributeType.STRING
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });

        familyAllowanceTable.addGlobalSecondaryIndex({
            indexName: "userIdIndex",
            partitionKey: {
                name: "userId",
                type: dynamodb.AttributeType.STRING
            }
        });

        // lambda factory ----------------------------------------------------------------------------------------------
        interface CreateLambdaParams {
            resourceName: string;
            environment?: Record<string, string>;
            options?: Record<string, any>;
        }

        const createLambda = ({resourceName, environment, options}: CreateLambdaParams) => (
            new lambda.Function(
                this,
                resourceName,
                {
                    code: lambda.Code.fromAsset(path.resolve("lambda", "dist")),
                    handler: `index.${resourceName}Handler`,
                    runtime: lambda.Runtime.NODEJS_12_X,
                    environment,
                    ...options
                }
            )
        );

        // lambdas -----------------------------------------------------------------------------------------------------
        const setupAdminUserLambda = createLambda({resourceName: "setupAdminUser"});
        const signinLambda = createLambda({
            resourceName: "signin",
            environment: {
                TABLE_NAME: tableName,
                JWT_SECRET: process.env.JWT_SECRET,
                CRYPTO_SALT: process.env.SALT
            }
        });

        const signoutLambda = createLambda({resourceName: "signout"});

        // table access ------------------------------------------------------------------------------------------------
        familyAllowanceTable.grantReadWriteData(setupAdminUserLambda);
        familyAllowanceTable.grantReadData(signinLambda);

        // set up initial admin user on initialization -----------------------------------------------------------------
        const setupAdminProvider = new cr.Provider(this, "setupAdminProvider", {
            onEventHandler: setupAdminUserLambda
        });

        new cdk.CustomResource(this, "SetupAdminResource", {
            serviceToken: setupAdminProvider.serviceToken,
            properties: {
                tableName,
                user: process.env.USER_ID || "defaultAdminUser",
                password: process.env.PASSWORD || "defaultPassword",
                salt: process.env.SALT || "defaultSalt02oxljfnbvosufn"
            }
        });

        // api gateway -------------------------------------------------------------------------------------------------
        const api = new apiGateway.RestApi(
            this,
            "FamilyAllowanceApi",
            {
                restApiName: "Family Allowance API",
                defaultCorsPreflightOptions: {
                    allowOrigins: apiGateway.Cors.ALL_ORIGINS,
                    allowCredentials: true,
                    allowMethods: apiGateway.Cors.ALL_METHODS,
                    disableCache: true
                }
            }
        );

        // signin ------------------------------------------------------------------------------------------------------
        const signin = api.root.addResource("signin");
        const signinUserIntegration = new apiGateway.LambdaIntegration(signinLambda);
        signin.addMethod("POST", signinUserIntegration);

        // signout -----------------------------------------------------------------------------------------------------
        const signout = api.root.addResource("signout");
        const signoutIntegration = new apiGateway.LambdaIntegration(signoutLambda);
        signout.addMethod("GET", signoutIntegration);
    }
}
