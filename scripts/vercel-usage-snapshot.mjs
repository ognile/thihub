#!/usr/bin/env node

import { promises as fs } from "fs";
import os from "os";
import path from "path";

const OUTPUT_DIR = process.env.USAGE_SNAPSHOT_DIR ?? path.resolve("ops/usage-snapshots");

function parseNumber(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function readJsonIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function resolveVercelToken() {
  if (process.env.VERCEL_TOKEN) {
    return process.env.VERCEL_TOKEN;
  }

  const home = os.homedir();
  const candidates = [
    path.join(home, "Library/Application Support/com.vercel.cli/auth.json"),
    path.join(home, ".config/com.vercel.cli/auth.json"),
    path.join(home, ".vercel/auth.json"),
  ];

  for (const candidate of candidates) {
    const authJson = await readJsonIfExists(candidate);
    if (authJson?.token) {
      return authJson.token;
    }
  }

  throw new Error("Unable to resolve Vercel token. Set VERCEL_TOKEN.");
}

async function resolveTeamId() {
  if (process.env.VERCEL_TEAM_ID) {
    return process.env.VERCEL_TEAM_ID;
  }

  const home = os.homedir();
  const candidates = [
    path.join(home, "Library/Application Support/com.vercel.cli/config.json"),
    path.join(home, ".config/com.vercel.cli/config.json"),
  ];

  for (const candidate of candidates) {
    const configJson = await readJsonIfExists(candidate);
    if (configJson?.currentTeam) {
      return configJson.currentTeam;
    }
  }

  throw new Error("Unable to resolve team ID. Set VERCEL_TEAM_ID.");
}

async function apiRequest(token, endpoint) {
  const response = await fetch(`https://api.vercel.com${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Vercel API request failed (${response.status}): ${endpoint}\n${body}`);
  }

  return response;
}

function parseChargeRows(payloadText) {
  const rows = [];
  const lines = payloadText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    for (const line of lines) {
      try {
        rows.push(JSON.parse(line));
      } catch {
        // Ignore malformed lines.
      }
    }
    return rows;
  }

  try {
    const parsed = JSON.parse(payloadText);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && typeof parsed === "object") {
      return [parsed];
    }
  } catch {
    // Fall through to empty rows.
  }

  return rows;
}

function aggregateCharges(rows) {
  const totals = {
    billed: 0,
    effective: 0,
  };

  const services = new Map();
  const projects = new Map();
  const days = new Map();

  for (const row of rows) {
    const billed = parseNumber(row.BilledCost);
    const effective = parseNumber(row.EffectiveCost);
    const consumed = parseNumber(row.ConsumedQuantity);
    const consumedUnit = row.ConsumedUnit ?? null;
    const serviceName = row.ServiceName ?? "Unknown";
    const projectId = row.Tags?.ProjectId ?? "no-project";
    const projectName = row.Tags?.ProjectName ?? "N/A";
    const day = String(row.ChargePeriodStart ?? "").slice(0, 10) || "unknown";

    totals.billed += billed;
    totals.effective += effective;

    const serviceEntry =
      services.get(serviceName) ??
      {
        name: serviceName,
        billed: 0,
        effective: 0,
        consumed: 0,
        units: new Set(),
        rows: 0,
      };
    serviceEntry.billed += billed;
    serviceEntry.effective += effective;
    serviceEntry.consumed += consumed;
    if (consumedUnit) {
      serviceEntry.units.add(consumedUnit);
    }
    serviceEntry.rows += 1;
    services.set(serviceName, serviceEntry);

    const projectEntry =
      projects.get(projectId) ??
      {
        projectId,
        projectName,
        billed: 0,
        effective: 0,
        consumed: 0,
        rows: 0,
      };
    projectEntry.billed += billed;
    projectEntry.effective += effective;
    projectEntry.consumed += consumed;
    projectEntry.rows += 1;
    projects.set(projectId, projectEntry);

    const dayEntry = days.get(day) ?? { day, billed: 0, effective: 0 };
    dayEntry.billed += billed;
    dayEntry.effective += effective;
    days.set(day, dayEntry);
  }

  const toRoundedNumber = (value) => Number(value.toFixed(6));

  return {
    totals: {
      billed: toRoundedNumber(totals.billed),
      effective: toRoundedNumber(totals.effective),
    },
    services: [...services.values()]
      .map((entry) => ({
        ...entry,
        billed: toRoundedNumber(entry.billed),
        effective: toRoundedNumber(entry.effective),
        consumed: toRoundedNumber(entry.consumed),
        units: [...entry.units],
      }))
      .sort((left, right) => right.effective - left.effective),
    projects: [...projects.values()]
      .map((entry) => ({
        ...entry,
        billed: toRoundedNumber(entry.billed),
        effective: toRoundedNumber(entry.effective),
        consumed: toRoundedNumber(entry.consumed),
      }))
      .sort((left, right) => right.effective - left.effective),
    byDay: [...days.values()]
      .map((entry) => ({
        ...entry,
        billed: toRoundedNumber(entry.billed),
        effective: toRoundedNumber(entry.effective),
      }))
      .sort((left, right) => left.day.localeCompare(right.day)),
  };
}

const token = await resolveVercelToken();
const teamId = await resolveTeamId();

const teamResponse = await apiRequest(token, `/v2/teams/${teamId}`);
const team = await teamResponse.json();

const periodStartEpoch = team?.billing?.period?.start;
const periodEndEpoch = team?.billing?.period?.end;
const billingPeriodStart = new Date(
  typeof periodStartEpoch === "number" ? periodStartEpoch : Date.now() - 7 * 24 * 60 * 60 * 1000,
).toISOString();
const billingPeriodEnd = new Date(
  typeof periodEndEpoch === "number" ? periodEndEpoch : Date.now(),
).toISOString();
const now = new Date().toISOString();

const chargesResponse = await apiRequest(
  token,
  `/v1/billing/charges?teamId=${teamId}&from=${encodeURIComponent(
    billingPeriodStart,
  )}&to=${encodeURIComponent(now)}`,
);
const chargesPayload = await chargesResponse.text();
const chargeRows = parseChargeRows(chargesPayload);
const aggregates = aggregateCharges(chargeRows);

const snapshot = {
  generatedAt: now,
  teamId,
  teamSlug: team.slug ?? null,
  teamName: team.name ?? null,
  billingPlan: team?.billing?.plan ?? null,
  billingPlanIteration: team?.billing?.planIteration ?? null,
  includedAllocationUsd: team?.billing?.invoiceItems?.includedAllocationUsd?.quantity ?? null,
  billingPeriod: {
    start: billingPeriodStart,
    end: billingPeriodEnd,
    now,
  },
  rowCount: chargeRows.length,
  totals: aggregates.totals,
  services: aggregates.services,
  projects: aggregates.projects,
  byDay: aggregates.byDay,
};

await fs.mkdir(OUTPUT_DIR, { recursive: true });
const fileName = `${new Date().toISOString().slice(0, 10)}.json`;
const outputPath = path.join(OUTPUT_DIR, fileName);
await fs.writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

console.log(`Usage snapshot saved: ${outputPath}`);
console.log(
  `Team=${snapshot.teamSlug ?? snapshot.teamId} Billed=$${snapshot.totals.billed} Effective=$${snapshot.totals.effective}`,
);
