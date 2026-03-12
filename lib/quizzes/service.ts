import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import type { QuizAnswerRecord } from "./engine";
import {
  assertAdminEditableStructure,
  getQuizStructureFingerprint,
  parseQuizDefinition,
  type QuizDefinition,
} from "./schema";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type SupabaseAdminClient = ReturnType<typeof createAdminClient>;
type SupabaseClientLike = SupabaseServerClient | SupabaseAdminClient;

type QuizStatus = "draft" | "published" | "archived";
type QuizSessionStatus = "active" | "completed";
type QuizEventType =
  | "session_started"
  | "step_viewed"
  | "answer_submitted"
  | "result_viewed"
  | "lead_submitted"
  | "offer_clicked"
  | "session_completed";

interface QuizDefinitionRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: QuizStatus;
  schema_version: string;
  definition: unknown;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface QuizSessionRow {
  id: string;
  quiz_definition_id: string;
  session_token: string;
  entry_source: string | null;
  entry_article_slug: string | null;
  entry_path: string | null;
  referrer: string | null;
  user_agent: string | null;
  ip_address: string | null;
  current_step_id: string | null;
  answers: unknown;
  result_id: string | null;
  lead_captured_at: string | null;
  offer_clicked_at: string | null;
  completed_at: string | null;
  status: QuizSessionStatus;
  last_event_at: string;
  created_at: string;
  updated_at: string;
}

interface QuizEventRow {
  session_id: string;
  event_type: QuizEventType;
  step_id: string | null;
}

export interface QuizDefinitionRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: QuizStatus;
  schemaVersion: string;
  definition: QuizDefinition;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuizListItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: QuizStatus;
  publishedAt: string | null;
  updatedAt: string;
  sessions: number;
  completedSessions: number;
  completionRate: number;
}

export interface QuizEventIngestPayload {
  sessionToken: string;
  eventType: QuizEventType;
  stepId?: string | null;
  nextStepId?: string | null;
  optionIds?: string[];
  resultId?: string | null;
  source?: string | null;
  articleSlug?: string | null;
  landingPath?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  ctaUrl?: string | null;
  lead?: {
    values: Record<string, string>;
    consent: boolean;
  };
}

export interface QuizAnalyticsSummary {
  sessions: number;
  completedSessions: number;
  completionRate: number;
  leadCaptures: number;
  leadCaptureRate: number;
  offerViews: number;
  offerClicks: number;
  ctaCtr: number;
}

export interface QuizAnalyticsPayload {
  quiz: QuizDefinitionRecord;
  summary: QuizAnalyticsSummary;
  sources: Array<{
    source: string;
    sessions: number;
    completedSessions: number;
    leadCaptures: number;
    completionRate: number;
    leadCaptureRate: number;
  }>;
  funnel: Array<{
    stepId: string;
    title: string;
    kind: QuizDefinition["steps"][number]["kind"];
    reachedSessions: number;
    reachRate: number;
    dropOffCount: number;
    dropOffRate: number;
  }>;
  results: Array<{
    resultId: string;
    label: string;
    sessions: number;
  }>;
  recentSessions: Array<{
    id: string;
    sessionToken: string;
    entrySource: string | null;
    articleSlug: string | null;
    resultId: string | null;
    status: QuizSessionStatus;
    leadCapturedAt: string | null;
    offerClickedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    answers: QuizAnswerRecord[];
  }>;
}

interface QuizServiceOptions {
  supabase?: SupabaseClientLike;
}

function parseAnswers(value: unknown): QuizAnswerRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((candidate): candidate is QuizAnswerRecord => {
      if (typeof candidate !== "object" || candidate === null) {
        return false;
      }

      const record = candidate as Partial<QuizAnswerRecord>;
      return (
        typeof record.stepId === "string" &&
        Array.isArray(record.optionIds) &&
        typeof record.answeredAt === "string"
      );
    })
    .map((record) => ({
      stepId: record.stepId,
      optionIds: record.optionIds,
      answeredAt: record.answeredAt,
    }));
}

