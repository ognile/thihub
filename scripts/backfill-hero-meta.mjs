#!/usr/bin/env node
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_HERO_META = {
  reportLabel: 'Investigative Report',
  factCheckedLabel: 'Fact Checked',
  medicallyReviewedLabel: 'Medically Reviewed',
  readTimeMode: 'auto',
  readTimeOverrideMinutes: null,
};

loadEnv();
loadEnv({ path: path.join(process.cwd(), '.env.local'), override: false });

function parseArgs(argv) {
  const args = Object.fromEntries(
    argv
      .filter((token) => token.startsWith('--'))
      .map((token) => {
        const [key, value = ''] = token.replace(/^--/, '').split('=');
        return [key, value];
      }),
  );

  const mode = args.mode === 'apply' ? 'apply' : 'dry-run';
  const limit = args.limit ? Number.parseInt(args.limit, 10) : null;

  return {
    mode,
    limit: Number.isFinite(limit) && limit > 0 ? limit : null,
  };
}

function normalizeHeroMeta(input) {
  const source = input && typeof input === 'object' ? input : {};
  const reportLabel =
    typeof source.reportLabel === 'string'
      ? source.reportLabel
      : DEFAULT_HERO_META.reportLabel;
  const factCheckedLabel =
    typeof source.factCheckedLabel === 'string'
      ? source.factCheckedLabel
      : DEFAULT_HERO_META.factCheckedLabel;
  const medicallyReviewedLabel =
    typeof source.medicallyReviewedLabel === 'string'
      ? source.medicallyReviewedLabel
      : DEFAULT_HERO_META.medicallyReviewedLabel;
  const readTimeMode =
    source.readTimeMode === 'override' ? 'override' : DEFAULT_HERO_META.readTimeMode;

  const rawOverride = source.readTimeOverrideMinutes;
  const parsedOverride = Number.isFinite(Number(rawOverride))
    ? Math.floor(Number(rawOverride))
    : null;
  const readTimeOverrideMinutes =
    readTimeMode === 'override' && parsedOverride && parsedOverride > 0
      ? parsedOverride
      : null;

  return {
    reportLabel,
    factCheckedLabel,
    medicallyReviewedLabel,
    readTimeMode,
    readTimeOverrideMinutes,
  };
}

function hasEquivalentHeroMeta(input, normalized) {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const keys = Object.keys(input);
  const expectedKeys = [
    'reportLabel',
    'factCheckedLabel',
    'medicallyReviewedLabel',
    'readTimeMode',
    'readTimeOverrideMinutes',
  ];

  if (
    keys.length !== expectedKeys.length ||
    expectedKeys.some((key) => !keys.includes(key))
  ) {
    return false;
  }

  return (
    input.reportLabel === normalized.reportLabel &&
    input.factCheckedLabel === normalized.factCheckedLabel &&
    input.medicallyReviewedLabel === normalized.medicallyReviewedLabel &&
    input.readTimeMode === normalized.readTimeMode &&
    input.readTimeOverrideMinutes === normalized.readTimeOverrideMinutes
  );
}

function isMissingHeroColumnsError(error) {
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
  return message.includes('hero_meta') || message.includes('author_image');
}

async function main() {
  const { mode, limit } = parseArgs(process.argv.slice(2));

  const supabaseUrl = process.env.THIHUB_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.THIHUB_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('Missing required env key: THIHUB_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
    process.exit(1);
  }

  if (!serviceRoleKey) {
    console.error('Missing required env key: THIHUB_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  let query = supabase
    .from('articles')
    .select('id,slug,hero_meta,author_image')
    .order('created_at', { ascending: true });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingHeroColumnsError(error)) {
      console.error(
        'Hero metadata columns are missing. Run migration 20260218000000_hero_meta_parity.sql first.',
      );
      process.exit(1);
    }

    console.error('Failed to read articles:', error.message);
    process.exit(1);
  }

  const rows = data ?? [];
  const summary = {
    mode,
    total: rows.length,
    changed: 0,
    unchanged: 0,
    applied: 0,
    errors: 0,
  };
  const perArticle = [];

  for (const row of rows) {
    try {
      const normalizedHeroMeta = normalizeHeroMeta(row.hero_meta);
      const heroMetaChanged = !hasEquivalentHeroMeta(row.hero_meta, normalizedHeroMeta);
      const authorImageChanged = typeof row.author_image === 'undefined';
      const changed = heroMetaChanged || authorImageChanged;

      if (!changed) {
        summary.unchanged += 1;
      } else {
        summary.changed += 1;
      }

      perArticle.push({
        slug: row.slug,
        changed,
        heroMetaChanged,
        authorImageChanged,
      });

      if (!changed) {
        console.log(`[skip] ${row.slug} unchanged`);
        continue;
      }

      if (mode === 'apply') {
        const payload = {
          hero_meta: normalizedHeroMeta,
          author_image: typeof row.author_image === 'undefined' ? null : row.author_image,
          updated_at: new Date().toISOString(),
        };
        const { error: updateError } = await supabase
          .from('articles')
          .update(payload)
          .eq('id', row.id);

        if (updateError) {
          throw updateError;
        }

        summary.applied += 1;
      }

      console.log(`[ok] ${row.slug} changed=${changed}`);
    } catch (articleError) {
      summary.errors += 1;
      perArticle.push({
        slug: row.slug,
        changed: false,
        heroMetaChanged: false,
        authorImageChanged: false,
        error: articleError instanceof Error ? articleError.message : String(articleError),
      });
      console.error(`[error] ${row.slug}:`, articleError instanceof Error ? articleError.message : articleError);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    articles: perArticle,
  };

  const reportDir = path.join(process.cwd(), 'ops', 'reports');
  await mkdir(reportDir, { recursive: true });
  const reportPath = path.join(
    reportDir,
    `hero-meta-backfill-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  );
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('\n[hero-meta-backfill-summary]');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`report_path=${reportPath}`);

  if (summary.errors > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Hero meta backfill failed:', error);
  process.exit(1);
});
