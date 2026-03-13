#!/usr/bin/env node

import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? process.env.QUIZ_MOBILE_QA_BASE_URL ?? "http://127.0.0.1:3104";
const QUIZ_SLUG = process.env.REGRESSION_QUIZ_SLUG ?? process.env.QUIZ_MOBILE_QA_SLUG ?? "symptom-profile-v2";
const TARGET_URL = new URL(`/quiz/${QUIZ_SLUG}?source=direct`, BASE_URL).toString();
const VIEWPORTS = [
  { label: "iphone-15-pro", width: 393, height: 852 },
  { label: "iphone-guardrail", width: 375, height: 812 },
];
const STEP_SETTLE_MS = 1200;
const QUESTION_STABILITY_CHECK_MS = 120;
const ANALYSIS_MIN_MS = 4500;
const ANALYSIS_MAX_MS = 5600;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalize(text) {
  return (text ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

function parseTranslate(transform) {
  if (!transform || transform === "none") {
    return { x: 0, y: 0 };
  }

  const matrix3dMatch = transform.match(/^matrix3d\((.+)\)$/);
  if (matrix3dMatch) {
    const values = matrix3dMatch[1].split(",").map((value) => Number(value.trim()));
    return {
      x: Number.isFinite(values[12]) ? values[12] : 0,
      y: Number.isFinite(values[13]) ? values[13] : 0,
    };
  }

  const matrixMatch = transform.match(/^matrix\((.+)\)$/);
  if (matrixMatch) {
    const values = matrixMatch[1].split(",").map((value) => Number(value.trim()));
    return {
      x: Number.isFinite(values[4]) ? values[4] : 0,
      y: Number.isFinite(values[5]) ? values[5] : 0,
    };
  }

  return { x: 0, y: 0 };
}

async function waitForProgress(page, expected, timeout = 12000) {
  await page.waitForFunction(
    (value) => {
      const compactBodyText = (document.body.innerText || "").replace(/\s+/g, "");
      const compactExpected = value.replace(/\s+/g, "");
      return compactBodyText.includes(compactExpected);
    },
    expected,
    { timeout },
  );
}

async function readProgress(page) {
  return await page.evaluate(() => {
    const match = (document.body.innerText || "").match(/(\d+)\s*\/\s*(\d+)/);
    return match ? `${match[1]}/${match[2]}` : "";
  });
}

async function settle(page, delay = STEP_SETTLE_MS) {
  await page.waitForTimeout(delay);
}

async function scrollMetrics(page) {
  return await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
      clientWidth: doc.clientWidth,
      scrollX: window.scrollX,
    };
  });
}

async function assertNoHorizontalOverflow(page, label) {
  let metrics = await scrollMetrics(page);
  assert(
    metrics.scrollWidth === metrics.clientWidth,
    `${label}: expected scrollWidth ${metrics.clientWidth}, received ${metrics.scrollWidth}`,
  );

  await page.evaluate(() => {
    window.scrollTo({ left: 160, top: window.scrollY, behavior: "auto" });
  });
  await page.waitForTimeout(50);

  metrics = await scrollMetrics(page);
  assert(metrics.scrollX === 0, `${label}: expected scrollX 0 after horizontal swipe simulation, received ${metrics.scrollX}`);
  assert(
    metrics.scrollWidth === metrics.clientWidth,
    `${label}: overflow returned after horizontal swipe simulation (${metrics.scrollWidth} vs ${metrics.clientWidth})`,
  );
}

async function assertScrollReset(page, label) {
  const scrollY = await page.evaluate(() => window.scrollY);
  assert(scrollY <= 8, `${label}: expected scrollY <= 8, received ${scrollY}`);
}

async function forceVerticalScroll(page, amount = 420) {
  await page.evaluate((target) => {
    window.scrollTo({ top: target, behavior: "auto" });
  }, amount);
  await page.waitForTimeout(80);
}

async function getDockAction(page, pattern) {
  const dock = page.locator("[data-mobile-dock='true']");
  await dock.waitFor({ state: "visible", timeout: 10000 });
  const action = dock.locator("button:visible, a:visible").filter({ hasText: pattern }).first();
  await action.waitFor({ state: "visible", timeout: 10000 });
  return action;
}

async function assertDockActionVisible(page, pattern, label) {
  const action = await getDockAction(page, pattern);
  const box = await action.boundingBox();
  const viewport = page.viewportSize();

  assert(box, `${label}: dock action did not produce a bounding box`);
  assert(
    box.y >= 0 && box.y + box.height <= viewport.height,
    `${label}: dock action is not fully visible in viewport`,
  );
}

async function assertAnalysisFitsFirstFold(page, label) {
  const analysis = page.locator("[data-mobile-analysis='true']").first();
  await analysis.waitFor({ state: "visible", timeout: 10000 });
  const box = await analysis.boundingBox();
  const viewport = page.viewportSize();

  assert(box, `${label}: analysis block did not produce a bounding box`);
  assert(box.y >= 0, `${label}: analysis block starts above the viewport`);
  assert(
    box.y + box.height <= viewport.height,
    `${label}: analysis block extends below the first fold (${Math.round(box.y + box.height)} > ${viewport.height})`,
  );
}

