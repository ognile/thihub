import {
  DEFAULT_SCHEMA_VERSION,
  DEFAULT_STYLE_PRESET,
  articleDocumentSchema,
  createEmptyArticleDocument,
  parseArticleDocument,
  safeParseArticleDocument,
  type ArticleDocumentV1,
  type StylePreset,
} from "@/lib/articles/schema";
import { createDocumentFromLegacyArticle, type LegacyArticleInput } from "@/lib/articles/backfill-parser";
import { renderArticleDocumentToHtml } from "@/lib/articles/renderer";
import { normalizeArticleDocumentOnly } from "@/lib/articles/normalize";

export interface StoredArticleShape extends LegacyArticleInput {
  contentBlocks?: unknown;
  contentSchemaVersion?: number | null;
  stylePreset?: string | null;
}

function normalizeStylePreset(stylePreset: unknown): StylePreset {
  return stylePreset === DEFAULT_STYLE_PRESET ? DEFAULT_STYLE_PRESET : DEFAULT_STYLE_PRESET;
}

export function resolveCanonicalDocument(article: StoredArticleShape): ArticleDocumentV1 {
  const candidate = {
    schemaVersion: article.contentSchemaVersion ?? DEFAULT_SCHEMA_VERSION,
    stylePreset: normalizeStylePreset(article.stylePreset),
    blocks: article.contentBlocks,
  };

  const parsedCandidate = safeParseArticleDocument(candidate);
  if (parsedCandidate.success && parsedCandidate.data.blocks.length > 0) {
    return normalizeArticleDocumentOnly(parsedCandidate.data);
  }

  return normalizeArticleDocumentOnly(
    createDocumentFromLegacyArticle({
      content: article.content,
      keyTakeaways: article.keyTakeaways,
      ctaTitle: article.ctaTitle,
      ctaText: article.ctaText,
      ctaDescription: article.ctaDescription,
    }),
  );
}

export function parseIncomingDocument(input: unknown): ArticleDocumentV1 {
  return parseArticleDocument(input);
}

export function createPersistedArticlePayload(document: ArticleDocumentV1) {
  const parsedDocument = normalizeArticleDocumentOnly(articleDocumentSchema.parse(document));

  return {
    content_blocks: parsedDocument.blocks,
    content_schema_version: parsedDocument.schemaVersion,
    style_preset: parsedDocument.stylePreset,
    content: renderArticleDocumentToHtml(parsedDocument),
  };
}

export function createDocumentFromBlocks(
  blocks: unknown,
  stylePreset: unknown = DEFAULT_STYLE_PRESET,
): ArticleDocumentV1 {
  return normalizeArticleDocumentOnly(
    articleDocumentSchema.parse({
      schemaVersion: DEFAULT_SCHEMA_VERSION,
      stylePreset: normalizeStylePreset(stylePreset),
      blocks,
    }),
  );
}

export function createEmptyPersistedPayload() {
  const document = createEmptyArticleDocument();
  return createPersistedArticlePayload(document);
}
