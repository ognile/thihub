import {
  DEFAULT_SCHEMA_VERSION,
  DEFAULT_STYLE_PRESET,
  articleBlockSchema,
  articleDocumentSchema,
  createBlockId,
  type ArticleBlock,
  type ArticleDocumentV1,
  type TakeawayItem,
} from "@/lib/articles/schema";
import { sanitizeInlineHtml, stripTags } from "@/lib/articles/renderer";

export interface LegacyArticleInput {
  content?: string | null;
  keyTakeaways?: unknown;
  ctaTitle?: string | null;
  ctaText?: string | null;
  ctaDescription?: string | null;
}

const TOKEN_REGEX =
  /<div[^>]*data-type=(?:"|')(?:icon-list|comparison-table|timeline|testimonial|image-placeholder|takeaways|inline-cta)(?:"|')[^>]*>(?:[\s\S]*?<\/div>)?|<h[23][^>]*>[\s\S]*?<\/h[23]>|<blockquote[^>]*>[\s\S]*?<\/blockquote>|<p[^>]*>[\s\S]*?<\/p>|<img[^>]*>/gi;

const HTML_ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

function decodeHtmlEntities(value: string): string {
  let decoded = value;
  Object.entries(HTML_ENTITY_MAP).forEach(([entity, replacement]) => {
    decoded = decoded.split(entity).join(replacement);
  });
  return decoded;
}

function parseAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attributeRegex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

  let match = attributeRegex.exec(tag);
  while (match) {
    const key = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? "";
    attributes[key] = decodeHtmlEntities(value);
    match = attributeRegex.exec(tag);
  }

  return attributes;
}

function extractInnerHtml(tag: string): string {
  const start = tag.indexOf(">");
  const end = tag.lastIndexOf("<");
  if (start === -1 || end === -1 || end <= start) {
    return "";
  }
  return tag.slice(start + 1, end).trim();
}

function normalizeTakeaways(value: unknown): TakeawayItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as { title?: unknown; content?: unknown };
      if (typeof candidate.title !== "string" || typeof candidate.content !== "string") {
        return null;
      }

      return {
        title: candidate.title,
        content: candidate.content,
      };
    })
    .filter((item): item is TakeawayItem => item !== null);
}

