import * as cdk from "@aws-cdk/core";
import {FamilyAllowanceBackend} from "./family-allowance-backend";

export class FamilyAllowanceStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        new FamilyAllowanceBackend(this, "FamilyAllowanceBackend");
    }
}
