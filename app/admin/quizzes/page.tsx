"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AdminStatusBadge from "@/components/admin/ui/AdminStatusBadge";
import { Layers, Sparkles, TrendingUp } from "lucide-react";

interface QuizListItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  updatedAt: string;
  sessions: number;
  completedSessions: number;
  completionRate: number;
}

export default function QuizDashboard() {
  const [items, setItems] = useState<QuizListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/quizzes", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("failed to load quiz definitions");
        }

        const payload = (await response.json()) as QuizListItem[];
        if (!cancelled) {
          setItems(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "failed to load quiz definitions");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalSessions = items.reduce((sum, item) => sum + item.sessions, 0);
  const averageCompletion =
    items.length === 0 ? 0 : Math.round(items.reduce((sum, item) => sum + item.completionRate, 0) / items.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">quiz platform</p>
          <h1 className="text-3xl font-black tracking-tight">schema-first funnels</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            cli is the source of truth. admin is for content, preview, publishing, and analytics.
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          use <code>npm run quiz:publish -- content/quizzes/symptom-profile-v2.json --env production</code>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="definitions" value={String(items.length)} icon={<Layers className="h-4 w-4" />} />
        <StatCard title="sessions" value={String(totalSessions)} icon={<Sparkles className="h-4 w-4" />} />
        <StatCard title="avg completion" value={`${averageCompletion}%`} icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-52 rounded-3xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="rounded-3xl border-destructive/30">
          <CardHeader>
            <CardTitle>failed to load quiz definitions</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id} className="rounded-[1.8rem] border-border/70 bg-card/70 shadow-sm">
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl font-black">{item.name}</CardTitle>
                    <CardDescription className="mt-2">/{item.slug}</CardDescription>
                  </div>
                  <AdminStatusBadge status={item.status} />
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {item.description ?? "no description yet"}
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <MetricChip label="sessions" value={String(item.sessions)} />
                  <MetricChip label="completed" value={String(item.completedSessions)} />
                  <MetricChip label="rate" value={`${item.completionRate}%`} />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href={`/admin/quizzes/${item.id}`}>edit content</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/admin/quizzes/${item.id}/analytics`}>analytics</Link>
                  </Button>
                  {item.status === "published" ? (
                    <Button asChild variant="ghost">
                      <Link href={`/quiz/${item.slug}`} target="_blank">
                        open live funnel
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <Card className="rounded-[1.6rem] border-border/70 bg-card/70">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/40 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </div>
  );
}
