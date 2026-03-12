import type { ArticleBlock, ArticleDocumentV1, InlineCtaBlock, TakeawayItem } from "@/lib/articles/schema";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

export function sanitizeInlineHtml(value: string): string {
  if (!value) return "";

  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*("|')/gi, "$1=\"#\"");
}

function renderTakeawayItems(items: TakeawayItem[]): string {
  if (items.length === 0) {
    return "";
  }

  const list = items
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.title)}</strong> ${escapeHtml(item.content)}</li>`,
    )
    .join("");

  return `<div data-type=\"takeaways\"><ul>${list}</ul></div>`;
}

function renderInlineCtaBlock(block: InlineCtaBlock): string {
  return `<div data-type=\"inline-cta\" data-title=\"${escapeAttribute(block.title)}\" data-button-text=\"${escapeAttribute(block.buttonText)}\" data-description=\"${escapeAttribute(block.description)}\"></div>`;
}

export function renderArticleBlockToHtml(block: ArticleBlock): string {
  if (block.hidden) {
    return "";
  }

  switch (block.type) {
    case "heading":
      return `<h${block.level}>${escapeHtml(block.text)}</h${block.level}>`;

    case "paragraph": {
      const paragraphHtml = sanitizeInlineHtml(block.html);
      const alreadyWrapped = /^\s*<p[\s>]/i.test(paragraphHtml);
      return alreadyWrapped ? paragraphHtml : `<p>${paragraphHtml}</p>`;
    }

    case "blockquote":
      return `<blockquote>${escapeHtml(block.text)}</blockquote>`;

    case "icon_list":
      return `<div data-type=\"icon-list\" data-items=\"${escapeAttribute(JSON.stringify(block.items))}\" data-columns=\"${block.columns}\"></div>`;

    case "comparison_table":
      return `<div data-type=\"comparison-table\" data-features=\"${escapeAttribute(JSON.stringify(block.features))}\" data-our-brand=\"${escapeAttribute(block.ourBrand)}\" data-their-brand=\"${escapeAttribute(block.theirBrand)}\"></div>`;

    case "timeline":
      return `<div data-type=\"timeline\" data-title=\"${escapeAttribute(block.title)}\" data-weeks=\"${escapeAttribute(JSON.stringify(block.weeks))}\"></div>`;

    case "testimonial":
      return `<div data-type=\"testimonial\" data-helped-with=\"${escapeAttribute(block.helpedWith)}\" data-title=\"${escapeAttribute(block.title)}\" data-body=\"${escapeAttribute(block.body)}\" data-author=\"${escapeAttribute(block.author)}\" data-verified=\"${String(block.verified)}\"></div>`;

    case "image": {
      if (!block.imageUrl) {
        return `<div data-type=\"image-placeholder\" data-search-query=\"${escapeAttribute(block.searchQuery)}\" data-image-url=\"\"></div>`;
      }

      const alt = block.alt ?? block.searchQuery;
      return `<div data-type=\"image-placeholder\" data-search-query=\"${escapeAttribute(block.searchQuery)}\" data-image-url=\"${escapeAttribute(block.imageUrl)}\"><img src=\"${escapeAttribute(block.imageUrl)}\" alt=\"${escapeAttribute(alt)}\" /></div>`;
    }

    case "takeaways":
      return renderTakeawayItems(block.items);

    case "inline_cta":
      return renderInlineCtaBlock(block);

    default: {
      const unreachable: never = block;
      return `<p>${escapeHtml(JSON.stringify(unreachable))}</p>`;
    }
  }
}

export function renderBlocksToHtml(blocks: ArticleBlock[]): string {
  return blocks
    .filter((block) => !block.hidden)
    .map((block) => renderArticleBlockToHtml(block))
    .filter((value) => value.length > 0)
    .join("\n");
}

export function renderArticleDocumentToHtml(document: ArticleDocumentV1): string {
  return renderBlocksToHtml(document.blocks);
}

export function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
