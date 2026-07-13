# AWS Deployment Checklist

1. Install Node.js 20+, Docker, AWS CLI, and AWS CDK; authenticate to the target AWS account.
2. Store a GitHub token as `fashion-ai/github-token` with JSON key `token`.
3. Store each stage's Gemini key in `fashion-ai-<stage>/backend/runtime` with JSON key `GEMINI_API_KEY`.
4. Set CDK context values for `repoOwner`, `repoName`, and stage branches in `infra/cdk.json` or on the command line.
5. From `infra`, run `npm install`, `npm run build`, and `npx cdk bootstrap`.
6. Deploy the stack, then build the backend from the repository root:

```bash
docker build -f code/backend/Dockerfile -t fashion-ai-backend .
```

7. Tag and push that image to the stack's `BackendRepositoryUriOutput`, then start the App Runner deployment.
8. Confirm `/health`, register a test account, save and delete a wardrobe item, and generate a recommendation.

Cloudflare text-to-image is optional and is not provisioned by CDK. Add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` to the runtime configuration only if that UI feature is required.
