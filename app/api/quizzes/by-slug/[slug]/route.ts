import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { jsonWithEtag } from "@/lib/http/etag";
import { recordCounter } from "@/lib/observability/counters";
import { createDomainContextFromRequest } from "@/lib/services/domain-context";
import { QuizService } from "@/lib/quizzes/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const domainContext = createDomainContextFromRequest(request);
    const supabase = await createClient();
    const quiz = await QuizService.getPublishedBySlug(slug, { supabase });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    recordCounter("quiz.api.get_by_slug", {
      slug,
      domain: domainContext.domain,
      host: domainContext.host,
      quizId: quiz.id,
    });

    return jsonWithEtag(request, quiz);
  } catch (error) {
    console.error("Error fetching quiz definition by slug:", error);
    return NextResponse.json({ error: "Failed to fetch quiz definition" }, { status: 500 });
  }
}
