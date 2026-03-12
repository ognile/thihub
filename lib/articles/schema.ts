import { z } from "zod";

export const DEFAULT_SCHEMA_VERSION = 1 as const;
export const DEFAULT_STYLE_PRESET = "core-polished" as const;
export const DEFAULT_AUTHOR_IMAGE =
  "https://picsum.photos/seed/doc/100";

export const stylePresetSchema = z.literal(DEFAULT_STYLE_PRESET);
export const readTimeModeSchema = z.enum(["auto", "override"]);

export const DEFAULT_HERO_META = {
  reportLabel: "Investigative Report",
  factCheckedLabel: "Fact Checked",
  medicallyReviewedLabel: "Medically Reviewed",
  readTimeMode: "auto" as const,
  readTimeOverrideMinutes: null as number | null,
};

export const heroMetaSchema = z.object({
  reportLabel: z.string().default(DEFAULT_HERO_META.reportLabel),
  factCheckedLabel: z.string().default(DEFAULT_HERO_META.factCheckedLabel),
  medicallyReviewedLabel: z.string().default(DEFAULT_HERO_META.medicallyReviewedLabel),
  readTimeMode: readTimeModeSchema.default(DEFAULT_HERO_META.readTimeMode),
  readTimeOverrideMinutes: z.number().int().min(1).nullable().default(DEFAULT_HERO_META.readTimeOverrideMinutes),
});

const blockIdSchema = z.string().min(1);

const headingBlockSchema = z.object({
  id: blockIdSchema,
  hidden: z.boolean().default(false),
  type: z.literal("heading"),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string().default(""),
});

const paragraphBlockSchema = z.object({
  id: blockIdSchema,
  hidden: z.boolean().default(false),
  type: z.literal("paragraph"),
  html: z.string().default(""),
});

const blockquoteBlockSchema = z.object({
  id: blockIdSchema,
  hidden: z.boolean().default(false),
  type: z.literal("blockquote"),
  text: z.string().default(""),
});

const iconListItemSchema = z.object({
  icon: z.string().min(1),
  title: z.string().default(""),
  text: z.string().default(""),
});

const iconListBlockSchema = z.object({
  id: blockIdSchema,
  hidden: z.boolean().default(false),
  type: z.literal("icon_list"),
  columns: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  items: z.array(iconListItemSchema).default([]),
});

const comparisonFeatureSchema = z.object({
  name: z.string().default(""),
  us: z.boolean().default(false),
  them: z.boolean().default(false),
});

const comparisonTableBlockSchema = z.object({
  id: blockIdSchema,
  hidden: z.boolean().default(false),
  type: z.literal("comparison_table"),
  ourBrand: z.string().default("Our Formula"),
  theirBrand: z.string().default("Generic Brands"),
  features: z.array(comparisonFeatureSchema).default([]),
});

const timelineWeekSchema = z.object({
  week: z.number().int().min(1),
  title: z.string().default(""),
  description: z.string().default(""),
});

const timelineBlockSchema = z.object({
  id: blockIdSchema,
  hidden: z.boolean().default(false),
  type: z.literal("timeline"),
  title: z.string().default("Your Journey"),
  weeks: z.array(timelineWeekSchema).default([]),
});

const testimonialBlockSchema = z.object({
  id: blockIdSchema,
  hidden: z.boolean().default(false),
  type: z.literal("testimonial"),
  helpedWith: z.string().default("Overall Wellness"),
  title: z.string().default(""),
  body: z.string().default(""),
  author: z.string().default("Anonymous"),
  verified: z.boolean().default(true),
});

const imageBlockSchema = z.object({
  id: blockIdSchema,
  hidden: z.boolean().default(false),
  type: z.literal("image"),
  searchQuery: z.string().default(""),
  imageUrl: z.string().url().nullable(),
  alt: z.string().nullable(),
});

const takeawayItemSchema = z.object({
  title: z.string().default(""),
  content: z.string().default(""),
});

const takeawaysBlockSchema = z.object({
  id: blockIdSchema,
  hidden: z.boolean().default(false),
  type: z.literal("takeaways"),
  items: z.array(takeawayItemSchema).default([]),
});

const inlineCtaBlockSchema = z.object({
  id: blockIdSchema,
  hidden: z.boolean().default(false),
  type: z.literal("inline_cta"),
  title: z.string().default("Curious about the science?"),
  buttonText: z.string().default("Read the Clinical Study »"),
  description: z.string().default("Secure, verified link to official research."),
});

export const articleBlockSchema = z.discriminatedUnion("type", [
  headingBlockSchema,
  paragraphBlockSchema,
  blockquoteBlockSchema,
  iconListBlockSchema,
  comparisonTableBlockSchema,
  timelineBlockSchema,
  testimonialBlockSchema,
  imageBlockSchema,
  takeawaysBlockSchema,
  inlineCtaBlockSchema,
]);

export const articleDocumentSchema = z.object({
  schemaVersion: z.literal(DEFAULT_SCHEMA_VERSION),
  stylePreset: stylePresetSchema.default(DEFAULT_STYLE_PRESET),
  blocks: z.array(articleBlockSchema).default([]),
});

export type StylePreset = z.infer<typeof stylePresetSchema>;
export type ReadTimeMode = z.infer<typeof readTimeModeSchema>;
export type HeroMetaV1 = z.infer<typeof heroMetaSchema>;
export type IconListItem = z.infer<typeof iconListItemSchema>;
export type ComparisonFeature = z.infer<typeof comparisonFeatureSchema>;
export type TimelineWeek = z.infer<typeof timelineWeekSchema>;
export type TakeawayItem = z.infer<typeof takeawayItemSchema>;
export type InlineCtaBlock = z.infer<typeof inlineCtaBlockSchema>;
export type ArticleBlock = z.infer<typeof articleBlockSchema>;
export type ArticleDocumentV1 = z.infer<typeof articleDocumentSchema>;

export function parseArticleDocument(input: unknown): ArticleDocumentV1 {
  return articleDocumentSchema.parse(input);
}

export function safeParseArticleDocument(input: unknown) {
  return articleDocumentSchema.safeParse(input);
}

export function createEmptyArticleDocument(): ArticleDocumentV1 {
  return {
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    stylePreset: DEFAULT_STYLE_PRESET,
    blocks: [],
  };
}

export function normalizeHeroMeta(input: unknown): HeroMetaV1 {
  const parsed = heroMetaSchema.safeParse(input);
  if (!parsed.success) {
    return { ...DEFAULT_HERO_META };
  }

  return {
    reportLabel: parsed.data.reportLabel ?? DEFAULT_HERO_META.reportLabel,
    factCheckedLabel: parsed.data.factCheckedLabel ?? DEFAULT_HERO_META.factCheckedLabel,
    medicallyReviewedLabel: parsed.data.medicallyReviewedLabel ?? DEFAULT_HERO_META.medicallyReviewedLabel,
    readTimeMode: parsed.data.readTimeMode ?? DEFAULT_HERO_META.readTimeMode,
    readTimeOverrideMinutes: parsed.data.readTimeOverrideMinutes ?? DEFAULT_HERO_META.readTimeOverrideMinutes,
  };
}

let blockSequence = 0;
export function createBlockId(prefix = "blk"): string {
  blockSequence += 1;
  return `${prefix}_${Date.now().toString(36)}_${blockSequence.toString(36)}`;
}
