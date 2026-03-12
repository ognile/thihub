ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS hero_meta JSONB NOT NULL DEFAULT '{"reportLabel":"Investigative Report","factCheckedLabel":"Fact Checked","medicallyReviewedLabel":"Medically Reviewed","readTimeMode":"auto","readTimeOverrideMinutes":null}'::jsonb,
  ADD COLUMN IF NOT EXISTS author_image TEXT NULL;

COMMENT ON COLUMN articles.hero_meta IS 'Hero presentation metadata (labels and read-time mode)';
COMMENT ON COLUMN articles.author_image IS 'Optional author avatar URL for hero byline';
