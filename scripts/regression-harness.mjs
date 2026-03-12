#!/usr/bin/env node

import path from "node:path";
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnv();
loadEnv({ path: path.join(process.cwd(), ".env.local"), override: false });

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const ARTICLE_SLUG = process.env.REGRESSION_ARTICLE_SLUG ?? "";
const QUIZ_SLUG = process.env.REGRESSION_QUIZ_SLUG ?? "";
const DEFAULT_DOMAIN_ALIASES = [
  "thihub.vercel.app",
  "news.tophealthinsider.com",
  "thihub-ogniles-projects.vercel.app",
  "thihub-git-main-ogniles-projects.vercel.app",
];
const configuredDomainAliases = (process.env.REGRESSION_DOMAIN_ALIASES ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const DOMAIN_ALIASES =
  configuredDomainAliases.length > 0 ? configuredDomainAliases : DEFAULT_DOMAIN_ALIASES;
const SUPABASE_ENV_READY = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
const QUIZ_DB_READY = Boolean(
  process.env.THIHUB_SUPABASE_URL && process.env.THIHUB_SUPABASE_SERVICE_ROLE_KEY,
);

const adminSupabase = QUIZ_DB_READY
  ? createClient(process.env.THIHUB_SUPABASE_URL, process.env.THIHUB_SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function toUrl(pathname) {
  return new URL(pathname, BASE_URL).toString();
}

function buildQuizEntryUrl({ source, articleSlug }) {
  const params = new URLSearchParams();
  params.set("source", source);
  if (articleSlug) {
    params.set("article", articleSlug);
  }
  const query = params.toString();
  return `/quiz/${QUIZ_SLUG}${query ? `?${query}` : ""}`;
}

function createSessionToken(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getSequentialNextStepId(definition, stepId) {
  const index = definition.steps.findIndex((candidate) => candidate.id === stepId);
  if (index === -1) {
    return null;
  }
  return definition.steps[index + 1]?.id ?? null;
}

function resolveNextStepId(definition, step, optionId = null) {
  if (optionId && step.kind === "question") {
    const option = step.options.find((candidate) => candidate.id === optionId);
    if (option?.next) {
      return option.next;
    }
  }

  if (step.next) {
    return step.next;
  }

  return getSequentialNextStepId(definition, step.id);
}

async function request(pathname, init = {}) {
  const response = await fetch(toUrl(pathname), init);
  const body = await response.text();
  return { response, body };
}

async function requestJson(pathname, init = {}) {
  const response = await fetch(toUrl(pathname), init);
  const text = await response.text();
  let json = null;
  if (text.length > 0) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  return { response, json, text };
}

async function postQuizEvent(quizId, payload) {
  const result = await requestJson(`/api/quizzes/${quizId}/events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  assert(
    result.response.status === 201,
    `Expected 201 from event ingest but received ${result.response.status}`,
  );

  return result.json;
}

async function runCase(name, execute) {
  try {
    await execute();
    results.passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    results.failed += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAIL ${name}: ${message}`);
  }
}

function skipCase(name, reason) {
  results.skipped += 1;
  console.log(`SKIP ${name}: ${reason}`);
}

await runCase("homepage render", async () => {
  const { response, body } = await request("/");
  assert(response.status === 200, `Expected 200 but received ${response.status}`);
  assert(body.length > 0, "Homepage body should not be empty");
});

await runCase("middleware bypass on unrelated public path", async () => {
  const { response } = await request("/");
  assert(response.status === 200, `Expected 200 but received ${response.status}`);
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert(
    !setCookie.toLowerCase().includes("sb-"),
    "Unexpected Supabase auth cookie on public route; middleware scope may be too broad",
  );
});

if (SUPABASE_ENV_READY) {
  await runCase("admin unauthenticated redirect", async () => {
    const response = await fetch(toUrl("/admin"), { redirect: "manual" });
    assert(
      [302, 303, 307, 308].includes(response.status),
      `Expected redirect status but received ${response.status}`,
    );
    const location = response.headers.get("location") ?? "";
    assert(location.includes("/admin/login"), "Expected redirect to /admin/login");
  });

  await runCase("quiz admin api requires auth", async () => {
    const { response, json } = await requestJson("/api/quizzes");
    assert(response.status === 401, `Expected 401 but received ${response.status}`);
    assert(json && typeof json === "object" && json.error === "Unauthorized", "Expected unauthorized payload");
  });

  await runCase("logout endpoint reachable", async () => {
    const { response, json } = await requestJson("/api/auth/logout", { method: "POST" });
    assert(response.status === 200, `Expected 200 but received ${response.status}`);
    assert(json && json.success === true, "Expected successful logout payload");
  });
} else {
  skipCase("admin unauthenticated redirect", "NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY are not set");
  skipCase("quiz admin api requires auth", "NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY are not set");
  skipCase("logout endpoint reachable", "NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY are not set");
}

if (SUPABASE_ENV_READY) {
  await runCase("admin login route", async () => {
    const { response, body } = await request("/admin/login");
    assert(response.status === 200, `Expected 200 but received ${response.status}`);
    assert(body.toLowerCase().includes("login"), "Admin login page should contain login text");
  });
} else {
  skipCase("admin login route", "NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY are not set");
  await runCase("admin login route reachability", async () => {
    const { response } = await request("/admin/login");
    assert(
      response.status === 200 || response.status === 500,
      `Expected 200 or 500 but received ${response.status}`,
    );
  });
}

await runCase("disclaimer route", async () => {
  const { response, body } = await request("/disclaimer");
  assert(response.status === 200, `Expected 200 but received ${response.status}`);
  assert(body.length > 0, "Disclaimer body should not be empty");
});

await runCase("tracking bootstrap present on layout", async () => {
  const { response, body } = await request("/");
  assert(response.status === 200, `Expected 200 but received ${response.status}`);
  assert(body.includes("triple-whale-pixel"), "Expected TripleWhale script marker in HTML");
  assert(body.includes("config-security.com"), "Expected tracking script domain in HTML");
});

for (const alias of DOMAIN_ALIASES) {
  await runCase(`domain alias response (${alias})`, async () => {
    const { response } = await request("/", {
      headers: {
        "x-forwarded-host": alias,
        "x-forwarded-proto": "https",
      },
    });
    assert(response.status === 200, `Expected 200 but received ${response.status}`);
  });
}

if (QUIZ_SLUG) {
  await runCase("homepage quiz entry link", async () => {
    const { response, body } = await request("/");
    const expectedEntryUrl = buildQuizEntryUrl({ source: "homepage-hero" });
    assert(response.status === 200, `Expected 200 but received ${response.status}`);
    assert(body.includes(expectedEntryUrl), `Expected homepage HTML to include ${expectedEntryUrl}`);
  });
}

if (ARTICLE_SLUG && QUIZ_SLUG) {
  await runCase("article cta routes into quiz funnel", async () => {
    const expectedEntryUrl = buildQuizEntryUrl({
      source: "article-inline-cta",
      articleSlug: ARTICLE_SLUG,
    });

    const { response, body } = await request(`/articles/${ARTICLE_SLUG}`);
    assert(response.status === 200, `Expected 200 but received ${response.status}`);
    assert(body.includes(`/quiz/${QUIZ_SLUG}`), `Expected article HTML to include /quiz/${QUIZ_SLUG}`);
    assert(
      body.includes(expectedEntryUrl) || body.includes(expectedEntryUrl.replace(/&/g, "&amp;")),
      `Expected article HTML to include CTA ${expectedEntryUrl}`,
    );
  });

  await runCase("article page render", async () => {
    const { response, body } = await request(`/articles/${ARTICLE_SLUG}`);
    assert(response.status === 200, `Expected 200 but received ${response.status}`);
    assert(body.toLowerCase().includes("discussion"), "Article page should include discussion section");
  });

  await runCase("article API ETag behavior", async () => {
    const first = await request(`/api/articles/${ARTICLE_SLUG}`);
    assert(first.response.status === 200, `Expected 200 but received ${first.response.status}`);
    const etag = first.response.headers.get("etag");
    assert(etag, "Expected ETag header from article API");

    const second = await request(`/api/articles/${ARTICLE_SLUG}`, {
      headers: {
        "if-none-match": etag,
      },
    });

    assert(second.response.status === 304, `Expected 304 but received ${second.response.status}`);
  });
} else if (!ARTICLE_SLUG) {
  skipCase("article flow checks", "REGRESSION_ARTICLE_SLUG is not set");
} else {
  skipCase("article quiz entry checks", "REGRESSION_QUIZ_SLUG is not set");
}

if (QUIZ_SLUG) {
  const quizApi = await requestJson(`/api/quizzes/by-slug/${QUIZ_SLUG}`);
  const quiz = quizApi.json;

  await runCase("quiz page render", async () => {
    const { response, body } = await request(`/quiz/${QUIZ_SLUG}`);
    assert(response.status === 200, `Expected 200 but received ${response.status}`);
    assert(body.length > 0, "Quiz page should not be empty");
  });

  await runCase("quiz API ETag behavior", async () => {
    const first = await request(`/api/quizzes/by-slug/${QUIZ_SLUG}`);
    assert(first.response.status === 200, `Expected 200 but received ${first.response.status}`);
    const etag = first.response.headers.get("etag");
    assert(etag, "Expected ETag header from quiz API");

    const second = await request(`/api/quizzes/by-slug/${QUIZ_SLUG}`, {
      headers: {
        "if-none-match": etag,
      },
    });

    assert(second.response.status === 304, `Expected 304 but received ${second.response.status}`);
  });

  await runCase("published quiz contract", async () => {
    assert(quizApi.response.status === 200, `Expected 200 but received ${quizApi.response.status}`);
    assert(quiz && typeof quiz === "object", "Expected quiz payload object");
    assert(typeof quiz.id === "string" && quiz.id.length > 0, "Expected quiz id");
    assert(quiz.definition?.schemaVersion === "quiz-funnel.v2", `Expected quiz-funnel.v2 but received ${quiz.definition?.schemaVersion}`);
    assert(Array.isArray(quiz.definition?.steps), "Expected steps array");
    assert(quiz.definition.steps.length >= 13, "Expected at least 13 quiz steps");
    assert(Array.isArray(quiz.definition?.entrypoints) && quiz.definition.entrypoints.length >= 3, "Expected at least 3 entrypoints");
    assert(quiz.definition?.theme?.variant === "monochrome-premium", "Expected monochrome premium theme");
    assert(quiz.definition.steps.some((step) => step.kind === "message"), "Expected at least one message step");
    assert(quiz.definition.steps.some((step) => step.kind === "analysis"), "Expected at least one analysis step");
  });

  if (QUIZ_DB_READY && quiz && typeof quiz === "object") {
    await runCase("quiz full completion and drop-off persistence", async () => {
      const quizId = quiz.id;
      const definition = quiz.definition;
      const questionSteps = definition.steps.filter((step) => step.kind === "question");
      const welcomeStep = definition.steps.find((step) => step.kind === "welcome");
      const resultStep = definition.steps.find((step) => step.kind === "result");
      const leadStep = definition.steps.find((step) => step.kind === "lead");
      const offerStep = definition.steps.find((step) => step.kind === "offer");

      assert(welcomeStep, "Expected welcome step");
      assert(resultStep, "Expected result step");
      assert(leadStep, "Expected lead step");
      assert(offerStep, "Expected offer step");
      assert(questionSteps.length > 0, "Expected question steps");

      const fullSessionToken = createSessionToken("regression_full");
      const dropSessionToken = createSessionToken("regression_drop");
      const firstQuestion = questionSteps[0];
      const firstOption = firstQuestion.options[0];
      const fullResultId = definition.results[0].id;

      await postQuizEvent(quizId, {
        sessionToken: fullSessionToken,
        eventType: "session_started",
        stepId: welcomeStep.id,
        source: "regression-direct",
        landingPath: `/quiz/${QUIZ_SLUG}?source=regression-direct`,
      });

      for (const step of definition.steps) {
        await postQuizEvent(quizId, {
          sessionToken: fullSessionToken,
          eventType: "step_viewed",
          stepId: step.id,
          source: "regression-direct",
        });

        if (step.kind === "question") {
          const selectedOptionId = step.options[0].id;
          await postQuizEvent(quizId, {
            sessionToken: fullSessionToken,
            eventType: "answer_submitted",
            stepId: step.id,
            nextStepId: resolveNextStepId(definition, step, selectedOptionId),
            optionIds: [selectedOptionId],
          });
        }

        if (step.kind === "result") {
          await postQuizEvent(quizId, {
            sessionToken: fullSessionToken,
            eventType: "result_viewed",
            stepId: step.id,
            resultId: fullResultId,
          });
        }

        if (step.kind === "lead") {
          await postQuizEvent(quizId, {
            sessionToken: fullSessionToken,
            eventType: "lead_submitted",
            stepId: step.id,
            nextStepId: resolveNextStepId(definition, step),
            lead: {
              values: {
                "first-name": "regression",
                email: `quiz-regression+${Date.now()}@example.com`,
              },
              consent: true,
            },
          });
        }
      }

      await postQuizEvent(quizId, {
        sessionToken: fullSessionToken,
        eventType: "offer_clicked",
        stepId: offerStep.id,
        ctaUrl: offerStep.ctaUrl,
      });

      await postQuizEvent(quizId, {
        sessionToken: fullSessionToken,
        eventType: "session_completed",
        stepId: offerStep.id,
      });

      await postQuizEvent(quizId, {
        sessionToken: dropSessionToken,
        eventType: "session_started",
        stepId: welcomeStep.id,
        source: "regression-article",
        articleSlug: ARTICLE_SLUG || null,
        landingPath: buildQuizEntryUrl({
          source: "regression-article",
          articleSlug: ARTICLE_SLUG || undefined,
        }),
      });

      await postQuizEvent(quizId, {
        sessionToken: dropSessionToken,
        eventType: "step_viewed",
        stepId: welcomeStep.id,
        source: "regression-article",
      });

      await postQuizEvent(quizId, {
        sessionToken: dropSessionToken,
        eventType: "step_viewed",
        stepId: firstQuestion.id,
        source: "regression-article",
      });

      await postQuizEvent(quizId, {
        sessionToken: dropSessionToken,
        eventType: "answer_submitted",
        stepId: firstQuestion.id,
        nextStepId: resolveNextStepId(definition, firstQuestion, firstOption.id),
        optionIds: [firstOption.id],
      });

      const { data: sessions, error: sessionError } = await adminSupabase
        .from("quiz_sessions")
        .select("id,session_token,status,result_id,lead_captured_at,offer_clicked_at,completed_at,entry_source,current_step_id")
        .eq("quiz_definition_id", quizId)
        .in("session_token", [fullSessionToken, dropSessionToken]);

      if (sessionError) {
        throw sessionError;
      }

      assert(Array.isArray(sessions) && sessions.length === 2, "Expected two saved quiz sessions");

      const fullSession = sessions.find((session) => session.session_token === fullSessionToken);
      const dropSession = sessions.find((session) => session.session_token === dropSessionToken);
      assert(fullSession, "Expected full session row");
      assert(dropSession, "Expected drop-off session row");
      assert(fullSession.status === "completed", "Expected full session to be completed");
      assert(typeof fullSession.completed_at === "string" && fullSession.completed_at.length > 0, "Expected completed_at on full session");
      assert(typeof fullSession.lead_captured_at === "string" && fullSession.lead_captured_at.length > 0, "Expected lead_captured_at on full session");
      assert(typeof fullSession.offer_clicked_at === "string" && fullSession.offer_clicked_at.length > 0, "Expected offer_clicked_at on full session");
      assert(typeof fullSession.result_id === "string" && fullSession.result_id.length > 0, "Expected result_id on full session");
      assert(dropSession.status === "active", "Expected drop-off session to remain active");
      assert(dropSession.lead_captured_at === null, "Expected no lead capture on drop-off session");
      assert(dropSession.completed_at === null, "Expected no completion timestamp on drop-off session");
      assert(dropSession.entry_source === "regression-article", "Expected drop-off source attribution");

      const sessionIds = sessions.map((session) => session.id);
      const { data: events, error: eventError } = await adminSupabase
        .from("quiz_events")
        .select("session_id,event_type,step_id")
        .in("session_id", sessionIds);

      if (eventError) {
        throw eventError;
      }

      assert(Array.isArray(events) && events.length >= definition.steps.length + 6, "Expected event rows for regression sessions");
      assert(events.some((event) => event.event_type === "lead_submitted" && event.session_id === fullSession.id), "Expected lead_submitted event");
      assert(events.some((event) => event.event_type === "offer_clicked" && event.session_id === fullSession.id), "Expected offer_clicked event");
      assert(events.some((event) => event.event_type === "session_completed" && event.session_id === fullSession.id), "Expected session_completed event");
      assert(events.some((event) => event.event_type === "answer_submitted" && event.session_id === dropSession.id), "Expected drop-off answer event");
    });
  } else {
    skipCase("quiz persistence checks", "THIHUB_SUPABASE_URL/THIHUB_SUPABASE_SERVICE_ROLE_KEY are not set");
  }
} else {
  skipCase("quiz flow checks", "REGRESSION_QUIZ_SLUG is not set");
}

console.log(
  `\nRegression summary: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped`,
);

if (results.failed > 0) {
  process.exit(1);
}
