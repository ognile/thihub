#!/usr/bin/env node

import { performance } from "perf_hooks";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const ITERATIONS = Number(process.env.PERF_ITERATIONS ?? 5);
const ARTICLE_SLUG = process.env.REGRESSION_ARTICLE_SLUG ?? "";
const QUIZ_SLUG = process.env.REGRESSION_QUIZ_SLUG ?? "";
const SUPABASE_ENV_READY = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const endpoints = [
  {
    name: "home",
    path: "/",
    budgetMs: Number(process.env.BUDGET_HOME_P95_MS ?? 2000),
  },
];

if (SUPABASE_ENV_READY) {
  endpoints.push({
    name: "admin-login",
    path: "/admin/login",
    budgetMs: Number(process.env.BUDGET_ADMIN_LOGIN_P95_MS ?? 2000),
  });
}

if (ARTICLE_SLUG) {
  endpoints.push({
    name: "article-page",
    path: `/articles/${ARTICLE_SLUG}`,
    budgetMs: Number(process.env.BUDGET_ARTICLE_P95_MS ?? 2500),
  });
}

if (QUIZ_SLUG) {
  endpoints.push({
    name: "quiz-page",
    path: `/quiz/${QUIZ_SLUG}`,
    budgetMs: Number(process.env.BUDGET_QUIZ_P95_MS ?? 2500),
  });
}

function percentile(values, percentileValue) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1),
  );
  return sorted[index];
}

function toUrl(pathname) {
  return new URL(pathname, BASE_URL).toString();
}

const failures = [];

for (const endpoint of endpoints) {
  const timings = [];
  const statuses = [];

  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    const start = performance.now();
    const response = await fetch(toUrl(endpoint.path));
    await response.arrayBuffer();
    const durationMs = performance.now() - start;

    timings.push(durationMs);
    statuses.push(response.status);
  }

  const p95 = percentile(timings, 95);
  const average = timings.reduce((total, value) => total + value, 0) / timings.length;
  const min = Math.min(...timings);
  const max = Math.max(...timings);
  const statusSummary = [...new Set(statuses)].join(",");

  const rounded = (value) => Number(value.toFixed(2));
  const statusLine = [
    `route=${endpoint.path}`,
    `statuses=${statusSummary}`,
    `p95=${rounded(p95)}ms`,
    `avg=${rounded(average)}ms`,
    `min=${rounded(min)}ms`,
    `max=${rounded(max)}ms`,
    `budget=${endpoint.budgetMs}ms`,
  ].join(" ");

  console.log(`PERF ${endpoint.name} ${statusLine}`);

  if (statuses.some((status) => status < 200 || status >= 400)) {
    failures.push(`Non-success status for ${endpoint.path}: ${statusSummary}`);
    continue;
  }

  if (p95 > endpoint.budgetMs) {
    failures.push(
      `P95 for ${endpoint.path} exceeded budget (${rounded(p95)}ms > ${endpoint.budgetMs}ms)`,
    );
  }
}

if (failures.length > 0) {
  console.error("\nPerformance budget failures:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("\nPerformance budgets satisfied.");
