#!/usr/bin/env node
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadEnv();
loadEnv({ path: path.join(process.cwd(), '.env.local'), override: false });

const DEFAULT_STYLE_PRESET = 'core-polished';
const DEFAULT_SCHEMA_VERSION = 1;
const MAX_NEGATIVE_DELTA_RATIO = -0.2;
const LOW_SIGNAL_RECOVERY_TOKENS = new Set([
  'warning',
  'danger',
  'heart',
  'stomach',
  'check',
  'pill',
  'shield',
  'star',
  'info',
  'verified purchase',
]);
const MARKER_PARAGRAPH_TOKENS = [
  '[icons with text below]',
  '[icon with text below]',
  '[icon list]',
  'upload a relevant image in the editor',
];

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
  const allowLargeDelta = args['allow-large-delta'] === 'true' || args['allow-large-delta'] === '';

  return {
    mode,
    limit: Number.isFinite(limit) && limit > 0 ? limit : null,
    allowLargeDelta,
  };
}

function decodeHtmlEntities(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function stripTags(value) {
  return String(value ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function shouldDropRecoveredText(value) {
  const normalized = normalizeText(value);
  if (!normalized) return true;
  if (normalized.length < 12) return true;
  if (LOW_SIGNAL_RECOVERY_TOKENS.has(normalized)) return true;
  return false;
}

function cleanRecoveredText(value) {
  let cleaned = String(value ?? '').replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/^verified purchase[:\s-]*/i, '');
  cleaned = cleaned.replace(/^upload a relevant image in the editor[:\s-]*/i, '');
  return cleaned.replace(/\s+/g, ' ').trim();
}

function summarizeTextLength(blocks) {
  return blocks.reduce((total, block) => {
    switch (block.type) {
      case 'heading':
        return total + String(block.text ?? '').length;
      case 'paragraph':
        return total + stripTags(block.html ?? '').length;
      case 'blockquote':
        return total + String(block.text ?? '').length;
      case 'icon_list':
        return (
          total +
          (Array.isArray(block.items)
            ? block.items.reduce(
                (sum, item) =>
                  sum + String(item?.title ?? '').length + String(item?.text ?? '').length,
                0,
              )
            : 0)
        );
      case 'comparison_table':
        return (
          total +
          String(block.ourBrand ?? '').length +
          String(block.theirBrand ?? '').length +
          (Array.isArray(block.features)
            ? block.features.reduce((sum, item) => sum + String(item?.name ?? '').length, 0)
            : 0)
        );
      case 'timeline':
        return (
          total +
          String(block.title ?? '').length +
          (Array.isArray(block.weeks)
            ? block.weeks.reduce(
                (sum, item) =>
                  sum +
                  String(item?.title ?? '').length +
                  String(item?.description ?? '').length,
                0,
              )
            : 0)
        );
      case 'testimonial':
        return (
          total +
          String(block.helpedWith ?? '').length +
          String(block.title ?? '').length +
          String(block.body ?? '').length +
          String(block.author ?? '').length
        );
      case 'image':
        return total + String(block.searchQuery ?? '').length + String(block.alt ?? '').length;
      case 'takeaways':
        return (
          total +
          (Array.isArray(block.items)
            ? block.items.reduce(
                (sum, item) =>
                  sum + String(item?.title ?? '').length + String(item?.content ?? '').length,
                0,
              )
            : 0)
        );
      case 'inline_cta':
        return (
          total +
          String(block.title ?? '').length +
          String(block.buttonText ?? '').length +
          String(block.description ?? '').length
        );
      default:
        return total;
    }
  }, 0);
}

function isCorruptedParagraphHtml(html) {
  const lowered = String(html ?? '').toLowerCase();
  if (lowered.includes('<script')) return true;
  if (lowered.includes('<svg') || lowered.includes('</svg>')) return true;
  if (lowered.includes('</polygon>') || lowered.includes('viewbox=')) return true;

  const closingTagMatches = lowered.match(/<\/[a-z]+>/g);
  const openingTagMatches = lowered.match(/<[a-z]+(?:\s|>)/g);
  const closings = closingTagMatches ? closingTagMatches.length : 0;
  const openings = openingTagMatches ? openingTagMatches.length : 0;

  return closings > openings + 3;
}

function isMarkerParagraph(html) {
  const normalized = normalizeText(stripTags(html));
  return MARKER_PARAGRAPH_TOKENS.some((token) => normalized.includes(token));
}

function isIconSvgDataUrl(value) {
  return String(value ?? '').toLowerCase().startsWith('data:image/svg+xml;base64,');
}

function normalizeBlock(block, fallbackIdPrefix) {
  const normalized = { ...block };
  normalized.id = typeof normalized.id === 'string' && normalized.id.length > 0 ? normalized.id : `${fallbackIdPrefix}_${Math.random().toString(36).slice(2, 8)}`;
  normalized.hidden = Boolean(normalized.hidden);
  return normalized;
}

function normalizeBlocksWithMetrics(inputBlocks) {
  const source = Array.isArray(inputBlocks) ? inputBlocks : [];
  const blocks = source.map((block, index) => normalizeBlock(block, `blk_${index}`));
  const seenIds = new Set();
  const result = [];

  let droppedBlockCount = 0;
  let recoveredParagraphCount = 0;
  let pendingIconListTexts = null;
  let pendingTestimonialTitle = null;
  let pendingTestimonialBody = null;

  const beforeTextLength = summarizeTextLength(blocks);
  const beforeVisibleBlockCount = blocks.filter((block) => !block.hidden).length;

  const pushRecoveredParagraph = (text) => {
    const normalizedSource = cleanRecoveredText(stripTags(text));
    if (!normalizedSource || shouldDropRecoveredText(normalizedSource)) return;
    const previous = result[result.length - 1];
    if (previous?.type === 'paragraph' && normalizeText(stripTags(previous.html)) === normalizeText(normalizedSource)) {
      return;
    }
    result.push({
      id: `recovered_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      hidden: false,
      type: 'paragraph',
      html: decodeHtmlEntities(normalizedSource),
    });
    recoveredParagraphCount += 1;
  };

  for (const block of blocks) {
    let candidate = block;
    if (seenIds.has(candidate.id)) {
      candidate = {
        ...candidate,
        id: `${candidate.id}_${Math.random().toString(36).slice(2, 6)}`,
      };
    }
    seenIds.add(candidate.id);

    let skip = false;
    let recoveredText = '';

    if (candidate.type === 'paragraph') {
      const html = String(candidate.html ?? '');
      if (candidate.id.startsWith('recovered_')) {
        const cleanedRecovered = cleanRecoveredText(stripTags(html));
        if (shouldDropRecoveredText(cleanedRecovered)) {
          skip = true;
        } else {
          candidate = {
            ...candidate,
            html: decodeHtmlEntities(cleanedRecovered),
          };
        }
      } else if (!stripTags(html) || isMarkerParagraph(html)) {
        skip = true;
      } else if (isCorruptedParagraphHtml(html)) {
        skip = true;
        recoveredText = cleanRecoveredText(stripTags(html));
      }
    }

    if (candidate.type === 'image' && isIconSvgDataUrl(candidate.imageUrl)) {
      skip = true;
    }

    if (!skip && pendingIconListTexts) {
      if (candidate.type === 'paragraph') {
        const paragraphText = normalizeText(stripTags(candidate.html));
        if (pendingIconListTexts.has(paragraphText)) {
          skip = true;
        } else {
          pendingIconListTexts = null;
        }
      } else if (candidate.type === 'image' && isIconSvgDataUrl(candidate.imageUrl)) {
        skip = true;
      } else if (candidate.type !== 'image') {
        pendingIconListTexts = null;
      }
    }

    if (!skip && (pendingTestimonialTitle || pendingTestimonialBody)) {
      if (candidate.type === 'heading' && normalizeText(candidate.text) === pendingTestimonialTitle) {
        skip = true;
      } else if (
        candidate.type === 'paragraph' &&
        pendingTestimonialBody &&
        normalizeText(stripTags(candidate.html)) === pendingTestimonialBody
      ) {
        skip = true;
      } else {
        pendingTestimonialTitle = null;
        pendingTestimonialBody = null;
      }
    }

    if (skip) {
      droppedBlockCount += 1;
      if (recoveredText) pushRecoveredParagraph(recoveredText);
      continue;
    }

    if (candidate.type === 'icon_list') {
      const texts = Array.isArray(candidate.items)
        ? candidate.items
            .map((item) => normalizeText(item?.text))
            .filter(Boolean)
        : [];
      pendingIconListTexts = texts.length > 0 ? new Set(texts) : null;
    } else if (candidate.type !== 'image') {
      pendingIconListTexts = null;
    }

    if (candidate.type === 'testimonial') {
      pendingTestimonialTitle = normalizeText(candidate.title);
      pendingTestimonialBody = normalizeText(candidate.body);
    }

    const previous = result[result.length - 1];
    if (
      previous?.type === 'paragraph' &&
      candidate.type === 'paragraph' &&
      normalizeText(stripTags(previous.html)) === normalizeText(stripTags(candidate.html))
    ) {
      droppedBlockCount += 1;
      continue;
    }

    result.push(candidate);
  }

  let foundInlineCta = false;
  const deduped = result.filter((block) => {
    if (block.type !== 'inline_cta') return true;
    if (!foundInlineCta) {
      foundInlineCta = true;
      return true;
    }
    droppedBlockCount += 1;
    return false;
  });

  const afterTextLength = summarizeTextLength(deduped);
  const textDelta = afterTextLength - beforeTextLength;
  const textDeltaRatio = beforeTextLength > 0 ? textDelta / beforeTextLength : 0;

  return {
    blocks: deduped,
    metrics: {
      beforeBlockCount: blocks.length,
      afterBlockCount: deduped.length,
      droppedBlockCount,
      recoveredParagraphCount,
      beforeVisibleBlockCount,
      afterVisibleBlockCount: deduped.filter((block) => !block.hidden).length,
      beforeTextLength,
      afterTextLength,
      textDelta,
      textDeltaRatio,
    },
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderBlocksToHtml(blocks) {
  const visibleBlocks = (Array.isArray(blocks) ? blocks : []).filter((block) => !block.hidden);
  const parts = visibleBlocks.map((block) => {
    switch (block.type) {
      case 'heading':
        return `<h${block.level}>${escapeHtml(block.text)}</h${block.level}>`;
      case 'paragraph':
        return /^\s*<p[\s>]/i.test(String(block.html ?? '')) ? String(block.html) : `<p>${escapeHtml(block.html ?? '')}</p>`;
      case 'blockquote':
        return `<blockquote>${escapeHtml(block.text)}</blockquote>`;
      case 'icon_list':
        return `<div data-type="icon-list" data-items="${escapeHtml(JSON.stringify(block.items ?? []))}" data-columns="${Number(block.columns) || 2}"></div>`;
      case 'comparison_table':
        return `<div data-type="comparison-table" data-features="${escapeHtml(JSON.stringify(block.features ?? []))}" data-our-brand="${escapeHtml(block.ourBrand ?? 'Our Formula')}" data-their-brand="${escapeHtml(block.theirBrand ?? 'Generic Brands')}"></div>`;
      case 'timeline':
        return `<div data-type="timeline" data-title="${escapeHtml(block.title ?? 'Your Journey')}" data-weeks="${escapeHtml(JSON.stringify(block.weeks ?? []))}"></div>`;
      case 'testimonial':
        return `<div data-type="testimonial" data-helped-with="${escapeHtml(block.helpedWith ?? '')}" data-title="${escapeHtml(block.title ?? '')}" data-body="${escapeHtml(block.body ?? '')}" data-author="${escapeHtml(block.author ?? '')}" data-verified="${String(Boolean(block.verified))}"></div>`;
      case 'image':
        return `<div data-type="image-placeholder" data-search-query="${escapeHtml(block.searchQuery ?? '')}" data-image-url="${escapeHtml(block.imageUrl ?? '')}"></div>`;
      case 'takeaways':
        return `<div data-type="takeaways"><ul>${(block.items ?? []).map((item) => `<li><strong>${escapeHtml(item.title ?? '')}</strong> ${escapeHtml(item.content ?? '')}</li>`).join('')}</ul></div>`;
      case 'inline_cta':
        return `<div data-type="inline-cta" data-title="${escapeHtml(block.title ?? '')}" data-button-text="${escapeHtml(block.buttonText ?? '')}" data-description="${escapeHtml(block.description ?? '')}"></div>`;
      default:
        return '';
    }
  });
  return parts.filter(Boolean).join('\n');
}

async function main() {
  const { mode, limit, allowLargeDelta } = parseArgs(process.argv.slice(2));

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
    .select('id,slug,content_blocks,content_schema_version,style_preset')
    .order('created_at', { ascending: true });

  if (limit) {
    query = query.limit(limit);
  }

  const { data: rows, error } = await query;
  if (error) {
    console.error('Failed to read articles:', error.message);
    process.exit(1);
  }

  const articles = rows ?? [];
  const perArticle = [];
  const summary = {
    mode,
    total: articles.length,
    applied: 0,
    unchanged: 0,
    errors: 0,
    hardFailures: 0,
  };

  for (const article of articles) {
    try {
      const sourceBlocks = Array.isArray(article.content_blocks) ? article.content_blocks : [];
      const normalized = normalizeBlocksWithMetrics(sourceBlocks);

      const hardDeltaFailure =
        normalized.metrics.textDeltaRatio < MAX_NEGATIVE_DELTA_RATIO && !allowLargeDelta;

      const changed =
        JSON.stringify(sourceBlocks) !== JSON.stringify(normalized.blocks) ||
        article.content_schema_version !== DEFAULT_SCHEMA_VERSION ||
        article.style_preset !== DEFAULT_STYLE_PRESET;

      const itemReport = {
        slug: article.slug,
        changed,
        hardDeltaFailure,
        metrics: normalized.metrics,
      };
      perArticle.push(itemReport);

      if (hardDeltaFailure) {
        summary.hardFailures += 1;
      }

      if (!changed) {
        summary.unchanged += 1;
        console.log(`[skip] ${article.slug} unchanged`);
        continue;
      }

      if (mode === 'apply' && !hardDeltaFailure) {
        const rendered = renderBlocksToHtml(normalized.blocks);
        const { error: updateError } = await supabase
          .from('articles')
          .update({
            content_blocks: normalized.blocks,
            content_schema_version: DEFAULT_SCHEMA_VERSION,
            style_preset: DEFAULT_STYLE_PRESET,
            content: rendered,
            updated_at: new Date().toISOString(),
          })
          .eq('id', article.id);

        if (updateError) {
          throw updateError;
        }
      }

      summary.applied += 1;
      const ratioPct = `${(normalized.metrics.textDeltaRatio * 100).toFixed(2)}%`;
      console.log(`[ok] ${article.slug} changed=${changed} textDeltaRatio=${ratioPct}`);
    } catch (articleError) {
      summary.errors += 1;
      perArticle.push({
        slug: article.slug,
        changed: false,
        hardDeltaFailure: false,
        metrics: null,
        error: articleError instanceof Error ? articleError.message : String(articleError),
      });
      console.error(`[error] ${article.slug}:`, articleError instanceof Error ? articleError.message : articleError);
    }
  }

  const reportDir = path.join(process.cwd(), 'ops', 'reports');
  await mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `article-repair-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  const report = {
    generatedAt: new Date().toISOString(),
    mode,
    allowLargeDelta,
    threshold: MAX_NEGATIVE_DELTA_RATIO,
    summary,
    articles: perArticle,
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('\n[repair-summary]');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`report_path=${reportPath}`);

  if (summary.errors > 0 || summary.hardFailures > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Repair failed:', error);
  process.exit(1);
});
