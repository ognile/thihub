import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseQuizDefinition, type QuizDefinition } from "./schema.ts";

const QUIZ_CONTENT_DIR = path.join(process.cwd(), "content", "quizzes");

export async function loadQuizDefinitionFromFile(fileOrSlug: string): Promise<QuizDefinition> {
  const resolvedPath = fileOrSlug.endsWith(".json")
    ? path.resolve(process.cwd(), fileOrSlug)
    : path.join(QUIZ_CONTENT_DIR, `${fileOrSlug}.json`);
  const raw = await readFile(resolvedPath, "utf8");
  return parseQuizDefinition(JSON.parse(raw));
}

export function getQuizContentPath(slug: string) {
  return path.join(QUIZ_CONTENT_DIR, `${slug}.json`);
}
