import * as cdk from "@aws-cdk/core";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as lambda from "@aws-cdk/aws-lambda";
import * as cr from "@aws-cdk/custom-resources";
import path from "path";

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

        // table access ------------------------------------------------------------------------------------------------
        familyAllowanceTable.grantReadWriteData(setupAdminUserLambda);

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
    }
}
