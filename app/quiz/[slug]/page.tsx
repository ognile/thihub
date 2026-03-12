import { notFound } from "next/navigation";
import QuizPlayerClient from "@/components/quiz/QuizPlayerClient";
import { QuizService } from "@/lib/quizzes/service";
import { parseQuizEntryContext } from "@/lib/quizzes/url";

export const dynamic = "force-dynamic";

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const search = await searchParams;
  const entryContext = parseQuizEntryContext(search);
  const quiz = await QuizService.getPublishedBySlug(slug);

  if (!quiz) {
    notFound();
  }

  return (
    <QuizPlayerClient
      quizId={quiz.id}
      quiz={quiz.definition}
      entrySource={entryContext.source}
      articleSlug={entryContext.articleSlug}
    />
  );
}
