## Allowance API
Basic API written with `aws-cdk` in typescript.

Prerequsities:
- AWS CLI installed with credentials configured on your machine
- `aws-cdk` installed on your machine via `npm install -g aws-cdk`
- `.env` file in repo root with the following values:
```
USER_ID=<user id for the initial admin user>
PASSWORD=<password for the initial admin user>
SALT=<salt value for password hashing>
JWT_SECRET=<jwt secret key>
```
To deploy from terminal:
1. run `cdk bootstrap` with your AWS account and region: `cdk bootstrap aws://123456789012/us-east-1`
2. run `cdk deploy`

To destroy the entire stack, run `cdk destroy`.
