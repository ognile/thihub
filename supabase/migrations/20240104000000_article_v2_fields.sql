-- Add V2 article fields for sticky CTA and theme support

-- Sticky CTA settings
ALTER TABLE articles ADD COLUMN IF NOT EXISTS sticky_cta_enabled BOOLEAN DEFAULT false;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS sticky_cta_text TEXT DEFAULT 'Try Risk-Free';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS sticky_cta_price TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS sticky_cta_original_price TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS sticky_cta_product_name TEXT;

-- Article theme (v1 = standard blog, v2 = scientific advertorial)
ALTER TABLE articles ADD COLUMN IF NOT EXISTS article_theme TEXT DEFAULT 'v1';

-- Comment to document the schema
COMMENT ON COLUMN articles.sticky_cta_enabled IS 'Whether to show the sticky CTA on this article';
COMMENT ON COLUMN articles.sticky_cta_text IS 'Text to display on the sticky CTA button';
COMMENT ON COLUMN articles.sticky_cta_price IS 'Current price to display (e.g., $49.99)';
COMMENT ON COLUMN articles.sticky_cta_original_price IS 'Original/crossed out price (e.g., $79.99)';
COMMENT ON COLUMN articles.sticky_cta_product_name IS 'Product name shown in sticky CTA';
COMMENT ON COLUMN articles.article_theme IS 'Article generation theme: v1 (standard) or v2 (scientific advertorial)';

