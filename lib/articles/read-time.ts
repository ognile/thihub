import type { ArticleBlock, HeroMetaV1 } from "@/lib/articles/schema";
import { stripTags } from "@/lib/articles/renderer";

const WORDS_PER_MINUTE = 220;

function countWords(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
}

function getBlockWordCount(block: ArticleBlock): number {
  switch (block.type) {
    case "heading":
      return countWords(block.text);
    case "paragraph":
      return countWords(stripTags(block.html));
    case "blockquote":
      return countWords(block.text);
    case "icon_list":
      return block.items.reduce(
        (total, item) => total + countWords(item.title) + countWords(item.text),
        0,
      );
    case "comparison_table":
      return block.features.reduce((total, feature) => total + countWords(feature.name), 0);
    case "timeline":
      return block.weeks.reduce(
        (total, week) => total + countWords(week.title) + countWords(week.description),
        countWords(block.title),
      );
    case "testimonial":
      return (
        countWords(block.helpedWith) +
        countWords(block.title) +
        countWords(block.body) +
        countWords(block.author)
      );
    case "image":
      return countWords(block.alt ?? block.searchQuery);
    case "takeaways":
      return block.items.reduce(
        (total, item) => total + countWords(item.title) + countWords(item.content),
        0,
      );
    case "inline_cta":
      return (
        countWords(block.title) +
        countWords(block.buttonText) +
        countWords(block.description)
      );
    default:
      return 0;
  }
}

export function computeReadTimeMinutes(input: {
  title?: string | null;
  subtitle?: string | null;
  blocks: ArticleBlock[];
}): number {
  const titleWords = countWords(input.title ?? "");
  const subtitleWords = countWords(input.subtitle ?? "");
  const visibleBlocks = input.blocks.filter((block) => !block.hidden);
  const blockWords = visibleBlocks.reduce((total, block) => total + getBlockWordCount(block), 0);
  const totalWords = titleWords + subtitleWords + blockWords;

  return Math.max(1, Math.ceil(totalWords / WORDS_PER_MINUTE));
}

export function resolveReadTimeMinutes(input: {
  title?: string | null;
  subtitle?: string | null;
  blocks: ArticleBlock[];
  heroMeta: HeroMetaV1;
}): number {
  if (
    input.heroMeta.readTimeMode === "override" &&
    typeof input.heroMeta.readTimeOverrideMinutes === "number" &&
    Number.isFinite(input.heroMeta.readTimeOverrideMinutes) &&
    input.heroMeta.readTimeOverrideMinutes > 0
  ) {
    return input.heroMeta.readTimeOverrideMinutes;
  }

  return computeReadTimeMinutes({
    title: input.title ?? "",
    subtitle: input.subtitle ?? "",
    blocks: input.blocks,
  });
}
