import * as cdk from "@aws-cdk/core";
import {FamilyAllowanceStack} from "./lib/family-allowance-stack";
import {buildLambdas} from "./buildLambdas";

async function deploy() {
    await buildLambdas();
    const app = new cdk.App();
    new FamilyAllowanceStack(app, "FamilyAllowanceStack");
}

deploy();
