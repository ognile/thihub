# repo-wide cleanup + hardening sweep

## north star
- repo is normalized onto a synced git base, repo-wide verification is automated, lint/build/audit/runtime checks are green, and the hardened branch is deployed and verified on `https://news.tophealthinsider.com`.

## exact success criteria
- dirty pre-cleanup state is recoverable from the safety snapshot branch `codex/repo-hardening-safety-20260312T170707` and the external snapshot archive under `/Users/nikitalienov/Documents/thihub-safety-snapshots/20260312T170707/`.
- repo-wide lint is green with zero warnings.
- build completes without the previous root-convention or deprecated middleware warnings.
- `npm audit --omit=dev` is clean, or any remaining finding is explicitly proven non-actionable.
- `npm run verify:repo` passes locally.
- updated verification guardrails run in github actions.
- production smoke checks pass on `https://news.tophealthinsider.com`.

## constraints
- preserve existing runtime behavior and interactivity.
- do not lose the pre-cleanup local worktree.
- never commit secrets or generated ops artifacts.
- production verification is required because code changes are in scope.

## current state
- working branch is `codex/repo-wide-cleanup-hardening`, based on synced `origin/main` commit `3ff27a60968eff5ba2d24025e872e9999a5f32f8`.
- dirty pre-cleanup work is preserved on safety branch `codex/repo-hardening-safety-20260312T170707` at commit `128aa3dbf2e74b8020c2e8bde1eaa2bac030e8a9`.
- dependency hardening is already pulled into the branch via `package.json` and `package-lock.json` updates.
- local verification is green:
  - `npm run lint`
  - `npm run build`
  - `npm audit --json`
  - `npm run verify:repo`
  - `ADMIN_* BASE_URL=http://127.0.0.1:3300 npm run test:admin:geometry`
  - `ADMIN_* SNAPSHOT_SET=repo-hardening-local BASE_URL=http://127.0.0.1:3300 npm run test:admin:visual`
  - `REGRESSION_ARTICLE_SLUG=what-i-discovered-about-bacteria-changed-efv22a REGRESSION_QUIZ_SLUG=symptom-profile BASE_URL=http://127.0.0.1:3300 npm run test:regression`
- remaining work is staging, commit/push, deployment wait, and production verification on `https://news.tophealthinsider.com`.

## active todo
1. stage the final repo-wide cleanup set and commit it on `codex/repo-wide-cleanup-hardening`.
2. push the branch and wait for deployment plus github actions.
3. verify homepage, article, quiz, and admin unauth redirect on `https://news.tophealthinsider.com`.

## current understanding
- the repo had three classes of drift mixed together: real source deltas, generated ops artifacts, and branch skew from local `main` lagging behind `origin/main`.
- the highest-leverage path is to preserve all dirty work first, then rebuild the cleaned branch from synced `origin/main`, pulling forward only useful source deltas.
- next 16 hardening needs both a `proxy.ts` migration and explicit `turbopack.root` to eliminate the warnings seen on the current codebase.
- repo-wide lint cleanup was feasible in one sweep because the remaining offenders were localized and mostly mechanical: purity issues, ref reads during render, unescaped text, narrow typing, and unused imports.
- the canonical local verifier needed hardening too: launching `next start` through `npm` on a fixed port created false negatives when a stale local server was already listening. the verifier now starts `next` directly and selects a free port by default.
- the article page regression was caused by passing a function-valued `loader` prop to `next/image` across a server component boundary. relying on explicit `remotePatterns` plus `unoptimized` resolved the runtime error cleanly.

## proven wins
- safety recovery path exists:
  - branch `codex/repo-hardening-safety-20260312T170707`
  - commit `128aa3dbf2e74b8020c2e8bde1eaa2bac030e8a9`
  - external archive `/Users/nikitalienov/Documents/thihub-safety-snapshots/20260312T170707/untracked-files.tgz`
- local `main` was fast-forwarded to `origin/main` before the cleanup branch was created.
- dependency refresh landed:
  - `next@16.1.6`
  - `eslint-config-next@16.1.6`
  - `eslint@9.39.4`
  - `@supabase/supabase-js@2.99.1`
  - `@supabase/ssr@0.9.0`
  - `@tiptap/*@2.27.2`
- repo-wide static verification is green:
  - lint passes with zero warnings
  - build is warning-free
  - full `npm audit --json` reports `0` vulnerabilities after pinning `markdown-it@14.1.1` and overriding nested `minimatch` to `9.0.7`
- canonical verifier `npm run verify:repo` passes end-to-end.
- admin geometry checks passed on desktop and mobile using a disposable authenticated test user, and the admin visual suite completed into `ops/visual-snapshots/repo-hardening-local/`.
- explicit article+quiz regression coverage passed with `20` passed, `0` failed, `0` skipped for homepage, article entry, quiz entry, and quiz completion/drop-off persistence.

## open risks
- github actions verification still cannot run authenticated admin geometry/visual checks without credentials, so those remain local/manual release gates.
- production deployment and live smoke verification are still pending.
