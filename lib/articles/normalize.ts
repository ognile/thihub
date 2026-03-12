import {
  articleBlockSchema,
  articleDocumentSchema,
  createBlockId,
  type ArticleBlock,
  type ArticleDocumentV1,
  type InlineCtaBlock,
} from "@/lib/articles/schema";
import { stripTags } from "@/lib/articles/renderer";

const ICON_SVG_DATA_URL_PREFIX = "data:image/svg+xml;base64,";
const LOW_SIGNAL_RECOVERY_TOKENS = new Set([
  "warning",
  "danger",
  "heart",
  "stomach",
  "check",
  "pill",
  "shield",
  "star",
  "info",
  "verified purchase",
]);
const MARKER_PARAGRAPH_TOKENS = [
  "[icons with text below]",
  "[icon with text below]",
  "[icon list]",
  "upload a relevant image in the editor",
];

export interface NormalizationMetrics {
  beforeBlockCount: number;
  afterBlockCount: number;
  droppedBlockCount: number;
  recoveredParagraphCount: number;
  beforeVisibleBlockCount: number;
  afterVisibleBlockCount: number;
  beforeTextLength: number;
  afterTextLength: number;
  textDelta: number;
  textDeltaRatio: number;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function shouldDropRecoveredText(value: string): boolean {
  const normalized = normalizeText(value);
  if (!normalized) return true;
  if (normalized.length < 12) return true;
  if (LOW_SIGNAL_RECOVERY_TOKENS.has(normalized)) return true;
  return false;
}

function cleanRecoveredText(value: string): string {
  let cleaned = collapseWhitespace(value);
  cleaned = cleaned.replace(/^verified purchase[:\s-]*/i, "");
  cleaned = cleaned.replace(/^upload a relevant image in the editor[:\s-]*/i, "");
  return collapseWhitespace(cleaned);
}

function extractParagraphText(html: string): string {
  return normalizeText(stripTags(html));
}

function isEmptyParagraph(html: string): boolean {
  return extractParagraphText(html).length === 0;
}

function isIconSvgDataUrl(value: string | null): boolean {
  if (!value) return false;
  return value.toLowerCase().startsWith(ICON_SVG_DATA_URL_PREFIX);
}

function isMarkerParagraph(html: string): boolean {
  const normalized = extractParagraphText(html);
  return MARKER_PARAGRAPH_TOKENS.some((token) => normalized.includes(token));
}

function isCorruptedParagraphHtml(html: string): boolean {
  const lowered = html.toLowerCase();
  if (lowered.includes("<script")) return true;
  if (lowered.includes("<svg") || lowered.includes("</svg>")) return true;
  if (lowered.includes("</polygon>") || lowered.includes("viewbox=")) return true;

  const closingTagMatches = lowered.match(/<\/[a-z]+>/g);
  const openingTagMatches = lowered.match(/<[a-z]+(?:\s|>)/g);
  const closings = closingTagMatches ? closingTagMatches.length : 0;
  const openings = openingTagMatches ? openingTagMatches.length : 0;

  return closings > openings + 3;
}

function createRecoveredParagraph(text: string): ArticleBlock {
  return {
    id: createBlockId("recovered"),
    hidden: false,
    type: "paragraph",
    html: text,
  };
}

function dedupeInlineCta(blocks: ArticleBlock[]): ArticleBlock[] {
  let firstInlineCta: InlineCtaBlock | null = null;
  const next: ArticleBlock[] = [];

  blocks.forEach((block) => {
    if (block.type !== "inline_cta") {
      next.push(block);
      return;
    }

    if (!firstInlineCta) {
      firstInlineCta = block;
      next.push(block);
    }
  });

  return next;
}

function summarizeTextLength(blocks: ArticleBlock[]): number {
  return blocks.reduce((total, block) => {
    switch (block.type) {
      case "heading":
        return total + block.text.length;
      case "paragraph":
        return total + stripTags(block.html).length;
      case "blockquote":
        return total + block.text.length;
      case "icon_list":
        return (
          total +
          block.items.reduce((sum, item) => sum + item.title.length + item.text.length, 0)
        );
      case "comparison_table":
        return (
          total +
          block.ourBrand.length +
          block.theirBrand.length +
          block.features.reduce((sum, feature) => sum + feature.name.length, 0)
        );
      case "timeline":
        return (
          total +
          block.title.length +
          block.weeks.reduce((sum, week) => sum + week.title.length + week.description.length, 0)
        );
      case "testimonial":
        return total + block.helpedWith.length + block.title.length + block.body.length + block.author.length;
      case "image":
        return total + block.searchQuery.length + (block.alt ?? "").length;
      case "takeaways":
        return total + block.items.reduce((sum, item) => sum + item.title.length + item.content.length, 0);
      case "inline_cta":
        return total + block.title.length + block.buttonText.length + block.description.length;
      default:
        return total;
    }
  }, 0);
}

export function normalizeArticleBlocks(
  inputBlocks: ArticleBlock[],
): { blocks: ArticleBlock[]; metrics: NormalizationMetrics } {
  const normalizedBlocks: ArticleBlock[] = [];
  const seenIds = new Set<string>();
  let droppedBlockCount = 0;
  let recoveredParagraphCount = 0;

  let pendingIconListTexts: Set<string> | null = null;
  let pendingTestimonialTitle: string | null = null;
  let pendingTestimonialBody: string | null = null;

  const parsedInputBlocks = inputBlocks
    .map((block) => articleBlockSchema.safeParse(block))
    .filter((result): result is { success: true; data: ArticleBlock } => result.success)
    .map((result) => result.data);

  const beforeTextLength = summarizeTextLength(parsedInputBlocks);
  const beforeVisibleBlockCount = parsedInputBlocks.filter((block) => !block.hidden).length;

  const appendRecoveredParagraphIfNeeded = (sourceText: string) => {
    const normalizedSource = cleanRecoveredText(sourceText);
    if (!normalizedSource || shouldDropRecoveredText(normalizedSource)) return;

    const previous = normalizedBlocks[normalizedBlocks.length - 1];
    if (previous && previous.type === "paragraph") {
      const previousText = collapseWhitespace(stripTags(previous.html));
      if (normalizeText(previousText) === normalizeText(normalizedSource)) {
        return;
      }
    }

    normalizedBlocks.push(createRecoveredParagraph(normalizedSource));
    recoveredParagraphCount += 1;
  };

  for (const rawBlock of parsedInputBlocks) {
    let block = rawBlock;
    let skipBlock = false;
    let recoveredText: string | null = null;

    if (!seenIds.has(block.id)) {
      seenIds.add(block.id);
    } else {
      block = { ...block, id: createBlockId(block.type) };
    }

    if (block.type === "paragraph") {
      if (block.id.startsWith("recovered_")) {
        const cleanedRecovered = cleanRecoveredText(stripTags(block.html));
        if (shouldDropRecoveredText(cleanedRecovered)) {
          skipBlock = true;
        } else {
          block = {
            ...block,
            html: cleanedRecovered,
          };
        }
      } else if (isEmptyParagraph(block.html) || isMarkerParagraph(block.html)) {
        skipBlock = true;
      } else if (isCorruptedParagraphHtml(block.html)) {
        skipBlock = true;
        recoveredText = cleanRecoveredText(stripTags(block.html));
      }
    }

    if (block.type === "image" && isIconSvgDataUrl(block.imageUrl)) {
      skipBlock = true;
    }

    if (!skipBlock && pendingIconListTexts) {
      if (block.type === "paragraph") {
        const paragraphText = extractParagraphText(block.html);
        if (pendingIconListTexts.has(paragraphText)) {
          skipBlock = true;
        } else {
          pendingIconListTexts = null;
        }
      } else if (block.type === "image" && isIconSvgDataUrl(block.imageUrl)) {
        skipBlock = true;
      } else if (block.type !== "image") {
        pendingIconListTexts = null;
      }
    }

    if (!skipBlock && (pendingTestimonialTitle || pendingTestimonialBody)) {
      if (block.type === "heading" && pendingTestimonialTitle === normalizeText(block.text)) {
        skipBlock = true;
      } else if (
        block.type === "paragraph" &&
        pendingTestimonialBody &&
        pendingTestimonialBody === extractParagraphText(block.html)
      ) {
        skipBlock = true;
      } else {
        pendingTestimonialTitle = null;
        pendingTestimonialBody = null;
      }
    }

    if (skipBlock) {
      droppedBlockCount += 1;
      if (recoveredText) {
        appendRecoveredParagraphIfNeeded(recoveredText);
      }
      continue;
    }

    if (block.type === "icon_list") {
      const itemTexts = block.items
        .map((item) => normalizeText(item.text))
        .filter((value) => value.length > 0);
      pendingIconListTexts = itemTexts.length > 0 ? new Set(itemTexts) : null;
    } else if (block.type !== "image") {
      pendingIconListTexts = null;
    }

    if (block.type === "testimonial") {
      pendingTestimonialTitle = normalizeText(block.title);
      pendingTestimonialBody = normalizeText(block.body);
    }

    const previous = normalizedBlocks[normalizedBlocks.length - 1];
    if (
      previous &&
      previous.type === "paragraph" &&
      block.type === "paragraph" &&
      extractParagraphText(previous.html) === extractParagraphText(block.html)
    ) {
      droppedBlockCount += 1;
      continue;
    }

    normalizedBlocks.push(block);
  }

  const dedupedBlocks = dedupeInlineCta(normalizedBlocks);
  const afterTextLength = summarizeTextLength(dedupedBlocks);
  const afterVisibleBlockCount = dedupedBlocks.filter((block) => !block.hidden).length;
  const textDelta = afterTextLength - beforeTextLength;
  const textDeltaRatio = beforeTextLength > 0 ? textDelta / beforeTextLength : 0;

  return {
    blocks: dedupedBlocks,
    metrics: {
      beforeBlockCount: parsedInputBlocks.length,
      afterBlockCount: dedupedBlocks.length,
      droppedBlockCount,
      recoveredParagraphCount,
      beforeVisibleBlockCount,
      afterVisibleBlockCount,
      beforeTextLength,
      afterTextLength,
      textDelta,
      textDeltaRatio,
    },
  };
}

export function normalizeArticleDocument(
  input: ArticleDocumentV1,
): { document: ArticleDocumentV1; metrics: NormalizationMetrics } {
  const { blocks, metrics } = normalizeArticleBlocks(input.blocks);
  return {
    document: articleDocumentSchema.parse({
      ...input,
      blocks,
    }),
    metrics,
  };
}

export function normalizeArticleDocumentOnly(input: ArticleDocumentV1): ArticleDocumentV1 {
  return normalizeArticleDocument(input).document;
}