async function clickFirstOption(page) {
  const options = await page.locator("button:visible").evaluateAll((elements) =>
    elements
      .map((element, index) => ({
        index,
        text: (element.textContent || "").replace(/\s+/g, " ").trim(),
      }))
      .filter((entry) => entry.text.length > 0),
  );

  assert(options.length > 0, "expected at least one visible option button");
  await page.locator("button:visible").nth(options[0].index).click();
}

async function assertQuestionOptionsStable(page, label) {
  await page.waitForTimeout(QUESTION_STABILITY_CHECK_MS);

  const states = await page.locator("button:visible").evaluateAll((elements) =>
    elements
      .map((element) => {
        const text = (element.textContent || "").replace(/\s+/g, " ").trim();
        if (!text) {
          return null;
        }

        const style = window.getComputedStyle(element);
        return {
          text,
          opacity: Number(style.opacity),
          transform: style.transform,
        };
      })
      .filter(Boolean),
  );

  assert(states.length >= 3, `${label}: expected visible option set`);

  for (const state of states) {
    const translate = parseTranslate(state.transform);
    assert(state.opacity >= 0.99, `${label}: option "${state.text}" is still fading (${state.opacity})`);
    assert(Math.abs(translate.x) <= 0.5, `${label}: option "${state.text}" is still moving on x (${translate.x})`);
    assert(Math.abs(translate.y) <= 0.5, `${label}: option "${state.text}" is still moving on y (${translate.y})`);
  }
}

async function fillLeadForm(page) {
  await page.locator("input[placeholder='your first name']").fill("codex");
  await page.locator("input[placeholder='you@example.com']").fill(`codex+${Date.now()}@example.com`);

  const consent = page.locator("input[type='checkbox']:visible").first();
  if (await consent.count()) {
    await consent.check();
  }
}

async function assertLeadDockFocusBehavior(page, label) {
  await assertDockActionVisible(page, /send my result/i, `${label} dock visible before focus`);

  const firstNameField = page.locator("input[placeholder='your first name']");
  await firstNameField.focus();
  await page.waitForTimeout(160);

  assert(
    (await page.locator("[data-mobile-dock='true']").count()) === 0,
    `${label}: mobile dock should hide while a lead field is focused`,
  );

  const inlineSubmit = page.locator("button:visible").filter({ hasText: /send my result/i }).first();
  await inlineSubmit.waitFor({ state: "visible", timeout: 10000 });

  await fillLeadForm(page);
  await page.evaluate(() => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  });
  await page.waitForTimeout(220);

  await assertDockActionVisible(page, /send my result/i, `${label} dock visible after blur`);
}

async function assertAnalysisFlow(page, label) {
  const phaseSequence = new Set();
  const startedAt = Date.now();

  while (true) {
    const bodyText = normalize(await page.locator("body").textContent());
    const phaseMatch = bodyText.match(/phase\s+(\d)\s+of\s+3/);
    if (phaseMatch) {
      phaseSequence.add(phaseMatch[1]);
    }

    const progress = await readProgress(page);
    if (progress === "13/16") {
      break;
    }

    assert(Date.now() - startedAt < 10000, `${label}: analysis did not advance to result`);
    await page.waitForTimeout(250);
  }

  const durationMs = Date.now() - startedAt;
  assert(
    durationMs >= ANALYSIS_MIN_MS && durationMs <= ANALYSIS_MAX_MS,
    `${label}: analysis took ${durationMs}ms (expected ${ANALYSIS_MIN_MS}-${ANALYSIS_MAX_MS}ms)`,
  );

  assert(phaseSequence.has("1"), `${label}: never observed phase 1`);
  assert(phaseSequence.has("2"), `${label}: never observed phase 2`);
  assert(phaseSequence.has("3"), `${label}: never observed phase 3`);

  return durationMs;
}

