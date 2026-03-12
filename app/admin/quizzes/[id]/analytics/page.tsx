"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, BarChart3, Download, ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface QuizAnalyticsPayload {
  quiz: {
    id: string;
    slug: string;
    name: string;
    status: "draft" | "published" | "archived";
    publishedAt: string | null;
    definition: {
      steps: Array<{
        id: string;
        kind: string;
        title: string;
      }>;
    };
  };
  summary: {
    sessions: number;
    completedSessions: number;
    completionRate: number;
    leadCaptures: number;
    leadCaptureRate: number;
    offerViews: number;
    offerClicks: number;
    ctaCtr: number;
  };
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
    kind: string;
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
    status: "active" | "completed";
    leadCapturedAt: string | null;
    offerClickedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    answers: Array<{
      stepId: string;
      optionIds: string[];
      answeredAt: string;
    }>;
  }>;
}

export default function QuizAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [payload, setPayload] = useState<QuizAnalyticsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(nextState: "initial" | "refresh") {
      if (nextState === "refresh") {
        setIsRefreshing(true);
      }

      try {
        const response = await fetch(`/api/quizzes/${id}/analytics`, { cache: "no-store" });
        const nextPayload = (await response.json()) as QuizAnalyticsPayload | { error?: string };
        if (!response.ok) {
          throw new Error("error" in nextPayload ? nextPayload.error ?? "failed to load analytics" : "failed to load analytics");
        }

        if (!cancelled) {
          setPayload(nextPayload as QuizAnalyticsPayload);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "failed to load analytics");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    void load("initial");

    return () => {
      cancelled = true;
    };
  }, [id]);

  const topDropOff = useMemo(() => {
    if (!payload) {
      return null;
    }

    return [...payload.funnel].sort((left, right) => right.dropOffCount - left.dropOffCount)[0] ?? null;
  }, [payload]);

  const exportReport = () => {
    if (!payload) {
      return;
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${payload.quiz.slug}-analytics-${Date.now()}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const refresh = async () => {
    setIsRefreshing(true);

    try {
      const response = await fetch(`/api/quizzes/${id}/analytics`, { cache: "no-store" });
      const nextPayload = (await response.json()) as QuizAnalyticsPayload | { error?: string };
      if (!response.ok) {
        throw new Error("error" in nextPayload ? nextPayload.error ?? "failed to load analytics" : "failed to load analytics");
      }

      setPayload(nextPayload as QuizAnalyticsPayload);
      setError(null);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "failed to load analytics");
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-[1.6rem]" />
          ))}
        </div>
        <Skeleton className="h-[460px] rounded-[1.8rem]" />
      </div>
    );
  }

  if (!payload) {
    return (
      <Card className="rounded-[1.8rem] border-destructive/30">
        <CardHeader>
          <CardTitle>analytics unavailable</CardTitle>
          <CardDescription>{error ?? "no analytics payload returned"}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Link
            href={`/admin/quizzes/${payload.quiz.id}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            back to editor
          </Link>
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">analytics</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">{payload.quiz.name}</h1>
            <div className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">
              /{payload.quiz.slug}
            </div>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            step reach, drop-off, result distribution, lead capture, cta click-through, and source attribution.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={refresh} disabled={isRefreshing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
            refresh
          </Button>
          <Button variant="outline" onClick={exportReport}>
            <Download className="mr-2 h-4 w-4" />
            export json
          </Button>
          {payload.quiz.status === "published" ? (
            <Button asChild>
              <Link href={`/quiz/${payload.quiz.slug}`} target="_blank">
                open live funnel
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="sessions"
          value={String(payload.summary.sessions)}
          detail={`${payload.summary.completedSessions} completed`}
        />
        <MetricCard
          title="completion"
          value={`${payload.summary.completionRate}%`}
          detail={`${payload.summary.completedSessions}/${payload.summary.sessions || 0} reached the end`}
        />
        <MetricCard
          title="lead capture"
          value={`${payload.summary.leadCaptureRate}%`}
          detail={`${payload.summary.leadCaptures} captured`}
        />
        <MetricCard
          title="cta ctr"
          value={`${payload.summary.ctaCtr}%`}
          detail={`${payload.summary.offerClicks}/${payload.summary.offerViews} offer viewers clicked`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_420px]">
        <Card className="rounded-[1.8rem]">
          <CardHeader>
            <CardTitle>funnel reach</CardTitle>
            <CardDescription>exact step reach and step-to-step drop-off from the event stream.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {payload.funnel.map((step, index) => (
              <div key={step.stepId} className="rounded-[1.4rem] border border-border/70 bg-muted/20 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      step {index + 1} · {step.kind}
                    </p>
                    <p className="mt-2 text-lg font-black leading-tight">{step.title}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background px-3 py-2 text-right">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">reach</p>
                    <p className="text-xl font-black">{step.reachedSessions}</p>
                    <p className="text-xs text-muted-foreground">{step.reachRate}%</p>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${step.reachRate}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <span>drop-off {step.dropOffCount}</span>
                  <span>{step.dropOffRate}% of sessions</span>
                  <span>{step.stepId}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-[1.8rem]">
            <CardHeader>
              <CardTitle>where the drag appears</CardTitle>
              <CardDescription>highest observed drop-off point in the live funnel.</CardDescription>
            </CardHeader>
            <CardContent>
              {topDropOff ? (
                <div className="rounded-[1.4rem] border border-border/70 bg-muted/20 p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{topDropOff.kind}</p>
                  <p className="mt-2 text-xl font-black leading-tight">{topDropOff.title}</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {topDropOff.dropOffCount} sessions dropped before the next step. that is {topDropOff.dropOffRate}% of all sessions.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">no funnel data yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.8rem]">
            <CardHeader>
              <CardTitle>result distribution</CardTitle>
              <CardDescription>which result profile is winning most often.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {payload.results.map((result) => {
                const reachRate = payload.summary.sessions === 0
                  ? 0
                  : Math.round((result.sessions / payload.summary.sessions) * 100);
                return (
                  <div key={result.resultId} className="rounded-[1.3rem] border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black">{result.label}</p>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{result.resultId}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black">{result.sessions}</p>
                        <p className="text-xs text-muted-foreground">{reachRate}%</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-[1.8rem]">
            <CardHeader>
              <CardTitle>entry sources</CardTitle>
              <CardDescription>source-tagged sessions across home, article, and direct entry.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {payload.sources.length > 0 ? payload.sources.map((source) => (
                <div key={source.source} className="rounded-[1.3rem] border border-border/70 bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black">{source.source.replace(/-/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {source.completedSessions} completed · {source.leadCaptures} leads
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black">{source.sessions}</p>
                      <p className="text-xs text-muted-foreground">
                        {source.completionRate}% complete · {source.leadCaptureRate}% lead
                      </p>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">no source data yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-[1.8rem]">
        <CardHeader>
          <CardTitle>recent sessions</CardTitle>
          <CardDescription>raw recent sessions for debugging analytics against actual event-driven state.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {payload.recentSessions.length > 0 ? payload.recentSessions.map((session) => (
            <div key={session.id} className="rounded-[1.4rem] border border-border/70 bg-muted/20 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <SessionPill>{session.status}</SessionPill>
                    <SessionPill>{session.entrySource ?? "unknown"}</SessionPill>
                    {session.articleSlug ? <SessionPill>article:{session.articleSlug}</SessionPill> : null}
                    {session.resultId ? <SessionPill>result:{session.resultId}</SessionPill> : null}
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{session.sessionToken}</p>
                  <p className="text-sm text-muted-foreground">
                    started {formatDateTime(session.createdAt)}
                    {session.completedAt ? ` · completed ${formatDateTime(session.completedAt)}` : ""}
                    {session.leadCapturedAt ? ` · lead ${formatDateTime(session.leadCapturedAt)}` : ""}
                    {session.offerClickedAt ? ` · cta ${formatDateTime(session.offerClickedAt)}` : ""}
                  </p>
                </div>
                <div className="rounded-[1.3rem] border border-border bg-background px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">answers</p>
                  <p className="mt-1 text-lg font-black">{session.answers.length}</p>
                </div>
              </div>

              {session.answers.length > 0 ? (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {session.answers.map((answer) => (
                    <div key={`${session.id}-${answer.stepId}`} className="rounded-[1.15rem] border border-border bg-background px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{answer.stepId}</p>
                          <p className="mt-2 text-sm font-semibold text-foreground">{answer.optionIds.join(", ") || "no options"}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDateTime(answer.answeredAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )) : (
            <div className="rounded-[1.4rem] border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              no recent sessions yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="rounded-[1.6rem] border-border/70 bg-card/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-3xl font-black tracking-tight">{value}</p>
            <p className="text-sm text-muted-foreground">{detail}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
      <Sparkles className="mr-1.5 h-3 w-3" />
      {children}
    </span>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}
