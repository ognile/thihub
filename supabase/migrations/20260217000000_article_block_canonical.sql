-- Canonical block storage for article documents
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS content_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS content_schema_version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS style_preset TEXT NOT NULL DEFAULT 'core-polished';

COMMENT ON COLUMN articles.content_blocks IS 'Canonical structured article blocks (ArticleDocumentV1.blocks)';
COMMENT ON COLUMN articles.content_schema_version IS 'Schema version for canonical block content';
COMMENT ON COLUMN articles.style_preset IS 'Presentation preset for canonical article renderer';
