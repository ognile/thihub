#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";

const SNAPSHOT_DIR = process.env.USAGE_SNAPSHOT_DIR ?? path.resolve("ops/usage-snapshots");
const INCLUDED_ALLOCATION_USD = Number(process.env.INCLUDED_ALLOCATION_USD ?? 20);
const ALERT_THRESHOLD_PCT = Number(process.env.USAGE_ALERT_THRESHOLD_PCT ?? 80);

function assertFiniteNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const files = await fs
  .readdir(SNAPSHOT_DIR)
  .then((entries) => entries.filter((entry) => entry.endsWith(".json")).sort())
  .catch(() => []);

if (files.length === 0) {
  throw new Error(`No snapshot files found in ${SNAPSHOT_DIR}.`);
}

const latestFile = files[files.length - 1];
const latestPath = path.join(SNAPSHOT_DIR, latestFile);
const snapshot = JSON.parse(await fs.readFile(latestPath, "utf8"));

const periodStart = Date.parse(snapshot?.billingPeriod?.start ?? "");
const periodEnd = Date.parse(snapshot?.billingPeriod?.end ?? "");
const now = Date.parse(snapshot?.billingPeriod?.now ?? snapshot?.generatedAt ?? "");
const effective = assertFiniteNumber(snapshot?.totals?.effective, 0);
const usageEffective = Array.isArray(snapshot?.services)
  ? snapshot.services
      .filter((service) => service?.name !== "Pro")
      .reduce((total, service) => total + assertFiniteNumber(service?.effective, 0), 0)
  : effective;
const includedAllocation = assertFiniteNumber(
  snapshot?.includedAllocationUsd ?? INCLUDED_ALLOCATION_USD,
  INCLUDED_ALLOCATION_USD,
);

if (!Number.isFinite(periodStart) || !Number.isFinite(periodEnd) || !Number.isFinite(now)) {
  throw new Error(`Snapshot ${latestPath} has invalid billing period timestamps.`);
}

const dayMs = 24 * 60 * 60 * 1000;
const elapsedDays = Math.max((now - periodStart) / dayMs, 1 / 24);
const periodDays = Math.max((periodEnd - periodStart) / dayMs, 1);
const projectedEffective = (usageEffective / elapsedDays) * periodDays;
const alertThresholdUsd = includedAllocation * (ALERT_THRESHOLD_PCT / 100);
const currentUtilizationPct = (usageEffective / includedAllocation) * 100;
const projectedUtilizationPct = (projectedEffective / includedAllocation) * 100;

const round = (value) => Number(value.toFixed(2));

console.log(`Latest snapshot: ${latestPath}`);
console.log(`Effective spend to date (all services): $${round(effective)}`);
console.log(`Effective usage to date (excluding plan fees): $${round(usageEffective)}`);
console.log(`Included allocation: $${round(includedAllocation)}`);
console.log(`Current utilization: ${round(currentUtilizationPct)}%`);
console.log(`Projected utilization: ${round(projectedUtilizationPct)}%`);
console.log(`Alert threshold: ${round(ALERT_THRESHOLD_PCT)}% ($${round(alertThresholdUsd)})`);

if (projectedEffective >= alertThresholdUsd) {
  console.error(
    `Projected effective spend ($${round(projectedEffective)}) is above alert threshold ($${round(
      alertThresholdUsd,
    )}).`,
  );
  process.exit(1);
}

console.log("Usage burn check passed.");
