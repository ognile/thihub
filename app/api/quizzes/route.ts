import { NextResponse } from "next/server";
import { requireAdminRouteUser } from "@/lib/admin/require-admin-route-user";
import { QuizService } from "@/lib/quizzes/service";

export async function GET() {
  try {
    const auth = await requireAdminRouteUser();
    if (auth.response) {
      return auth.response;
    }

    const quizzes = await QuizService.listDefinitions({
      supabase: auth.adminSupabase,
    });

    return NextResponse.json(quizzes);
  } catch (error) {
    console.error("Error fetching quiz definitions:", error);
    return NextResponse.json({ error: "Failed to fetch quiz definitions" }, { status: 500 });
  }
}
