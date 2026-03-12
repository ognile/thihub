"use client";

import QuizExperience from "@/components/quiz/QuizExperience";
import type { QuizDefinition } from "@/lib/quizzes/schema";

interface QuizPlayerClientProps {
  quizId: string;
  quiz: QuizDefinition;
  entrySource: string;
  articleSlug: string | null;
}

export default function QuizPlayerClient(props: QuizPlayerClientProps) {
  return <QuizExperience {...props} mode="live" />;
}
