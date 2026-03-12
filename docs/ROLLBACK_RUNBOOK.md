# Rollback Runbook

## Scope
This runbook covers rollback for the current frontend/data hardening tracks:

1. Middleware scope updates
2. Shared data service refactors
3. API response conditioning (ETag)
4. Quiz funnel platform v1 cutover
5. Operational scripts and CI workflows

## Preconditions
1. Confirm failing behavior and affected path.
2. Capture timestamps, request IDs, and route-level symptoms.
3. Keep a terminal open on the current branch and do not use destructive git reset commands.

## Fast Rollback Commands
Use the smallest rollback that restores production behavior.

### Middleware Scope
```bash
git restore --source=HEAD~1 -- middleware.ts utils/supabase/middleware.ts
```

### Data Service + API Route Wiring
```bash
git restore --source=HEAD~1 -- app/articles/[slug]/page.tsx app/api/articles/[slug]/route.ts app/api/quizzes app/quiz/[slug]/page.tsx components/quiz components/homepage/HeroSection.tsx lib/quizzes scripts/regression-harness.mjs scripts/admin-visual-snapshots.mjs package.json CLAUDE.md .mcp.json lib/http/etag.ts
```

### Quiz Funnel Database Cutover
```bash
git restore --source=HEAD~1 -- supabase/migrations/20260312000000_quiz_funnel_v1.sql content/quizzes
```

### CI/Operations Tooling
```bash
git restore --source=HEAD~1 -- .github/workflows scripts docs/ROLLBACK_RUNBOOK.md package.json CLAUDE.md .mcp.json
```

## Verification After Rollback
Run these checks immediately:

```bash
npm run build
BASE_URL=http://127.0.0.1:3000 npm run test:regression
```

If a local server is running for checks:

```bash
BASE_URL=http://127.0.0.1:3000 npm run test:perf
```

## Roll Forward Checklist
1. Open a follow-up branch for the specific failing workstream.
2. Add one failing regression test that reproduces the issue.
3. Re-apply only the targeted patch.
4. Re-run build + regression harness + perf budget checks before redeploy.
