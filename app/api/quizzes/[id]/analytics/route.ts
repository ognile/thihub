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
    const analytics = await QuizService.getAnalytics(id, {
      supabase: auth.adminSupabase,
    });

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching quiz analytics:", error);
    return NextResponse.json({ error: "Failed to fetch quiz analytics" }, { status: 500 });
  }
}
