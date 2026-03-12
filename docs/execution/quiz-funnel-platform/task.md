# quiz funnel platform v1

## north star
- one committed and deployed schema-first quiz funnel platform replaces the old prototype, ships one live symptom-profile funnel with at least 13 steps, records session/event analytics precisely, and is verified locally and on the canonical production domain.

## exact success criteria
- canonical quiz spec exists in git, validates locally, and can be published through repo cli scripts.
- public quiz runtime is driven by a shared engine, not page-local branching logic.
- quiz analytics come from session/event tables and expose drop-off, completion, result, lead, and cta metrics.
- admin quiz endpoints require authenticated users and the browser admin only edits content/theme/publish state.
- homepage, article cta surfaces, and direct `/quiz/[slug]` open the live showcase funnel with entry source preserved.
- local verification passes: `npm run build`, `npm run lint`, regression, perf, admin visual, targeted curl/api checks, manual walkthroughs.
- production verification passes on `https://news.tophealthinsider.com` after git push and deployment completion.

## constraints
- no legacy runtime path, no compatibility bridge, no preservation of prototype quiz data.
- avoid touching unrelated dirty article/admin work unless required by the quiz platform.
- production deploy must come from committed github state only.
- keep code llm-friendly with explicit types, logs, and clear route boundaries.

## current state
- repo `main` is synced with `origin/main`; fetch + pull fast-forward gate passed.
- quiz platform code is cut over to `content/quizzes/*.json`, `lib/quizzes/*`, and the new `quiz_definitions` / `quiz_sessions` / `quiz_events` / `quiz_leads` tables.
- supabase migration `20260312000000_quiz_funnel_v1.sql` is applied remotely and the showcase funnel is published as `symptom-profile`.
- vercel project `thihub` is linked; canonical user-facing domain is `news.tophealthinsider.com`.
- repo now has root `claude.md`, `.mcp.json`, and quiz cli commands wired into `package.json`.

## active todo
1. package the cutover into a clean commit that includes only the quiz platform implementation.
2. push committed state to github and wait for the production deployment to finish.
3. verify homepage entry, article entry, direct quiz entry, analytics correctness, and admin auth on `https://news.tophealthinsider.com`.
4. delete the temporary verification auth user after production checks.
5. record final pass/fail evidence and rollback notes.

## current understanding
- the cleanest cutover is a git-backed quiz spec published into a single new db definition table plus session/event analytics tables.
- the existing admin builder is too structural; phase 1 should strip it down instead of trying to rehabilitate it.
- the safest way to handle the dirty repo is to modify only quiz/runtime/admin/config surfaces needed for this platform and leave unrelated work alone.

## proven wins
- repo sync gate passed with `git fetch --prune origin && git pull --ff-only origin main`.
- vercel project inspection confirms `thihub` exists and uses next.js with root `.`.
- supabase inspection confirms old quiz data is disposable, so hard cutover is viable.
- `npm run build` passes after the cutover.
- quiz cli validation, preview, publish, and report all work against the new schema-first contract.
- local regression, warmed perf budgets, admin visual snapshots, and api-level auth/read/write checks pass against `http://127.0.0.1:3001`.

## open risks
- current repo has large unrelated dirty changes; final commit must include only the quiz platform implementation.
- repo-wide `npm run lint` still fails on unrelated pre-existing files outside the quiz platform scope, so only the touched quiz-platform files are lint-clean today.
