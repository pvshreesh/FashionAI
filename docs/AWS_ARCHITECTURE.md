# AWS Architecture

Each `dev`, `staging`, or `prod` CDK stack creates:

- AWS Amplify Hosting for `code/app`
- AWS App Runner for the backend container
- Amazon ECR for backend images
- Amazon Cognito for email/password accounts
- Amazon DynamoDB tables for users and wardrobe items
- Amazon S3 for private images accessed through signed URLs
- AWS Secrets Manager references for runtime secrets and the GitHub token

The browser calls App Runner directly. App Runner verifies Cognito access tokens, scopes wardrobe records by Cognito user ID, reads and writes DynamoDB, and signs private S3 image access. Production explicitly uses `WARDROBE_MODE=per-user`; shared mode is only a local-demo option.

The stack intentionally does not create unused WAF, custom-domain, or log-group resources. Add a CloudFront/WAF or custom-domain layer only when a real domain and edge-routing requirement exists.

Production data resources use `RETAIN`; non-production resources use `DESTROY` with S3 auto-delete. App Runner receives least-scope read/write grants for the application bucket and tables plus read access to its runtime secret.