function serializeDefinitionRow(row: QuizDefinitionRow): QuizDefinitionRecord {
  const definition = parseQuizDefinition(row.definition);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    status: row.status,
    schemaVersion: row.schema_version,
    definition,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getSupabase(options: QuizServiceOptions) {
  return options.supabase ?? (await createClient());
}

function replaceAnswerRecord(records: QuizAnswerRecord[], nextRecord: QuizAnswerRecord) {
  const filtered = records.filter((record) => record.stepId !== nextRecord.stepId);
  return [...filtered, nextRecord];
}

export const QuizService = {
  async listDefinitions(options: QuizServiceOptions = {}): Promise<QuizListItem[]> {
    const supabase = await getSupabase(options);

    const [{ data: definitionRows, error: definitionError }, { data: sessionRows, error: sessionError }] =
      await Promise.all([
        supabase
          .from("quiz_definitions")
          .select("id,slug,name,description,status,schema_version,definition,published_at,created_at,updated_at")
          .order("updated_at", { ascending: false }),
        supabase
          .from("quiz_sessions")
          .select("quiz_definition_id,status"),
      ]);

    if (definitionError) {
      throw definitionError;
    }

    if (sessionError) {
      throw sessionError;
    }

    const counts = new Map<string, { sessions: number; completed: number }>();
    (sessionRows ?? []).forEach((row) => {
      const current = counts.get(row.quiz_definition_id) ?? { sessions: 0, completed: 0 };
      current.sessions += 1;
      if (row.status === "completed") {
        current.completed += 1;
      }
      counts.set(row.quiz_definition_id, current);
    });

    return (definitionRows as QuizDefinitionRow[]).map((row) => {
      const sessionCount = counts.get(row.id) ?? { sessions: 0, completed: 0 };
      const completionRate =
        sessionCount.sessions === 0 ? 0 : Math.round((sessionCount.completed / sessionCount.sessions) * 100);

      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        status: row.status,
        publishedAt: row.published_at,
        updatedAt: row.updated_at,
        sessions: sessionCount.sessions,
        completedSessions: sessionCount.completed,
        completionRate,
      };
    });
  },

  async getDefinitionById(id: string, options: QuizServiceOptions = {}): Promise<QuizDefinitionRecord | null> {
    const supabase = await getSupabase(options);
    const { data, error } = await supabase
      .from("quiz_definitions")
      .select("id,slug,name,description,status,schema_version,definition,published_at,created_at,updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    return serializeDefinitionRow(data as QuizDefinitionRow);
  },

  async getPublishedBySlug(slug: string, options: QuizServiceOptions = {}): Promise<QuizDefinitionRecord | null> {
    const supabase = await getSupabase(options);
    const { data, error } = await supabase
      .from("quiz_definitions")
      .select("id,slug,name,description,status,schema_version,definition,published_at,created_at,updated_at")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    return serializeDefinitionRow(data as QuizDefinitionRow);
  },

  async updateDefinitionFromAdmin(
    id: string,
    input: {
      name?: string;
      description?: string | null;
      status?: QuizStatus;
      definition?: unknown;
    },
    options: QuizServiceOptions = {},
  ): Promise<QuizDefinitionRecord> {
    const supabase = await getSupabase(options);
    const existing = await this.getDefinitionById(id, { supabase });

    if (!existing) {
      throw new Error("quiz definition not found");
    }

    const updateData: Record<string, unknown> = {};

    if (input.definition !== undefined) {
      const nextDefinition = parseQuizDefinition(input.definition);
      assertAdminEditableStructure(existing.definition, nextDefinition);
      updateData.definition = nextDefinition;
      updateData.name = input.name ?? nextDefinition.name;
      updateData.description = input.description ?? nextDefinition.description;
    } else {
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
    }

    if (input.status !== undefined) {
      updateData.status = input.status;
      updateData.published_at = input.status === "published" ? new Date().toISOString() : null;
    }

    const { error } = await supabase
      .from("quiz_definitions")
      .update(updateData)
      .eq("id", id);

    if (error) {
      throw error;
    }

    const updated = await this.getDefinitionById(id, { supabase });
    if (!updated) {
      throw new Error("updated quiz definition not found");
    }

    return updated;
  },

  async ingestEvent(
    quizId: string,
    payload: QuizEventIngestPayload,
    options: QuizServiceOptions = {},
  ) {
    const supabase = await getSupabase(options);
    const now = new Date().toISOString();

    const definitionRecord = await this.getDefinitionById(quizId, { supabase });
    if (!definitionRecord) {
      throw new Error("quiz definition not found");
    }

    if (definitionRecord.status !== "published") {
      throw new Error("quiz definition is not published");
    }

    const { data: existingSession, error: existingSessionError } = await supabase
      .from("quiz_sessions")
      .select("*")
      .eq("quiz_definition_id", quizId)
      .eq("session_token", payload.sessionToken)
      .maybeSingle();

    if (existingSessionError) {
      throw existingSessionError;
    }

    const currentSession = existingSession as QuizSessionRow | null;
    const answers = parseAnswers(currentSession?.answers);
    const updateData: Record<string, unknown> = {
      last_event_at: now,
      updated_at: now,
    };

    if (!currentSession) {
      updateData.quiz_definition_id = quizId;
      updateData.session_token = payload.sessionToken;
      updateData.entry_source = payload.source ?? null;
      updateData.entry_article_slug = payload.articleSlug ?? null;
      updateData.entry_path = payload.landingPath ?? null;
      updateData.referrer = payload.referrer ?? null;
      updateData.current_step_id = payload.stepId ?? definitionRecord.definition.steps[0]?.id ?? null;
      updateData.answers = [];
      updateData.status = "active";
      updateData.user_agent = payload.userAgent ?? null;
      updateData.ip_address = payload.ipAddress ?? null;
    }

    if (payload.source !== undefined) updateData.entry_source = payload.source;
    if (payload.articleSlug !== undefined) updateData.entry_article_slug = payload.articleSlug;
    if (payload.landingPath !== undefined) updateData.entry_path = payload.landingPath;
    if (payload.referrer !== undefined) updateData.referrer = payload.referrer;
    if (payload.userAgent !== undefined && !currentSession?.user_agent) updateData.user_agent = payload.userAgent;
    if (payload.ipAddress !== undefined && !currentSession?.ip_address) updateData.ip_address = payload.ipAddress;

    switch (payload.eventType) {
      case "step_viewed":
        updateData.current_step_id = payload.stepId ?? currentSession?.current_step_id ?? null;
        break;
      case "answer_submitted":
        if (!payload.stepId) {
          throw new Error("answer_submitted requires stepId");
        }
        updateData.answers = replaceAnswerRecord(answers, {
          stepId: payload.stepId,
          optionIds: payload.optionIds ?? [],
          answeredAt: now,
        });
        updateData.current_step_id = payload.nextStepId ?? payload.stepId;
        break;
      case "result_viewed":
        updateData.result_id = payload.resultId ?? null;
        updateData.current_step_id = payload.stepId ?? currentSession?.current_step_id ?? null;
        break;
      case "lead_submitted": {
        const leadValues = payload.lead?.values ?? {};
        const consent = Boolean(payload.lead?.consent);
        const email = typeof leadValues.email === "string" ? leadValues.email : null;
        const firstName = typeof leadValues["first-name"] === "string" ? leadValues["first-name"] : null;

        updateData.lead_captured_at = now;
        updateData.current_step_id = payload.nextStepId ?? payload.stepId ?? currentSession?.current_step_id ?? null;

        const { data: sessionUpsertData, error: sessionUpsertError } = currentSession
          ? await supabase
              .from("quiz_sessions")
              .update(updateData)
              .eq("id", currentSession.id)
              .select("*")
              .single()
          : await supabase
              .from("quiz_sessions")
              .insert(updateData)
              .select("*")
              .single();

        if (sessionUpsertError) {
          throw sessionUpsertError;
        }

        const sessionId = (sessionUpsertData as QuizSessionRow).id;

        const leadPayload: Record<string, unknown> = {
          quiz_definition_id: quizId,
          session_id: sessionId,
          email,
          first_name: firstName,
          consent,
          payload: leadValues,
          updated_at: now,
        };

        const { error: leadError } = await supabase
          .from("quiz_leads")
          .upsert(leadPayload, { onConflict: "session_id" });

        if (leadError) {
          throw leadError;
        }

        const { error: eventError } = await supabase
          .from("quiz_events")
          .insert({
            quiz_definition_id: quizId,
            session_id: sessionId,
            event_type: payload.eventType,
            step_id: payload.stepId ?? null,
            payload: {
              leadValues,
              consent,
            },
            occurred_at: now,
          });

        if (eventError) {
          throw eventError;
        }

        return sessionUpsertData;
      }
      case "offer_clicked":
        updateData.offer_clicked_at = now;
        updateData.current_step_id = payload.stepId ?? currentSession?.current_step_id ?? null;
        break;
      case "session_completed":
        updateData.completed_at = now;
        updateData.status = "completed";
        updateData.current_step_id = payload.stepId ?? currentSession?.current_step_id ?? null;
        break;
      case "session_started":
        updateData.current_step_id = payload.stepId ?? definitionRecord.definition.steps[0]?.id ?? null;
        break;
      default:
        break;
    }

    const { data: savedSession, error: saveError } = currentSession
      ? await supabase
          .from("quiz_sessions")
          .update(updateData)
          .eq("id", currentSession.id)
          .select("*")
          .single()
      : await supabase
          .from("quiz_sessions")
          .insert(updateData)
          .select("*")
          .single();

    if (saveError) {
      throw saveError;
    }

    const { error: eventError } = await supabase
      .from("quiz_events")
      .insert({
        quiz_definition_id: quizId,
        session_id: (savedSession as QuizSessionRow).id,
        event_type: payload.eventType,
        step_id: payload.stepId ?? null,
        payload: {
          optionIds: payload.optionIds ?? [],
          resultId: payload.resultId ?? null,
          nextStepId: payload.nextStepId ?? null,
          ctaUrl: payload.ctaUrl ?? null,
        },
        occurred_at: now,
      });

    if (eventError) {
      throw eventError;
    }

    return savedSession;
  },

  async getAnalytics(id: string, options: QuizServiceOptions = {}): Promise<QuizAnalyticsPayload> {
    const supabase = await getSupabase(options);
    const quiz = await this.getDefinitionById(id, { supabase });

    if (!quiz) {
      throw new Error("quiz definition not found");
    }

    const [{ data: sessionRows, error: sessionError }, { data: eventRows, error: eventError }] =
      await Promise.all([
        supabase
          .from("quiz_sessions")
          .select("*")
          .eq("quiz_definition_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("quiz_events")
          .select("session_id,event_type,step_id")
          .eq("quiz_definition_id", id),
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
    const offerStep = [...quiz.definition.steps].reverse().find((step) => step.kind === "offer") ?? null;
    const offerViewSessions = new Set(
      events
        .filter((event) => event.event_type === "step_viewed" && event.step_id === offerStep?.id)
        .map((event) => event.session_id),
    );
    const offerClickSessions = new Set(
      sessions
        .filter((session) => session.offer_clicked_at !== null)
        .map((session) => session.id),
    );

    const stepReachMap = new Map<string, Set<string>>();
    quiz.definition.steps.forEach((step) => {
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

    const funnel = quiz.definition.steps.map((step, index) => {
      const reachedSessions = stepReachMap.get(step.id)?.size ?? 0;
      const previousReached = index === 0 ? totalSessions : funnelSafeReach(stepReachMap, quiz.definition.steps[index - 1].id);
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

    const results = quiz.definition.results.map((result) => ({
      resultId: result.id,
      label: result.label,
      sessions: sessions.filter((session) => session.result_id === result.id).length,
    }));

    const sourceMap = new Map<
      string,
      { sessions: number; completedSessions: number; leadCaptures: number }
    >();

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
      quiz,
      summary: {
        sessions: totalSessions,
        completedSessions,
        completionRate: totalSessions === 0 ? 0 : Math.round((completedSessions / totalSessions) * 100),
        leadCaptures,
        leadCaptureRate: totalSessions === 0 ? 0 : Math.round((leadCaptures / totalSessions) * 100),
        offerViews: offerViewSessions.size,
        offerClicks: offerClickSessions.size,
        ctaCtr: offerViewSessions.size === 0 ? 0 : Math.round((offerClickSessions.size / offerViewSessions.size) * 100),
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
      funnel,
      results,
      recentSessions: sessions.slice(0, 25).map((session) => ({
        id: session.id,
        sessionToken: session.session_token,
        entrySource: session.entry_source,
        articleSlug: session.entry_article_slug,
        resultId: session.result_id,
        status: session.status,
        leadCapturedAt: session.lead_captured_at,
        offerClickedAt: session.offer_clicked_at,
        completedAt: session.completed_at,
        createdAt: session.created_at,
        answers: parseAnswers(session.answers),
      })),
    };
  },
};

function funnelSafeReach(stepReachMap: Map<string, Set<string>>, stepId: string) {
  return stepReachMap.get(stepId)?.size ?? 0;
}

export function isPublishedQuizDefinition(value: QuizDefinitionRecord | null): value is QuizDefinitionRecord {
  return Boolean(value && value.status === "published");
}

export function getQuizDefinitionFingerprint(value: QuizDefinitionRecord) {
  return getQuizStructureFingerprint(value.definition);
}