function parseLegacyHtmlContent(content: string): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];

  const tokens = content.match(TOKEN_REGEX) ?? [];

  tokens.forEach((token) => {
    const attrs = parseAttributes(token);
    const lowerToken = token.toLowerCase();

    if (lowerToken.startsWith("<h2") || lowerToken.startsWith("<h3")) {
      const level = lowerToken.startsWith("<h3") ? 3 : 2;
      const text = stripTags(extractInnerHtml(token));
      blocks.push({ id: createBlockId("heading"), hidden: false, type: "heading", level, text });
      return;
    }

    if (lowerToken.startsWith("<blockquote")) {
      blocks.push({
        id: createBlockId("quote"),
        hidden: false,
        type: "blockquote",
        text: stripTags(extractInnerHtml(token)),
      });
      return;
    }

    if (lowerToken.startsWith("<p")) {
      blocks.push({
        id: createBlockId("paragraph"),
        hidden: false,
        type: "paragraph",
        html: sanitizeInlineHtml(extractInnerHtml(token)),
      });
      return;
    }

    if (lowerToken.startsWith("<img")) {
      const imageUrl = attrs.src ?? "";
      blocks.push({
        id: createBlockId("image"),
        hidden: false,
        type: "image",
        searchQuery: attrs.alt ?? "article image",
        imageUrl: imageUrl || null,
        alt: attrs.alt ?? null,
      });
      return;
    }

    const dataType = attrs["data-type"];
    if (!dataType) {
      return;
    }

    if (dataType === "icon-list") {
      const parsedItems = JSON.parse(attrs["data-items"] ?? "[]") as unknown;
      const columns = Number.parseInt(attrs["data-columns"] ?? "2", 10);
      blocks.push({
        id: createBlockId("icon"),
        hidden: false,
        type: "icon_list",
        columns: columns === 1 || columns === 3 ? columns : 2,
        items: Array.isArray(parsedItems)
          ? parsedItems
              .map((item) => {
                if (!item || typeof item !== "object") return null;
                const candidate = item as { icon?: unknown; title?: unknown; text?: unknown };
                return {
                  icon: typeof candidate.icon === "string" ? candidate.icon : "check",
                  title: typeof candidate.title === "string" ? candidate.title : "",
                  text: typeof candidate.text === "string" ? candidate.text : "",
                };
              })
              .filter((item): item is { icon: string; title: string; text: string } => item !== null)
          : [],
      });
      return;
    }

    if (dataType === "comparison-table") {
      const parsedFeatures = JSON.parse(attrs["data-features"] ?? "[]") as unknown;
      blocks.push({
        id: createBlockId("compare"),
        hidden: false,
        type: "comparison_table",
        ourBrand: attrs["data-our-brand"] ?? "Our Formula",
        theirBrand: attrs["data-their-brand"] ?? "Generic Brands",
        features: Array.isArray(parsedFeatures)
          ? parsedFeatures
              .map((feature) => {
                if (!feature || typeof feature !== "object") return null;
                const candidate = feature as { name?: unknown; us?: unknown; them?: unknown };
                return {
                  name: typeof candidate.name === "string" ? candidate.name : "",
                  us: Boolean(candidate.us),
                  them: Boolean(candidate.them),
                };
              })
              .filter((item): item is { name: string; us: boolean; them: boolean } => item !== null)
          : [],
      });
      return;
    }

    if (dataType === "timeline") {
      const parsedWeeks = JSON.parse(attrs["data-weeks"] ?? "[]") as unknown;
      blocks.push({
        id: createBlockId("timeline"),
        hidden: false,
        type: "timeline",
        title: attrs["data-title"] ?? "Your Journey",
        weeks: Array.isArray(parsedWeeks)
          ? parsedWeeks
              .map((week) => {
                if (!week || typeof week !== "object") return null;
                const candidate = week as { week?: unknown; title?: unknown; description?: unknown };
                const parsedWeek = Number(candidate.week);
                return {
                  week: Number.isFinite(parsedWeek) && parsedWeek > 0 ? parsedWeek : 1,
                  title: typeof candidate.title === "string" ? candidate.title : "",
                  description: typeof candidate.description === "string" ? candidate.description : "",
                };
              })
              .filter((item): item is { week: number; title: string; description: string } => item !== null)
          : [],
      });
      return;
    }

    if (dataType === "testimonial") {
      blocks.push({
        id: createBlockId("testimonial"),
        hidden: false,
        type: "testimonial",
        helpedWith: attrs["data-helped-with"] ?? "Overall Wellness",
        title: attrs["data-title"] ?? "",
        body: attrs["data-body"] ?? "",
        author: attrs["data-author"] ?? "Anonymous",
        verified: attrs["data-verified"] !== "false",
      });
      return;
    }

    if (dataType === "image-placeholder") {
      const imageUrl = attrs["data-image-url"] ?? "";
      blocks.push({
        id: createBlockId("image"),
        hidden: false,
        type: "image",
        searchQuery: attrs["data-search-query"] ?? "article image",
        imageUrl: imageUrl || null,
        alt: null,
      });
      return;
    }

    if (dataType === "takeaways") {
      const listMatches = extractInnerHtml(token)
        .match(/<li[^>]*>[\s\S]*?<\/li>/gi)
        ?.map((item) => stripTags(item))
        .filter(Boolean);
      blocks.push({
        id: createBlockId("takeaways"),
        hidden: false,
        type: "takeaways",
        items: (listMatches ?? []).map((item) => ({ title: item, content: "" })),
      });
      return;
    }

    if (dataType === "inline-cta") {
      blocks.push({
        id: createBlockId("cta"),
        hidden: false,
        type: "inline_cta",
        title: attrs["data-title"] ?? "Curious about the science?",
        buttonText: attrs["data-button-text"] ?? "Read the Clinical Study »",
        description: attrs["data-description"] ?? "Secure, verified link to official research.",
      });
    }
  });

  if (blocks.length === 0) {
    const text = stripTags(content);
    if (text) {
      blocks.push({
        id: createBlockId("paragraph"),
        hidden: false,
        type: "paragraph",
        html: sanitizeInlineHtml(escapeParagraphText(text)),
      });
    }
  }

  return blocks;
}

function escapeParagraphText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function createDocumentFromLegacyArticle(input: LegacyArticleInput): ArticleDocumentV1 {
  const blocks = parseLegacyHtmlContent(input.content ?? "");

  const takeaways = normalizeTakeaways(input.keyTakeaways);
  if (takeaways.length > 0 && !blocks.some((block) => block.type === "takeaways")) {
    blocks.unshift({
      id: createBlockId("takeaways"),
      hidden: false,
      type: "takeaways",
      items: takeaways,
    });
  }

  const hasInlineCta = blocks.some((block) => block.type === "inline_cta");
  if (!hasInlineCta) {
    blocks.push({
      id: createBlockId("cta"),
      hidden: false,
      type: "inline_cta",
      title: input.ctaTitle ?? "Curious about the science?",
      buttonText: input.ctaText ?? "Read the Clinical Study »",
      description: input.ctaDescription ?? "Secure, verified link to official research.",
    });
  }

  const normalizedBlocks = blocks
    .map((block) => articleBlockSchema.safeParse(block))
    .filter((result): result is { success: true; data: ArticleBlock } => result.success)
    .map((result) => result.data);

  return articleDocumentSchema.parse({
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    stylePreset: DEFAULT_STYLE_PRESET,
    blocks: normalizedBlocks,
  });
}
