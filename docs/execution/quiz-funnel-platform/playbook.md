# playbook

## default execution loop
- define the terminal state before experiments begin

## stable tactics
- when remote supabase schema exists but the migration history table is empty, repair the historical versions as `applied` first and then push only the genuinely new migration. this avoids replaying old bootstrap policies into a live project.
- for quiz funnels, keep structural authoring in git spec files and use a thin admin editor only for safe copy/theme/publish changes. this preserves deterministic runtime behavior and makes cli automation reliable.

## failure patterns
- next build can fail on deleted app routes if stale `.next` validators are hanging around. clear generated output before retrying instead of resurrecting removed routes.
- perf checks against a just-started dev server can be polluted by first-request compilation. warm the route set before treating a p95 miss as a real regression.

## verification patterns
- prove public quiz behavior at three levels: published fetch route, event-ingest/database persistence, and browser entry-point navigation.
- for admin-only quiz verification, use a temporary authenticated user plus api login cookies so auth-gated routes can be checked without introducing permanent test credentials into the repo.

## promotion rules
- promote only evidence-backed reusable lessons
