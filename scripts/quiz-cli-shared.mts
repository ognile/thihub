import path from "node:path";
import { config as loadEnv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadQuizDefinitionFromFile } from "../lib/quizzes/content.ts";
import { parseQuizDefinition, type QuizDefinition } from "../lib/quizzes/schema.ts";

loadEnv();
loadEnv({ path: path.join(process.cwd(), ".env.local"), override: false });

interface QuizDefinitionRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  schema_version: string;
  definition: unknown;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface QuizSessionRow {
  id: string;
  session_token: string;
  entry_source: string | null;
  entry_article_slug: string | null;
  result_id: string | null;
  lead_captured_at: string | null;
  offer_clicked_at: string | null;
  completed_at: string | null;
  status: "active" | "completed";
  answers: unknown;
  created_at: string;
}

interface QuizEventRow {
  session_id: string;
  event_type: string;
  step_id: string | null;
}

export function getCommandTarget(): string {
  const target = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
  if (!target) {
    throw new Error("expected a quiz slug or spec file path");
  }
  return target;
}

export function getFlagValue(flag: string): string | null {
  const args = process.argv.slice(2);
  const index = args.findIndex((argument) => argument === flag);
  if (index === -1) {
    return null;
  }
  return args[index + 1] ?? null;
}

export async function loadDefinitionFromTarget(target: string): Promise<QuizDefinition> {
  return loadQuizDefinitionFromFile(target);
}

export function printDefinitionSummary(definition: QuizDefinition) {
  const leadIndex = definition.steps.findIndex((step) => step.kind === "lead");
  const offerStep = definition.steps.find((step) => step.kind === "offer");

  console.log(`schema-version: ${definition.schemaVersion}`);
  console.log(`slug: ${definition.slug}`);
  console.log(`name: ${definition.name}`);
  console.log(`steps: ${definition.steps.length}`);
  console.log(`results: ${definition.results.length}`);
  console.log(`entrypoints: ${definition.entrypoints.map((entrypoint) => entrypoint.source).join(", ")}`);
  console.log(`lead-step-index: ${leadIndex === -1 ? "none" : leadIndex + 1}`);
  console.log(`offer-url: ${offerStep?.kind === "offer" ? offerStep.ctaUrl : "none"}`);
}

