import { LIVE_QUIZ_SLUG } from "./constants";

export interface QuizEntryUrlOptions {
  slug?: string;
  source?: string;
  articleSlug?: string;
}

export interface ParsedQuizEntryContext {
  source: string;
  articleSlug: string | null;
}

export function buildQuizEntryUrl(options: QuizEntryUrlOptions = {}) {
  const params = new URLSearchParams();
  const source = options.source ?? "direct";
  params.set("source", source);

  if (options.articleSlug) {
    params.set("article", options.articleSlug);
  }

  const query = params.toString();
  return `/quiz/${options.slug ?? LIVE_QUIZ_SLUG}${query ? `?${query}` : ""}`;
}

export function parseQuizEntryContext(
  searchParams: Record<string, string | string[] | undefined>,
): ParsedQuizEntryContext {
  const sourceValue = searchParams.source;
  const articleValue = searchParams.article;

  const source = Array.isArray(sourceValue) ? sourceValue[0] : sourceValue;
  const articleSlug = Array.isArray(articleValue) ? articleValue[0] : articleValue;

  return {
    source: source && source.length > 0 ? source : "direct",
    articleSlug: articleSlug && articleSlug.length > 0 ? articleSlug : null,
  };
}
