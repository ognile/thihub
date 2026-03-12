#!/usr/bin/env node
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_STYLE_PRESET = 'core-polished';
const DEFAULT_SCHEMA_VERSION = 1;

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
  return { mode, limit: Number.isFinite(limit) && limit > 0 ? limit : null };
}

function isMissingCanonicalColumnsError(error) {
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
  return (
    message.includes('content_blocks') ||
    message.includes('content_schema_version') ||
    message.includes('style_preset')
  );
}

function isMissingLegacyColumnsError(error) {
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
  return (
    message.includes('key_takeaways') ||
    message.includes('cta_title') ||
    message.includes('cta_text') ||
    message.includes('cta_description')
  );
}

function createBlockId(prefix, index) {
  return `${prefix}_${Date.now().toString(36)}_${index.toString(36)}`;
}

function decodeHtmlEntities(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function sanitizeHtml(value) {
  return String(value ?? '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stripTags(value) {
  return String(value ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseAttributes(token) {
  const result = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

  let match = re.exec(token);
  while (match) {
    const key = match[1].toLowerCase();
    const value = decodeHtmlEntities(match[2] ?? match[3] ?? '');
    result[key] = value;
    match = re.exec(token);
  }

  return result;
}

function extractInnerHtml(tag) {
  const start = tag.indexOf('>');
  const end = tag.lastIndexOf('<');
  if (start === -1 || end === -1 || end <= start) return '';
  return tag.slice(start + 1, end).trim();
}

const TOKEN_REGEX =
  /<div[^>]*data-type=(?:"|')(?:icon-list|comparison-table|timeline|testimonial|image-placeholder|takeaways|inline-cta)(?:"|')[^>]*>(?:[\s\S]*?<\/div>)?|<h[23][^>]*>[\s\S]*?<\/h[23]>|<blockquote[^>]*>[\s\S]*?<\/blockquote>|<p[^>]*>[\s\S]*?<\/p>|<img[^>]*>/gi;

function parseLegacyContent(content) {
  const blocks = [];
  const tokens = String(content ?? '').match(TOKEN_REGEX) ?? [];

  tokens.forEach((token, index) => {
    const attrs = parseAttributes(token);
    const lower = token.toLowerCase();

    if (lower.startsWith('<h2') || lower.startsWith('<h3')) {
      blocks.push({
        id: createBlockId('heading', index),
        type: 'heading',
        level: lower.startsWith('<h3') ? 3 : 2,
        text: stripTags(extractInnerHtml(token)),
      });
      return;
    }

    if (lower.startsWith('<blockquote')) {
      blocks.push({
        id: createBlockId('quote', index),
        type: 'blockquote',
        text: stripTags(extractInnerHtml(token)),
      });
      return;
    }

    if (lower.startsWith('<p')) {
      blocks.push({
        id: createBlockId('paragraph', index),
        type: 'paragraph',
        html: sanitizeHtml(extractInnerHtml(token)),
      });
      return;
    }

    if (lower.startsWith('<img')) {
      blocks.push({
        id: createBlockId('image', index),
        type: 'image',
        searchQuery: attrs.alt ?? 'article image',
        imageUrl: attrs.src || null,
        alt: attrs.alt ?? null,
      });
      return;
    }

    const type = attrs['data-type'];
    if (!type) return;

    if (type === 'icon-list') {
      let items = [];
      try {
        const parsed = JSON.parse(attrs['data-items'] ?? '[]');
        if (Array.isArray(parsed)) {
          items = parsed.map((item) => ({
            icon: typeof item?.icon === 'string' ? item.icon : 'check',
            title: typeof item?.title === 'string' ? item.title : '',
            text: typeof item?.text === 'string' ? item.text : '',
          }));
        }
      } catch {
        items = [];
      }

      const parsedColumns = Number.parseInt(attrs['data-columns'] ?? '2', 10);
      const columns = parsedColumns === 1 || parsedColumns === 3 ? parsedColumns : 2;

      blocks.push({
        id: createBlockId('icon', index),
        type: 'icon_list',
        columns,
        items,
      });
      return;
    }

    if (type === 'comparison-table') {
      let features = [];
      try {
        const parsed = JSON.parse(attrs['data-features'] ?? '[]');
        if (Array.isArray(parsed)) {
          features = parsed.map((feature) => ({
            name: typeof feature?.name === 'string' ? feature.name : '',
            us: Boolean(feature?.us),
            them: Boolean(feature?.them),
          }));
        }
      } catch {
        features = [];
      }

      blocks.push({
        id: createBlockId('comparison', index),
        type: 'comparison_table',
        ourBrand: attrs['data-our-brand'] ?? 'Our Formula',
        theirBrand: attrs['data-their-brand'] ?? 'Generic Brands',
        features,
      });
      return;
    }

    if (type === 'timeline') {
      let weeks = [];
      try {
        const parsed = JSON.parse(attrs['data-weeks'] ?? '[]');
        if (Array.isArray(parsed)) {
          weeks = parsed.map((week) => ({
            week: Number.isFinite(Number(week?.week)) ? Math.max(1, Number(week.week)) : 1,
            title: typeof week?.title === 'string' ? week.title : '',
            description: typeof week?.description === 'string' ? week.description : '',
          }));
        }
      } catch {
        weeks = [];
      }

      blocks.push({
        id: createBlockId('timeline', index),
        type: 'timeline',
        title: attrs['data-title'] ?? 'Your Journey',
        weeks,
      });
      return;
    }

    if (type === 'testimonial') {
      blocks.push({
        id: createBlockId('testimonial', index),
        type: 'testimonial',
        helpedWith: attrs['data-helped-with'] ?? 'Overall Wellness',
        title: attrs['data-title'] ?? '',
        body: attrs['data-body'] ?? '',
        author: attrs['data-author'] ?? 'Anonymous',
        verified: attrs['data-verified'] !== 'false',
      });
      return;
    }

    if (type === 'image-placeholder') {
      blocks.push({
        id: createBlockId('image', index),
        type: 'image',
        searchQuery: attrs['data-search-query'] ?? 'article image',
        imageUrl: attrs['data-image-url'] || null,
        alt: null,
      });
      return;
    }
  });

  if (blocks.length === 0) {
    const text = stripTags(content);
    if (text) {
      blocks.push({
        id: createBlockId('paragraph', 0),
        type: 'paragraph',
        html: escapeHtml(text),
      });
    }
  }

  return blocks;
}

function normalizeTakeaways(input) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      return {
        title: typeof item.title === 'string' ? item.title : '',
        content: typeof item.content === 'string' ? item.content : '',
      };
    })
    .filter(Boolean);
}

function ensureTakeawaysAndCta(blocks, article) {
  const next = [...blocks];

  const takeaways = normalizeTakeaways(article.key_takeaways);
  if (takeaways.length > 0 && !next.some((block) => block.type === 'takeaways')) {
    next.unshift({
      id: createBlockId('takeaways', next.length + 1),
      type: 'takeaways',
      items: takeaways,
    });
  }

  if (!next.some((block) => block.type === 'inline_cta')) {
    next.push({
      id: createBlockId('cta', next.length + 1),
      type: 'inline_cta',
      title: article.cta_title || 'Curious about the science?',
      buttonText: article.cta_text || 'Read the Clinical Study »',
      description: article.cta_description || 'Secure, verified link to official research.',
    });
  }

  return next;
}

function renderBlockToHtml(block) {
  switch (block.type) {
    case 'heading':
      return `<h${block.level}>${escapeHtml(block.text)}</h${block.level}>`;
    case 'paragraph':
      return /^\s*<p/i.test(block.html) ? block.html : `<p>${sanitizeHtml(block.html)}</p>`;
    case 'blockquote':
      return `<blockquote>${escapeHtml(block.text)}</blockquote>`;
    case 'icon_list':
      return `<div data-type=\"icon-list\" data-items=\"${escapeHtml(JSON.stringify(block.items))}\" data-columns=\"${block.columns}\"></div>`;
    case 'comparison_table':
      return `<div data-type=\"comparison-table\" data-features=\"${escapeHtml(JSON.stringify(block.features))}\" data-our-brand=\"${escapeHtml(block.ourBrand)}\" data-their-brand=\"${escapeHtml(block.theirBrand)}\"></div>`;
    case 'timeline':
      return `<div data-type=\"timeline\" data-title=\"${escapeHtml(block.title)}\" data-weeks=\"${escapeHtml(JSON.stringify(block.weeks))}\"></div>`;
    case 'testimonial':
      return `<div data-type=\"testimonial\" data-helped-with=\"${escapeHtml(block.helpedWith)}\" data-title=\"${escapeHtml(block.title)}\" data-body=\"${escapeHtml(block.body)}\" data-author=\"${escapeHtml(block.author)}\" data-verified=\"${String(block.verified)}\"></div>`;
    case 'image':
      return `<div data-type=\"image-placeholder\" data-search-query=\"${escapeHtml(block.searchQuery)}\" data-image-url=\"${escapeHtml(block.imageUrl || '')}\"></div>`;
    case 'takeaways': {
      const rows = block.items
        .map((item) => `<li><strong>${escapeHtml(item.title)}</strong> ${escapeHtml(item.content)}</li>`)
        .join('');
      return `<div data-type=\"takeaways\"><ul>${rows}</ul></div>`;
    }
    case 'inline_cta':
      return `<div data-type=\"inline-cta\" data-title=\"${escapeHtml(block.title)}\" data-button-text=\"${escapeHtml(block.buttonText)}\" data-description=\"${escapeHtml(block.description)}\"></div>`;
    default:
      return '';
  }
}

function renderBlocksToHtml(blocks) {
  return blocks.map((block) => renderBlockToHtml(block)).join('\n');
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
  let canonicalColumnsAvailable = true;
  let legacyColumnsAvailable = true;
  let query = supabase
    .from('articles')
    .select('id,slug,content,key_takeaways,cta_title,cta_text,cta_description,content_blocks,content_schema_version,style_preset')
    .order('created_at', { ascending: true });

  if (limit) {
    query = query.limit(limit);
  }

  let { data: articles, error } = await query;

  if (error && isMissingCanonicalColumnsError(error)) {
    canonicalColumnsAvailable = false;
    if (mode === 'apply') {
      console.error(
        'Cannot run --mode=apply before canonical columns exist. Run the additive schema migration first.',
      );
      process.exit(1);
    }

    console.warn(
      '[backfill] canonical columns are missing; running legacy-compatible dry-run read only.',
    );

    let fallbackQuery = supabase
      .from('articles')
      .select('id,slug,content,key_takeaways,cta_title,cta_text,cta_description')
      .order('created_at', { ascending: true });

    if (limit) {
      fallbackQuery = fallbackQuery.limit(limit);
    }

    const fallback = await fallbackQuery;
    articles = fallback.data;
    error = fallback.error;
  }

  if (error && isMissingLegacyColumnsError(error)) {
    legacyColumnsAvailable = false;
    let fallbackQuery = supabase
      .from('articles')
      .select('id,slug,content,content_blocks,content_schema_version,style_preset')
      .order('created_at', { ascending: true });

    if (limit) {
      fallbackQuery = fallbackQuery.limit(limit);
    }

    const fallback = await fallbackQuery;
    articles = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('Failed to read articles:', error.message);
    process.exit(1);
  }

  const rows = articles ?? [];
  const summary = {
    total: rows.length,
    canonicalColumnsAvailable,
    legacyColumnsAvailable,
    skippedAlreadyCanonical: 0,
    converted: 0,
    errors: 0,
  };

  console.log(`\n[backfill] mode=${mode} total=${rows.length}`);

  for (const row of rows) {
    try {
      const alreadyCanonical =
        canonicalColumnsAvailable &&
        Array.isArray(row.content_blocks) &&
        row.content_blocks.length > 0 &&
        row.content_schema_version === DEFAULT_SCHEMA_VERSION &&
        row.style_preset === DEFAULT_STYLE_PRESET;

      if (alreadyCanonical) {
        summary.skippedAlreadyCanonical += 1;
        console.log(`[skip] ${row.slug} already canonical`);
        continue;
      }

      const parsedBlocks = ensureTakeawaysAndCta(parseLegacyContent(row.content ?? ''), row);
      const renderedHtml = renderBlocksToHtml(parsedBlocks);

      if (mode === 'apply') {
        const { error: updateError } = await supabase
          .from('articles')
          .update({
            content_blocks: parsedBlocks,
            content_schema_version: DEFAULT_SCHEMA_VERSION,
            style_preset: DEFAULT_STYLE_PRESET,
            content: renderedHtml,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id);

        if (updateError) {
          throw updateError;
        }
      }

      summary.converted += 1;
      console.log(`[ok] ${row.slug} blocks=${parsedBlocks.length}`);
    } catch (rowError) {
      summary.errors += 1;
      console.error(`[error] ${row.slug}:`, rowError instanceof Error ? rowError.message : rowError);
    }
  }

  console.log('\n[backfill-summary]');
  console.log(JSON.stringify(summary, null, 2));

  if (summary.errors > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
