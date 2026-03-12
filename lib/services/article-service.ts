import { createClient } from "@/utils/supabase/server";
import type { DomainContext } from "@/lib/services/domain-context";
import { resolveCanonicalDocument } from "@/lib/articles/service";
import {
  normalizeHeroMeta,
  type ArticleDocumentV1,
  type ArticleBlock,
  type HeroMetaV1,
  type StylePreset,
} from "@/lib/articles/schema";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export const ARTICLE_SELECT_COLUMNS = [
  "id",
  "slug",
  "title",
  "subtitle",
  "content",
  "content_blocks",
  "content_schema_version",
  "style_preset",
  "hero_meta",
  "author_image",
  "author",
  "reviewer",
  "date",
  "image",
  "pixel_id",
  "cta_url",
  "comments",
  "sticky_cta_enabled",
  "sticky_cta_text",
  "sticky_cta_price",
  "sticky_cta_original_price",
  "sticky_cta_product_name",
  "created_at",
  "updated_at",
].join(",");

interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  content: string | null;
  content_blocks: unknown;
  content_schema_version: number | null;
  style_preset: string | null;
  hero_meta: unknown;
  author_image: string | null;
  author: string | null;
  reviewer: string | null;
  date: string | null;
  image: string | null;
  pixel_id: string | null;
  cta_url: string | null;
  comments: unknown;
  sticky_cta_enabled: boolean | null;
  sticky_cta_text: string | null;
  sticky_cta_price: string | null;
  sticky_cta_original_price: string | null;
  sticky_cta_product_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleView extends ArticleRow {
  pixelId: string | null;
  ctaUrl: string | null;
  stickyCTAEnabled: boolean | null;
  stickyCTAText: string | null;
  stickyCTAPrice: string | null;
  stickyCTAOriginalPrice: string | null;
  stickyCTAProductName: string | null;
  contentSchemaVersion: number;
  stylePreset: StylePreset;
  contentBlocks: ArticleBlock[];
  contentDocument: ArticleDocumentV1;
  heroMeta: HeroMetaV1;
  authorImage: string | null;
}

interface ArticleServiceOptions {
  supabase?: SupabaseServerClient;
}

interface GlobalConfigRow {
  default_pixel_id: string | null;
  default_cta_url: string | null;
}

export interface GlobalArticleDefaults {
  defaultPixelId: string;
  defaultCtaUrl: string;
}

function mapArticleRowToView(article: ArticleRow): ArticleView {
  const contentDocument = resolveCanonicalDocument({
    contentBlocks: article.content_blocks,
    contentSchemaVersion: article.content_schema_version,
    stylePreset: article.style_preset,
    content: article.content,
  });

  return {
    ...article,
    pixelId: article.pixel_id,
    ctaUrl: article.cta_url,
    stickyCTAEnabled: article.sticky_cta_enabled,
    stickyCTAText: article.sticky_cta_text,
    stickyCTAPrice: article.sticky_cta_price,
    stickyCTAOriginalPrice: article.sticky_cta_original_price,
    stickyCTAProductName: article.sticky_cta_product_name,
    contentSchemaVersion: contentDocument.schemaVersion,
    stylePreset: contentDocument.stylePreset,
    contentBlocks: contentDocument.blocks,
    contentDocument,
    heroMeta: normalizeHeroMeta(article.hero_meta),
    authorImage: article.author_image,
  };
}

const DEFAULT_PIXEL_ID = "1213472546398709";

export const ArticleService = {
  async getBySlug(
    slug: string,
    domainContext: DomainContext,
    options: ArticleServiceOptions = {},
  ): Promise<ArticleView | null> {
    void domainContext;

    const supabase = options.supabase ?? (await createClient());
    const { data, error } = await supabase
      .from("articles")
      .select(ARTICLE_SELECT_COLUMNS)
      .eq("slug", slug)
      .single();

    if (error) {
      if ((error as { code?: string }).code === "PGRST116") {
        return null;
      }
      throw error;
    }

    const article = data as unknown as ArticleRow;
    return mapArticleRowToView(article);
  },

  async getGlobalDefaults(
    domainContext: DomainContext,
    options: ArticleServiceOptions = {},
  ): Promise<GlobalArticleDefaults> {
    void domainContext;

    const supabase = options.supabase ?? (await createClient());
    const { data, error } = await supabase
      .from("global_config")
      .select("default_pixel_id,default_cta_url")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const row = (data as GlobalConfigRow | null) ?? null;

    return {
      defaultPixelId: row?.default_pixel_id ?? DEFAULT_PIXEL_ID,
      defaultCtaUrl: row?.default_cta_url ?? "",
    };
  },
};
