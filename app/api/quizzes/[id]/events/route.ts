import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { recordCounter } from "@/lib/observability/counters";
import { QuizService, type QuizEventIngestPayload } from "@/lib/quizzes/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as QuizEventIngestPayload;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;
    const userAgent = request.headers.get("user-agent");

    if (!body.sessionToken || !body.eventType) {
      return NextResponse.json({ error: "sessionToken and eventType are required" }, { status: 400 });
    }

    const savedSession = await QuizService.ingestEvent(id, {
      ...body,
      userAgent,
      ipAddress,
    }, {
      supabase: createAdminClient(),
    });

    recordCounter("quiz.api.event_ingest", {
      quizId: id,
      sessionToken: body.sessionToken,
      eventType: body.eventType,
      stepId: body.stepId ?? null,
    });

    return NextResponse.json(savedSession, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to ingest quiz event";
    console.error("Error ingesting quiz event:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
