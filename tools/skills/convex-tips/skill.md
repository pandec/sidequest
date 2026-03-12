# Convex Tips

Quick reference for common Convex CLI gotchas.

## Targeting Production

**NEVER** use inline `CONVEX_DEPLOYMENT="prod:..." npx convex ...` — `.env.local` overrides it silently and you'll modify dev instead.

**Correct way:**
```bash
# Env vars
npx convex env set VAR "value" --prod
npx convex env list --prod
npx convex env get VAR --prod

# Or target by deployment name
npx convex env set VAR "value" --deployment-name <name>

# Deploy (auto-targets prod, no flag needed)
npx convex deploy -y
```

## Deploy Key (CI/CD only)
For non-interactive deploys (GitHub Actions, Vercel), use `CONVEX_DEPLOY_KEY` from Convex Dashboard > Settings > Deploy Key. Not needed when running locally.
