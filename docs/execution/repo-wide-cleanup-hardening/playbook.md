# playbook

## default execution loop
- preserve the full dirty tree before any repo-wide cleanup or branch normalization.
- sync against `origin/main` before deciding what belongs in the cleaned branch.
- promote one canonical local verification command and make ci call the same entrypoint.

## stable tactics
- separate `source` changes from generated `ops` output before carrying work forward.
- fix lint findings by removing impurity and narrowing types instead of weakening eslint rules.
- when `next/image` is used from server-rendered paths, prefer explicit `remotePatterns` and `unoptimized` over function-valued loader props.
- if a local verifier must boot the app, start `next` directly and auto-select a free port instead of assuming a fixed local port is available.

## failure patterns
- do not mix generated artifact cleanup with source recovery in one opaque git operation.
- do not rely on `Math.random()` or ref reads during render in client components; react 19 lint will flag them and the behavior is unstable anyway.
- do not leave default execution tracker placeholders in `docs/execution/`; they stop being useful immediately.
- do not run local regression against whatever happens to already be listening on `127.0.0.1:3100`; stale servers create false failures and false passes.

## verification patterns
- record safety snapshot branch names, commits, and external archive paths in `task.md`.
- treat `npm run verify:repo` as the default local proof gate for repo-wide hardening work.
- when ci uses the canonical verifier, upload `ops/reports` and snapshot artifacts on failure so the failure can be debugged without rerunning blindly.
- if a verifier runs in multiple environments, make the regression harness explicitly skip configuration-dependent checks when the required env is absent instead of letting missing config masquerade as app failure.

## promotion rules
- promote only evidence-backed reusable lessons
