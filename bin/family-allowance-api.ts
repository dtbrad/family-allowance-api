import * as cdk from "@aws-cdk/core";
import {FamilyAllowanceStack} from "../lib/family-allowance-stack";

require("dotenv").config();

const app = new cdk.App();
new FamilyAllowanceStack(app, "FamilyAllowanceStack");
