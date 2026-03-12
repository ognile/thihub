import { NextResponse } from "next/server";
import { requireAdminRouteUser } from "@/lib/admin/require-admin-route-user";
import { QuizService } from "@/lib/quizzes/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminRouteUser();
    if (auth.response) {
      return auth.response;
    }

    const { id } = await params;
    const quiz = await QuizService.getDefinitionById(id, {
      supabase: auth.adminSupabase,
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz definition not found" }, { status: 404 });
    }

    return NextResponse.json(quiz);
  } catch (error) {
    console.error("Error fetching quiz definition:", error);
    return NextResponse.json({ error: "Failed to fetch quiz definition" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminRouteUser();
    if (auth.response) {
      return auth.response;
    }

    const { id } = await params;
    const body = await request.json();

    const quiz = await QuizService.updateDefinitionFromAdmin(
      id,
      {
        name: body.name,
        description: body.description,
        status: body.status,
        definition: body.definition,
      },
      {
        supabase: auth.adminSupabase,
      },
    );

    return NextResponse.json(quiz);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update quiz definition";
    console.error("Error updating quiz definition:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
