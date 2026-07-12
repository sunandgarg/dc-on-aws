# DekhoCampus parallel AWS backend

This is an independently deployable Node 20 API for AWS Lambda/API Gateway, ECS/Fargate, or App Runner. It starts as a compatibility proxy to the existing Supabase Edge Functions, so it can be enabled without changing feature contracts.

## Switches

Browser/Vercel:

```env
VITE_USE_SUPABASE=yes
VITE_USE_AWS=no
VITE_AWS_API_URL=https://api.dekhocampus.in
```

AWS runtime:

```env
BACKEND_USE_SUPABASE=yes
BACKEND_USE_AWS=no
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

To route browser function calls through AWS: set `VITE_USE_SUPABASE=no` and `VITE_USE_AWS=yes`. No production frontend changes are needed beyond those two variables.

## Deploy

- **AWS Lambda:** package `backend/src`, set handler to `src/lambda.handler`, and connect API Gateway routes `ANY /{proxy+}`.
- **ECS/App Runner:** build the included Dockerfile, set the runtime variables as secrets, and expose port 8787.
- `/health` is the load-balancer health endpoint.

## What the switch covers

- `supabase.functions.invoke()` and browser calls to `/functions/v1/*` are
  routed through `/v1/functions/*` when AWS is selected.
- Direct `supabase.from(... )` table traffic is routed through `/v1/rest/*`
  when AWS is selected. The browser JWT is forwarded, so existing Supabase RLS
  still applies.
- Supabase Auth and Storage intentionally remain direct until their dedicated
  AWS replacements are deployed. This prevents a backend switch from logging
  users out or breaking uploads.

## Safe rollout

1. Deploy `infra/template.yaml` with AWS SAM and configure the two Supabase
   values as deployment secrets.
2. Verify `GET /health` and `/v1/status`.
3. Set the AWS URL only in Vercel Preview first, with
   `VITE_USE_SUPABASE=no` and `VITE_USE_AWS=yes`.
4. Verify login, lead capture, OTP, directory reads, and admin operations.
5. Apply those two switch values to Production only when the Preview checks
   pass. Reverting requires only `VITE_USE_SUPABASE=yes`, `VITE_USE_AWS=no`.

Never put `SUPABASE_SERVICE_ROLE_KEY` in Vercel or any `VITE_*` variable.
