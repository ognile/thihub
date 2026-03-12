#!/usr/bin/env node

import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { config as loadEnv } from 'dotenv';

loadEnv();
loadEnv({ path: path.join(process.cwd(), '.env.local'), override: false });

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const SNAPSHOT_SET = process.env.SNAPSHOT_SET ?? 'latest';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? process.env.REGRESSION_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? process.env.REGRESSION_ADMIN_PASSWORD ?? '';
const HAS_AUTH_CREDS = ADMIN_EMAIL.length > 0 && ADMIN_PASSWORD.length > 0;

const outDir = path.join(process.cwd(), 'ops', 'visual-snapshots', SNAPSHOT_SET);
const unauthDir = path.join(outDir, 'unauthenticated');
const authDir = path.join(outDir, 'authenticated');

const unauthRoutes = [
  { name: 'admin-login', path: '/admin/login' },
  { name: 'admin-dashboard', path: '/admin' },
  { name: 'admin-quizzes', path: '/admin/quizzes' },
];

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

function toUrl(pathname) {
  return new URL(pathname, BASE_URL).toString();
}

async function takeSnapshot(page, filePath) {
  await page.waitForTimeout(150);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`SNAPSHOT -> ${filePath}`);
}

async function loginAdmin(page) {
  const loginResponse = await page.request.post(toUrl('/api/auth/login'), {
    data: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    },
  });
  if (!loginResponse.ok()) {
    return false;
  }

  await page.goto(toUrl('/admin'), { waitUntil: 'networkidle' });

  return !page.url().includes('/admin/login');
}

async function resolveArticleSlug(context) {
  const envSlug = process.env.REGRESSION_ARTICLE_SLUG ?? '';
  if (envSlug) return envSlug;

  try {
    const response = await context.request.get(toUrl('/api/articles'));
    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    if (!Array.isArray(payload) || payload.length === 0) {
      return null;
    }

    const first = payload[0];
    return typeof first?.slug === 'string' && first.slug.length > 0 ? first.slug : null;
  } catch {
    return null;
  }
}

async function resolveQuizId(context) {
  try {
    const response = await context.request.get(toUrl('/api/quizzes'));
    if (!response.ok()) {
      return null;
    }

    const payload = await response.json();
    if (!Array.isArray(payload) || payload.length === 0) {
      return null;
    }

    const first = payload[0];
    return typeof first?.id === 'string' && first.id.length > 0 ? first.id : null;
  } catch {
    return null;
  }
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('Playwright is not installed. Run `npm i -D playwright` and `npx playwright install chromium`.');
  process.exit(1);
}

await mkdir(unauthDir, { recursive: true });
if (HAS_AUTH_CREDS) {
  await mkdir(authDir, { recursive: true });
}

const browser = await chromium.launch({ headless: true });

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
  const page = await context.newPage();

  for (const route of unauthRoutes) {
    await page.goto(toUrl(route.path), { waitUntil: 'networkidle' });
    await takeSnapshot(page, path.join(unauthDir, `${route.name}-${viewport.name}.png`));
  }

  await context.close();
}

if (HAS_AUTH_CREDS) {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
    const page = await context.newPage();

    const loggedIn = await loginAdmin(page);
    if (!loggedIn) {
      console.error('Failed to authenticate admin snapshots. Check ADMIN_EMAIL/ADMIN_PASSWORD.');
      await context.close();
      await browser.close();
      process.exit(1);
    }

    await page.goto(toUrl('/admin'), { waitUntil: 'networkidle' });
    await takeSnapshot(page, path.join(authDir, `admin-dashboard-${viewport.name}.png`));

    await page.getByRole('button', { name: /^settings$/i }).first().click();
    await page.locator('[data-testid="admin-sheet"]').first().waitFor({ state: 'visible' });
    await takeSnapshot(page, path.join(authDir, `admin-dashboard-global-settings-open-${viewport.name}.png`));

    await page.goto(toUrl('/admin/quizzes'), { waitUntil: 'networkidle' });
    await takeSnapshot(page, path.join(authDir, `admin-quizzes-${viewport.name}.png`));

    const quizId = await resolveQuizId(context);
    if (quizId) {
      await page.goto(toUrl(`/admin/quizzes/${quizId}`), { waitUntil: 'networkidle' });
      await takeSnapshot(page, path.join(authDir, `admin-quiz-editor-${viewport.name}.png`));

      await page.goto(toUrl(`/admin/quizzes/${quizId}/analytics`), { waitUntil: 'networkidle' });
      await takeSnapshot(page, path.join(authDir, `admin-quiz-analytics-${viewport.name}.png`));
    } else {
      console.log(`SKIP quiz editor snapshots (${viewport.name}): no quiz definition found`);
    }

    const slug = await resolveArticleSlug(context);
    if (!slug) {
      console.log(`SKIP article editor snapshots (${viewport.name}): no article slug found`);
      await context.close();
      continue;
    }

    await page.goto(toUrl(`/admin/articles/${slug}`), { waitUntil: 'networkidle' });
    await takeSnapshot(page, path.join(authDir, `admin-article-editor-${viewport.name}.png`));

    await page.getByRole('button', { name: /^settings$/i }).first().click();
    await page.getByText('Article Settings').first().waitFor({ state: 'visible' });
    await takeSnapshot(page, path.join(authDir, `admin-article-editor-settings-open-${viewport.name}.png`));

    await context.close();
  }
} else {
  console.log('SKIP authenticated snapshots: set ADMIN_EMAIL and ADMIN_PASSWORD to enable.');
}

await browser.close();
console.log(`\nVisual snapshots saved in ${outDir}`);