export function createQuizAdminClient() {
  const url = process.env.THIHUB_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.THIHUB_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("missing THIHUB_SUPABASE_URL or THIHUB_SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function upsertQuizDefinition(
  supabase: SupabaseClient,
  definition: QuizDefinition,
  status: "draft" | "published" | "archived",
) {
  const now = new Date().toISOString();
  const payload = {
    slug: definition.slug,
    name: definition.name,
    description: definition.description,
    status,
    schema_version: definition.schemaVersion,
    definition,
    published_at: status === "published" ? now : null,
  };

  const { data, error } = await supabase
    .from("quiz_definitions")
    .upsert(payload, { onConflict: "slug" })
    .select("id,slug,status,published_at")
    .single();

  if (error) {
    throw error;
  }

  return data as {
    id: string;
    slug: string;
    status: "draft" | "published" | "archived";
    published_at: string | null;
  };
}

export async function getQuizReport(target: string) {
  const slug = target.endsWith(".json") ? (await loadDefinitionFromTarget(target)).slug : target;
  const supabase = createQuizAdminClient();

  const { data: definitionRow, error: definitionError } = await supabase
    .from("quiz_definitions")
    .select("id,slug,name,description,status,schema_version,definition,published_at,created_at,updated_at")
    .eq("slug", slug)
    .maybeSingle();

  if (definitionError) {
    throw definitionError;
  }

  if (!definitionRow) {
    throw new Error(`no quiz definition found for slug "${slug}"`);
  }

  const typedDefinitionRow = definitionRow as QuizDefinitionRow;
  const definition = parseQuizDefinition(typedDefinitionRow.definition);

  const [{ data: sessionRows, error: sessionError }, { data: eventRows, error: eventError }] =
    await Promise.all([
      supabase
        .from("quiz_sessions")
        .select("id,session_token,entry_source,entry_article_slug,result_id,lead_captured_at,offer_clicked_at,completed_at,status,answers,created_at")
        .eq("quiz_definition_id", typedDefinitionRow.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("quiz_events")
        .select("session_id,event_type,step_id")
        .eq("quiz_definition_id", typedDefinitionRow.id),
    ]);

  if (sessionError) {
    throw sessionError;
  }

  if (eventError) {
    throw eventError;
  }

  const sessions = (sessionRows ?? []) as QuizSessionRow[];
  const events = (eventRows ?? []) as QuizEventRow[];
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((session) => session.status === "completed").length;
  const leadCaptures = sessions.filter((session) => session.lead_captured_at !== null).length;
  const offerStep = [...definition.steps].reverse().find((step) => step.kind === "offer") ?? null;
  const offerViews = new Set(
    events
      .filter((event) => event.event_type === "step_viewed" && event.step_id === offerStep?.id)
      .map((event) => event.session_id),
  ).size;
  const offerClicks = sessions.filter((session) => session.offer_clicked_at !== null).length;

  const stepReachMap = new Map<string, Set<string>>();
  definition.steps.forEach((step) => {
    stepReachMap.set(step.id, new Set());
  });

  events.forEach((event) => {
    if (
      (event.event_type === "step_viewed" || event.event_type === "answer_submitted") &&
      event.step_id &&
      stepReachMap.has(event.step_id)
    ) {
      stepReachMap.get(event.step_id)?.add(event.session_id);
    }
  });

  const funnel = definition.steps.map((step, index) => {
    const reachedSessions = stepReachMap.get(step.id)?.size ?? 0;
    const previousReached =
      index === 0
        ? totalSessions
        : stepReachMap.get(definition.steps[index - 1]?.id ?? "")?.size ?? 0;
    const dropOffCount = Math.max(previousReached - reachedSessions, 0);

    return {
      stepId: step.id,
      title: step.title,
      kind: step.kind,
      reachedSessions,
      reachRate: totalSessions === 0 ? 0 : Math.round((reachedSessions / totalSessions) * 100),
      dropOffCount,
      dropOffRate: totalSessions === 0 ? 0 : Math.round((dropOffCount / totalSessions) * 100),
    };
  });

  const sourceMap = new Map<string, { sessions: number; completedSessions: number; leadCaptures: number }>();
  sessions.forEach((session) => {
    const source = session.entry_source ?? "unknown";
    const current = sourceMap.get(source) ?? { sessions: 0, completedSessions: 0, leadCaptures: 0 };
    current.sessions += 1;
    if (session.status === "completed") {
      current.completedSessions += 1;
    }
    if (session.lead_captured_at) {
      current.leadCaptures += 1;
    }
    sourceMap.set(source, current);
  });

  return {
    quiz: {
      id: typedDefinitionRow.id,
      slug: typedDefinitionRow.slug,
      name: typedDefinitionRow.name,
      status: typedDefinitionRow.status,
      publishedAt: typedDefinitionRow.published_at,
    },
    summary: {
      sessions: totalSessions,
      completedSessions,
      completionRate: totalSessions === 0 ? 0 : Math.round((completedSessions / totalSessions) * 100),
      leadCaptures,
      leadCaptureRate: totalSessions === 0 ? 0 : Math.round((leadCaptures / totalSessions) * 100),
      offerViews,
      offerClicks,
      ctaCtr: offerViews === 0 ? 0 : Math.round((offerClicks / offerViews) * 100),
    },
    sources: [...sourceMap.entries()]
      .map(([source, counts]) => ({
        source,
        sessions: counts.sessions,
        completedSessions: counts.completedSessions,
        leadCaptures: counts.leadCaptures,
        completionRate: counts.sessions === 0 ? 0 : Math.round((counts.completedSessions / counts.sessions) * 100),
        leadCaptureRate: counts.sessions === 0 ? 0 : Math.round((counts.leadCaptures / counts.sessions) * 100),
      }))
      .sort((left, right) => right.sessions - left.sessions),
    results: definition.results.map((result) => ({
      resultId: result.id,
      label: result.label,
      sessions: sessions.filter((session) => session.result_id === result.id).length,
    })),
    funnel,
  };
}
