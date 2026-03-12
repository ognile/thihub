# AGENTS.md - thihub

This file defines how agents should work in this repository.

## Scope and precedence

- Do not invent process rules. Follow this file plus repository code/docs as the source of truth.

## High-level operating principles

1. Results over activity: optimize for verified outcomes, not number of steps.
2. Leverage over raw effort: choose the highest-impact path that reduces future maintenance.
3. Effort proportional to risk: simple fixes for simple issues, deeper work for structural issues.
4. Verify before changing: inspect real code paths and data flow first.
5. Debug from source of data forward with real values; do not guess from symptoms.
6. Keep changes LLM-friendly: clear naming, explicit logs, explicit error paths.
10. Production verification must run on the canonical user-facing domain, not only preview or raw deployment URLs.
## CRITICAL: Principles
1. always reply in lowercase, be direct, unapologetic. first principles thinking.
2. no legacy code, fallbacks or backward compatibility. hard cover only.
3. Whenever you speak to a user, you apply the mindset that you can do large amounts of work properly without quick fixes but with actual solid foundation. Do not try to save time for no reason if you clearly see that it requires a proper solution. There is no such thing as too complex. There is no such thing as it's going to take too long.
4. production deploys must come only from committed github state
5. test EVERY FUNCTIONALITY locally until verified passing all success criteria, before pushing to GitHub. NEVER SKIP.
6. Always build concise, efficient solutions. 100 lines of clean code is better than 1000 lines of over-abstracted code. Be resourceful — reuse existing functions. But make sure you always have proper logging and error handling for easy debugging.
7. YOU execute everything end-to-end. YOU test vigorously. YOU verify with real API calls, real data, real logs.
8. every change, addition & decision MUST be based on verified data from the codebase, API docs, and tested behavior. when working with external APIs, always fetch API docs and verify behavior.
9. when debugging, start from source of data and trace forward with actual values. don't guess backwards from the error.
10. always ask "what's different between when this works and when it doesn't?" before diving into code.
11. test assumptions with real data before changing code.
12. always have a hyper-specific TODO list active. each item: action + expected output + verification method.
13. if a fix requires touching multiple files/layers, re-check if you understood the root cause correctly. usually the real fix is surgical.
14. check for competing processes FIRST before debugging "not responding" issues.
15. verify deployment is complete before running production tests. never assume deployment is done based on timeouts.
16. this codebase will outlive you. every shortcut becomes someone else's burden. every hack compounds. leave the codebase better than you found it.
17. always take advantage of subagents to delegate tasks and orchestrate them.
18. prioritize commands and MCPs, CLIs, curl, bash etc to test quickly. use Claude Chrome extension when everything works with commands to verify frontend.
19. when asking user a question or giving options, ALWAYS use AskUserQuestion tool.
20. never block main thread waiting unnecessarily — launch background subagent to poll state (deploys, renders, jobs). no sleep().

---

## CRITICAL: Plan Mode

- explore current state of relevant files, THEN fetch API docs for any external service being used.
- never write plan without a deep interview. only start writing plan when user explicitly agrees via AskUserQuestion.
- make the plan extremely concise. sacrifice grammar for concision.
- at the end of each plan, list unresolved questions if any.
- when editing a plan, verify changes were not already implemented. plan should only contain NOT-YET-IMPLEMENTED items.
- your plan must be self contained
- always use AskUserQuestion for in-depth interview to clarify intent and expectations. if unsure, interview user.
- deliver findings in table format: current state, root cause, fix, final state.
- ALWAYS include SPECIFIC 'success criteria' and LOCAL testing before production deployment. EVERY plan MUST end with exact verification steps that prove the change works on local dev server.
- ALWAYS require complete end-to-end execution (changes + local testing + production verification). agent must not stop until e2e is complete.
- always require having local testing and production verification in TODO list. 'push to production' is blocked until ALL local tests pass.
- after coding, create a verification task for EACH plan item and execute them.
- if any local test fails → fix → rerun local test.
- after ALL local verification criteria PASS, push to production and verify deployment.
- after e2e execution, require a [PASS/FAIL] criterion list with evidence (API response, log output, or screenshot).

---

## engineering standards

user wants:
- LLM-friendly code & logging (because LLMs have limited context window, they need to be able to understand the codebase and failures easily)
- BETTER abstractions (reusable functions, not copy-paste)
- MORE automation (eliminate manual processes)
