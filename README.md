# thihub

next.js app-router newsroom stack for top health insider. the app includes the public site, the authenticated admin/editor surface, quiz funnel tooling, and operational scripts for regression, performance, and usage monitoring.

## stack

- next.js 16
- react 19
- typescript
- tailwind v4
- supabase
- gemini

## local setup

install dependencies with `npm install`.

required runtime secrets live in `/Users/nikitalienov/Documents/thihub/.env.local`. do not print or commit secret values. the app typically expects:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `THIHUB_*` service and postgres credentials

run the dev server with:

```bash
npm run dev
```

## verification

repo-wide guardrails are enforced through one canonical command:

```bash
npm run verify:repo
```

that command runs lint, build, starts the production server locally, executes regression/perf/admin geometry checks, and runs `npm audit --omit=dev`. it writes runtime logs to `ops/reports/verify-repo/`, which is ignored by git.

if you need the authenticated admin visual snapshot suite as part of a release:

```bash
VERIFY_ADMIN_VISUAL=1 PORT=3100 npm run verify:repo
```

you can also run individual checks directly:

```bash
npm run lint
npm run build
BASE_URL=http://127.0.0.1:3000 npm run test:regression
BASE_URL=http://127.0.0.1:3000 npm run test:perf
BASE_URL=http://127.0.0.1:3000 npm run test:admin:geometry
BASE_URL=http://127.0.0.1:3000 npm run test:admin:visual
```

## deployment

for any code change, the required flow is:

1. pass local verification.
2. commit and push the branch.
3. wait for deployment to finish.
4. verify the live behavior on [news.tophealthinsider.com](https://news.tophealthinsider.com).

rollback guidance lives in [/Users/nikitalienov/Documents/thihub/docs/ROLLBACK_RUNBOOK.md](/Users/nikitalienov/Documents/thihub/docs/ROLLBACK_RUNBOOK.md).

## operations

usage monitoring commands:

```bash
npm run ops:usage:snapshot
npm run ops:usage:check
```

generated operational artifacts under `ops/reports/`, `ops/visual-snapshots/`, and `ops/usage-snapshots/*.json` are reproducible outputs and should not be committed.
