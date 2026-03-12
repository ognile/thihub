-- Destructive cleanup after block-canonical cutover validation
ALTER TABLE articles
  DROP COLUMN IF EXISTS article_theme,
  DROP COLUMN IF EXISTS key_takeaways,
  DROP COLUMN IF EXISTS cta_text,
  DROP COLUMN IF EXISTS cta_title,
  DROP COLUMN IF EXISTS cta_description;