async function runViewport(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const metrics = { viewport };

  await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  await assertNoHorizontalOverflow(page, `${viewport.label} welcome`);
  await assertDockActionVisible(page, /start my profile|begin/i, `${viewport.label} welcome dock`);
  await (await getDockAction(page, /start my profile|begin/i)).click();
  await waitForProgress(page, "2/16");
  await settle(page);
  await assertNoHorizontalOverflow(page, `${viewport.label} question 1`);
  await assertScrollReset(page, `${viewport.label} welcome -> question 1`);
  await assertQuestionOptionsStable(page, `${viewport.label} question 1`);

  const firstQuestionStartedAt = Date.now();
  await clickFirstOption(page);
  await waitForProgress(page, "3/16");
  metrics.firstQuestionAdvanceMs = Date.now() - firstQuestionStartedAt;
  assert(metrics.firstQuestionAdvanceMs <= 1200, `${viewport.label}: first question took ${metrics.firstQuestionAdvanceMs}ms`);
  await settle(page);
  await assertNoHorizontalOverflow(page, `${viewport.label} question 2`);
  await assertScrollReset(page, `${viewport.label} question 1 -> question 2`);
  await assertQuestionOptionsStable(page, `${viewport.label} question 2`);

  await clickFirstOption(page);
  await waitForProgress(page, "4/16");
  await settle(page);
  await assertNoHorizontalOverflow(page, `${viewport.label} message 1`);
  await assertScrollReset(page, `${viewport.label} question 2 -> message 1`);

  const firstMessageText = normalize(await page.locator("body").textContent());
  assert(firstMessageText.includes("wired but tired"), `${viewport.label}: message step did not echo the recent answer`);
  await assertDockActionVisible(page, /keep going/i, `${viewport.label} message 1 dock`);
  await forceVerticalScroll(page, 360);
  await (await getDockAction(page, /keep going/i)).click();
  await waitForProgress(page, "5/16");
  await settle(page);
  await assertNoHorizontalOverflow(page, `${viewport.label} question 3`);
  await assertScrollReset(page, `${viewport.label} message 1 -> question 3`);
  await assertQuestionOptionsStable(page, `${viewport.label} question 3`);

  await clickFirstOption(page);
  await waitForProgress(page, "6/16");
  await settle(page);
  await assertNoHorizontalOverflow(page, `${viewport.label} question 4`);
  await assertQuestionOptionsStable(page, `${viewport.label} question 4`);

  await clickFirstOption(page);
  await waitForProgress(page, "7/16");
  await settle(page);
  await assertNoHorizontalOverflow(page, `${viewport.label} question 5`);
  await assertQuestionOptionsStable(page, `${viewport.label} question 5`);

  await clickFirstOption(page);
  await waitForProgress(page, "8/16");
  await settle(page);
  await assertNoHorizontalOverflow(page, `${viewport.label} message 2`);
  await assertDockActionVisible(page, /show me the next question/i, `${viewport.label} message 2 dock`);
  await (await getDockAction(page, /show me the next question/i)).click();
  await waitForProgress(page, "9/16");
  await settle(page);
  await assertNoHorizontalOverflow(page, `${viewport.label} question 6`);
  await assertQuestionOptionsStable(page, `${viewport.label} question 6`);

  await clickFirstOption(page);
  await waitForProgress(page, "10/16");
  await settle(page);
  await assertNoHorizontalOverflow(page, `${viewport.label} question 7`);
  await assertQuestionOptionsStable(page, `${viewport.label} question 7`);

  await clickFirstOption(page);
  await waitForProgress(page, "11/16");
  await settle(page);
  await assertNoHorizontalOverflow(page, `${viewport.label} question 8`);
  await assertQuestionOptionsStable(page, `${viewport.label} question 8`);

  await clickFirstOption(page);
  await waitForProgress(page, "12/16");
  await settle(page, 160);
  await assertNoHorizontalOverflow(page, `${viewport.label} analysis`);
  await assertAnalysisFitsFirstFold(page, `${viewport.label} analysis`);
  metrics.analysisMs = await assertAnalysisFlow(page, viewport.label);
  await page.waitForTimeout(220);
  await assertNoHorizontalOverflow(page, `${viewport.label} result`);
  await assertScrollReset(page, `${viewport.label} analysis -> result`);
  await assertDockActionVisible(page, /show me what to do next/i, `${viewport.label} result dock`);

  await forceVerticalScroll(page, 420);
  await (await getDockAction(page, /show me what to do next/i)).click();
  await waitForProgress(page, "14/16");
  await settle(page);
  await assertNoHorizontalOverflow(page, `${viewport.label} result message`);
  await assertScrollReset(page, `${viewport.label} result -> result message`);
  await assertDockActionVisible(page, /continue/i, `${viewport.label} result message dock`);

  await (await getDockAction(page, /continue/i)).click();
  await waitForProgress(page, "15/16");
  await settle(page);
  await assertNoHorizontalOverflow(page, `${viewport.label} lead`);
  await assertScrollReset(page, `${viewport.label} result message -> lead`);
  await assertLeadDockFocusBehavior(page, viewport.label);

  await forceVerticalScroll(page, 460);
  await (await getDockAction(page, /send my result/i)).click();
  await waitForProgress(page, "16/16");
  await settle(page);
  await assertNoHorizontalOverflow(page, `${viewport.label} offer`);
  await assertScrollReset(page, `${viewport.label} lead -> offer`);
  await assertDockActionVisible(page, /see the recommended support/i, `${viewport.label} offer dock`);

  console.log(`PASS ${viewport.label} metrics=${JSON.stringify(metrics)}`);
  await page.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    for (const viewport of VIEWPORTS) {
      await runViewport(browser, viewport);
    }
  } finally {
    await browser.close();
  }
}

await main();
