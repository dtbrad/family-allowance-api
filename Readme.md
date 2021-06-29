# Allowance API
Basic API written with `aws-cdk` in typescript.

## Prerequsities:
- all the things for node development...
- `aws-cdk` installed on your machine via `npm install -g aws-cdk`
- `.env` file in repo root with the following values:
    ```
    USER_ID=<user id for the initial admin user>
    PASSWORD=<password for the initial admin user>
    SALT=<salt value for password hashing>
    JWT_SECRET=<jwt secret key>
    ```
- For easier deployment have AWS CLI installed and configured with credentials (preferably for an IAM user) and default region

## Deploy
1. run `yarn` and `yarn build`
2. run `cdk bootstrap`
3. run `cdk deploy`

** if AWS CLI not installed/configured, will require parameters. See [cdk command](https://docs.aws.amazon.com/cdk/latest/guide/cli.html) doc.

## Destroy
To destroy the app, run `cdk destroy`
