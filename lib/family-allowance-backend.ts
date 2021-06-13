import * as apiGateway from "@aws-cdk/aws-apigateway";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as events from "@aws-cdk/aws-events";
import * as targets from "@aws-cdk/aws-events-targets";
import * as lambda from "@aws-cdk/aws-lambda";
import * as cdk from "@aws-cdk/core";
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

        const signinLambda = createLambda({
            resourceName: "signin",
            environment: {
                TABLE_NAME: tableName,
                JWT_SECRET: process.env.JWT_SECRET,
                CRYPTO_SALT: process.env.SALT
            }
        });

        const signoutLambda = createLambda({resourceName: "signout"});

        const getAccessTokenLambda = createLambda({
            resourceName: "getAccessToken",
            environment: {JWT_SECRET: process.env.JWT_SECRET}
        });

        const getUserSummaryLambda = createLambda({
            resourceName: "getUserSummary",
            environment: {TABLE_NAME: tableName}
        });

        const accessTokenAuthorizerLambda = createLambda({
            resourceName: "accessTokenAuthorizer",
            environment: {JWT_SECRET: process.env.JWT_SECRET}
        });

        const getUsersLambda = createLambda({
            resourceName: "getUsers",
            environment: {TABLE_NAME: tableName}
        });

        const createUserLambda = createLambda({
            resourceName: "createUser",
            environment: {TABLE_NAME: tableName, SALT: process.env.SALT}
        });

        const createTransactionsLambda = createLambda({
            resourceName: "createTransactions",
            environment: {TABLE_NAME: tableName},
            options: {timeout: cdk.Duration.seconds(54)}
        });

        const manageBalanceUpdatesLambda = createLambda({
            resourceName: "manageBalanceUpdates",
            environment: {TABLE_NAME: tableName}
        });

        // table access ------------------------------------------------------------------------------------------------
        [
            setupAdminUserLambda,
            createUserLambda,
            createTransactionsLambda,
            manageBalanceUpdatesLambda
        ].forEach((lambda) => familyAllowanceTable.grantReadWriteData(lambda));


        [
            signinLambda,
            getUserSummaryLambda,
            getUsersLambda
        ].forEach((lambda) => familyAllowanceTable.grantReadData(lambda));

        // set up initial admin user on initialization -----------------------------------------------------------------
        const setupAdminProvider = new cr.Provider(this, "setupAdminProvider", {onEventHandler: setupAdminUserLambda});

        new cdk.CustomResource(this, "SetupAdminResource", {
            serviceToken: setupAdminProvider.serviceToken,
            properties: {
                tableName,
                user: process.env.USER_ID || "defaultAdminUser",
                password: process.env.PASSWORD || "defaultPassword",
                salt: process.env.SALT || "defaultSalt02oxljfnbvosufn"
            }
        });

        // scheduled events --------------------------------------------------------------------------------------------
        const allowanceRule = new events.Rule(this, "AllowanceRule", {
            schedule: events.Schedule.expression("cron(0 15 ? * * *)") // 7:00 PST (time in UTC)
        });

        allowanceRule.addTarget(new targets.LambdaFunction(manageBalanceUpdatesLambda));

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

        const authorizer = new apiGateway.TokenAuthorizer(this, "Authorizer", {
            handler: accessTokenAuthorizerLambda,
            resultsCacheTtl: cdk.Duration.seconds(0)
        });

        // signin ------------------------------------------------------------------------------------------------------
        const signin = api.root.addResource("signin");
        const signinUserIntegration = new apiGateway.LambdaIntegration(signinLambda);
        signin.addMethod("POST", signinUserIntegration);

        // signout -----------------------------------------------------------------------------------------------------
        const signout = api.root.addResource("signout");
        const signoutIntegration = new apiGateway.LambdaIntegration(signoutLambda);
        signout.addMethod("GET", signoutIntegration);

        // get access token --------------------------------------------------------------------------------------------
        const token = api.root.addResource("token");
        const getAccessTokenIntegration = new apiGateway.LambdaIntegration(getAccessTokenLambda);
        token.addMethod("GET", getAccessTokenIntegration);

        // standard user -----------------------------------------------------------------------------------------------
        const users = api.root.addResource("users");

        const user = users.addResource("{userId}");
        const getUserIntegration = new apiGateway.LambdaIntegration(getUserSummaryLambda);
        user.addMethod("GET", getUserIntegration, {authorizer});

        // admin  ------------------------------------------------------------------------------------------------------
        const admin = api.root.addResource("admin");

        // admin users
        const adminUsers = admin.addResource("users");
        const getAdminUsersIntegration = new apiGateway.LambdaIntegration(getUsersLambda);
        adminUsers.addMethod("GET", getAdminUsersIntegration, {authorizer});

        // create user
        const createUserIntegration = new apiGateway.LambdaIntegration(createUserLambda);
        adminUsers.addMethod("POST", createUserIntegration, {authorizer});

        // create transactions
        const adminUser = adminUsers.addResource("{userId}");
        const adminUserTransactions = adminUser.addResource("transactions", {});
        const createMultipleTransactionsForUserIntegration = new apiGateway.LambdaIntegration(createTransactionsLambda);
        adminUserTransactions.addMethod("POST", createMultipleTransactionsForUserIntegration, {authorizer});
    }
}
