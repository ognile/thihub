#!/usr/bin/env node

import path from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv();
loadEnv({ path: path.join(process.cwd(), '.env.local'), override: false });

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? process.env.REGRESSION_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? process.env.REGRESSION_ADMIN_PASSWORD ?? '';

const HAS_AUTH_CREDS = ADMIN_EMAIL.length > 0 && ADMIN_PASSWORD.length > 0;

if (!HAS_AUTH_CREDS) {
  console.log('SKIP admin settings geometry checks: set ADMIN_EMAIL and ADMIN_PASSWORD.');
  process.exit(0);
}

function toUrl(pathname) {
  return new URL(pathname, BASE_URL).toString();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function loginAdmin(page) {
  const loginResponse = await page.request.post(toUrl('/api/auth/login'), {
    data: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    },
  });
  assert(loginResponse.ok(), 'Login API returned a non-success status during geometry checks.');

  await page.goto(toUrl('/admin'), { waitUntil: 'networkidle' });

  assert(!page.url().includes('/admin/login'), 'Login failed during geometry checks.');
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('Playwright is not installed. Run `npm i -D playwright` and `npx playwright install chromium`.');
  process.exit(1);
}

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const browser = await chromium.launch({ headless: true });

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
  const page = await context.newPage();

  await loginAdmin(page);
  await page.goto(toUrl('/admin'), { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^settings$/i }).first().click();
  await page.locator('[data-testid="admin-sheet"]').first().waitFor({ state: 'visible' });

  const gutterMetrics = await page.evaluate(() => {
    const header = document.querySelector('[data-testid="admin-sheet-header"]');
    const body = document.querySelector('[data-testid="admin-sheet-body"]');

    if (!header || !body) {
      return null;
    }

    const headerRect = header.getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();

    return {
      headerLeft: headerRect.left,
      bodyLeft: bodyRect.left,
      delta: Math.abs(headerRect.left - bodyRect.left),
    };
  });

  assert(gutterMetrics !== null, `[${viewport.name}] Missing admin sheet header/body nodes.`);
  assert(
    gutterMetrics.delta <= 1,
    `[${viewport.name}] Header/body left gutter mismatch: delta ${gutterMetrics.delta.toFixed(2)}px`,
  );
  console.log(`PASS [${viewport.name}] left gutter alignment delta=${gutterMetrics.delta.toFixed(2)}px`);

  const rowAlignment = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('[data-testid="admin-settings-row"]'));
    const deltas = [];

    for (const row of rows) {
      const label = row.querySelector('p.text-sm.font-medium');
      const actions = row.querySelector('[data-testid="admin-row-actions"]');
      if (!label || !actions) {
        continue;
      }

      const labelRect = label.getBoundingClientRect();
      const actionsRect = actions.getBoundingClientRect();
      deltas.push(Math.abs(labelRect.top - actionsRect.top));
    }

    return {
      rowsChecked: deltas.length,
      maxDelta: deltas.length > 0 ? Math.max(...deltas) : 0,
    };
  });

  if (rowAlignment.rowsChecked > 0) {
    assert(
      rowAlignment.maxDelta <= 2,
      `[${viewport.name}] Row action top alignment drift is too large: ${rowAlignment.maxDelta.toFixed(2)}px`,
    );
    console.log(`PASS [${viewport.name}] row top alignment max delta=${rowAlignment.maxDelta.toFixed(2)}px`);
  } else {
    console.log(`SKIP [${viewport.name}] row alignment check: no settings rows available.`);
  }

  const overflowCheck = await page.evaluate(() => {
    const values = Array.from(document.querySelectorAll('[data-testid="admin-row-value"]'));

    const failed = values.filter((valueElement) => {
      const element = valueElement;
      const singleLine = element.scrollHeight <= element.clientHeight + 1;
      const hasTitle = (element.getAttribute('title') ?? '').trim().length > 0;
      return !singleLine || !hasTitle;
    });

    return {
      checked: values.length,
      failed: failed.length,
    };
  });

  if (overflowCheck.checked > 0) {
    assert(
      overflowCheck.failed === 0,
      `[${viewport.name}] ${overflowCheck.failed} row values are wrapping or missing title attributes.`,
    );
    console.log(`PASS [${viewport.name}] overflow/title check on ${overflowCheck.checked} rows`);
  } else {
    console.log(`SKIP [${viewport.name}] overflow check: no row values available.`);
  }

  await context.close();
}

await browser.close();
console.log('\nAdmin settings geometry checks passed.');
