"use client";

import { use, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, Monitor, RotateCcw, Smartphone } from "lucide-react";
import QuizExperience from "@/components/quiz/QuizExperience";
import AdminStatusBadge from "@/components/admin/ui/AdminStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { QuizDefinition, QuizResultProfile, QuizStep } from "@/lib/quizzes/schema";

interface QuizDefinitionRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  schemaVersion: string;
  definition: QuizDefinition;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function QuizDefinitionEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [quiz, setQuiz] = useState<QuizDefinitionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [previewViewport, setPreviewViewport] = useState<"mobile" | "desktop">("mobile");
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/quizzes/${id}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("failed to load quiz definition");
        }

        const payload = (await response.json()) as QuizDefinitionRecord;
        if (!cancelled) {
          setQuiz(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "failed to load quiz definition");
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
  }, [id]);

  const syncQuiz = (mutator: (draft: QuizDefinitionRecord) => void) => {
    setQuiz((current) => {
      if (!current) {
        return current;
      }

      const draft = structuredClone(current) as QuizDefinitionRecord;
      mutator(draft);
      draft.name = draft.definition.name;
      draft.description = draft.definition.description;
      return draft;
    });
  };

  const handleSave = async () => {
    if (!quiz) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/quizzes/${id}`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: quiz.definition.name,
          description: quiz.definition.description,
          status: quiz.status,
          definition: quiz.definition,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "failed to save quiz definition");
      }

      setQuiz(payload as QuizDefinitionRecord);
      setSaveMessage("saved");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "failed to save quiz definition");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-[920px] rounded-[1.8rem]" />
        <Skeleton className="h-[420px] rounded-[1.8rem]" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <Card className="rounded-[1.8rem]">
        <CardHeader>
          <CardTitle>quiz definition missing</CardTitle>
          <CardDescription>{error ?? "no quiz definition returned"}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">quiz reset editor</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">{quiz.definition.name}</h1>
            <AdminStatusBadge status={quiz.status} />
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            production and preview share the same renderer. structure stays locked to cli publish. browser editing is for copy, result content, and publish state.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href={`/admin/quizzes/${quiz.id}/analytics`}>analytics</Link>
          </Button>
          {quiz.status === "published" ? (
            <Button asChild variant="outline">
              <Link href={`/quiz/${quiz.slug}`} target="_blank">
                open live funnel
                <ExternalLink className="h-4 w-4" strokeWidth={1.2} />
              </Link>
            </Button>
          ) : null}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "saving..." : "save changes"}
          </Button>
        </div>
      </div>

      {error ? <Banner tone="error" text={error} /> : null}
      {saveMessage ? <Banner tone="success" text={saveMessage} /> : null}

      <Card className="rounded-[1.8rem] border-border/70">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>production-accurate preview</CardTitle>
              <CardDescription>
                preview runs the same monochrome renderer as production. desktop mode keeps the mobile-first stage centered instead of inventing a second layout.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={previewViewport === "mobile" ? "default" : "outline"}
                onClick={() => setPreviewViewport("mobile")}
              >
                <Smartphone className="h-4 w-4" strokeWidth={1.2} />
                mobile
              </Button>
              <Button
                type="button"
                variant={previewViewport === "desktop" ? "default" : "outline"}
                onClick={() => setPreviewViewport("desktop")}
              >
                <Monitor className="h-4 w-4" strokeWidth={1.2} />
                desktop
              </Button>
              <Button type="button" variant="outline" onClick={() => setPreviewKey((current) => current + 1)}>
                <RotateCcw className="h-4 w-4" strokeWidth={1.2} />
                restart preview
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "mx-auto transition-all duration-200",
              previewViewport === "mobile" ? "max-w-[430px]" : "max-w-[900px]",
            )}
          >
            <QuizExperience
              key={`${quiz.id}-${previewKey}`}
              articleSlug={null}
              className="rounded-[1.8rem]"
              embedded
              entrySource="admin-preview"
              mode="preview"
              quiz={quiz.definition}
              quizId={quiz.id}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="rounded-[1.8rem]">
          <CardHeader>
            <CardTitle>metadata and publish state</CardTitle>
            <CardDescription>slug and structure are controlled by the git spec. publish state stays editable here.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-2">
            <Field label="name">
              <Input
                value={quiz.definition.name}
                onChange={(event) =>
                  syncQuiz((draft) => {
                    draft.definition.name = event.target.value;
                  })
                }
              />
            </Field>
            <Field label="status">
              <Select
                value={quiz.status}
                onValueChange={(value) =>
                  syncQuiz((draft) => {
                    draft.status = value as QuizDefinitionRecord["status"];
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">draft</SelectItem>
                  <SelectItem value="published">published</SelectItem>
                  <SelectItem value="archived">archived</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="slug">
              <Input value={quiz.slug} disabled />
            </Field>
            <Field label="schema version">
              <Input value={quiz.schemaVersion} disabled />
            </Field>
            <div className="lg:col-span-2">
              <Field label="description">
                <Textarea
                  rows={4}
                  value={quiz.definition.description}
                  onChange={(event) =>
                    syncQuiz((draft) => {
                      draft.definition.description = event.target.value;
                    })
                  }
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.8rem]">
          <CardHeader>
            <CardTitle>locked design system</CardTitle>
            <CardDescription>theme drift is intentionally removed from admin. this funnel ships on one approved visual system only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ReadonlyField label="variant" value={quiz.definition.theme.variant} />
            <ReadonlyField label="typeface" value={quiz.definition.theme.typeface} />
            <ReadonlyField label="motion" value={quiz.definition.theme.motion} />
            <div className="rounded-[1.4rem] border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              monochrome shell, sans-only typography, single dominant stage, lucide at `1.2`, no right rail, no freeform admin token editing.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[1.8rem]">
        <CardHeader>
          <CardTitle>results</CardTitle>
          <CardDescription>result messaging, graph copy, metrics, and criteria stay editable. result ids and scoring remain locked to the cli spec.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {quiz.definition.results.map((result) => (
            <ResultEditor
              key={result.id}
              result={result}
              onChange={(nextResult) =>
                syncQuiz((draft) => {
                  draft.definition.results = draft.definition.results.map((candidate) =>
                    candidate.id === nextResult.id ? nextResult : candidate,
                  );
                })
              }
            />
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[1.8rem]">
        <CardHeader>
          <CardTitle>step content</CardTitle>
          <CardDescription>step order, ids, branching, and timings stay locked. copy and step-facing content stay editable.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {quiz.definition.steps.map((step, index) => (
            <details key={step.id} className="rounded-[1.4rem] border border-border bg-muted/20 p-5">
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      step {index + 1} · {step.kind}
                    </p>
                    <p className="mt-2 text-lg font-black">{step.title}</p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{step.id}</p>
                </div>
              </summary>
              <div className="mt-5 grid gap-5">
                <StepEditor
                  step={step}
                  onChange={(nextStep) =>
                    syncQuiz((draft) => {
                      draft.definition.steps = draft.definition.steps.map((candidate) =>
                        candidate.id === nextStep.id ? nextStep : candidate,
                      );
                    })
                  }
                />
              </div>
            </details>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Banner({ tone, text }: { tone: "success" | "error"; text: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        tone === "success"
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-red-300 bg-red-50 text-red-700",
      )}
    >
      {text}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-border bg-muted/20 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function ResultEditor({
  result,
  onChange,
}: {
  result: QuizResultProfile;
  onChange: (result: QuizResultProfile) => void;
}) {
  const update = <K extends keyof QuizResultProfile>(key: K, value: QuizResultProfile[K]) => {
    onChange({ ...result, [key]: value });
  };

  return (
    <div className="rounded-[1.5rem] border border-border bg-muted/20 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{result.id}</p>
          <p className="text-xl font-black">{result.label}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="label">
          <Input value={result.label} onChange={(event) => update("label", event.target.value)} />
        </Field>
        <Field label="badge">
          <Input value={result.badge} onChange={(event) => update("badge", event.target.value)} />
        </Field>
        <div className="lg:col-span-2">
          <Field label="headline">
            <Input value={result.headline} onChange={(event) => update("headline", event.target.value)} />
          </Field>
        </div>
        <div className="lg:col-span-2">
          <Field label="affirmation">
            <Textarea rows={3} value={result.affirmation} onChange={(event) => update("affirmation", event.target.value)} />
          </Field>
        </div>
        <div className="lg:col-span-2">
          <Field label="summary">
            <Textarea rows={4} value={result.summary} onChange={(event) => update("summary", event.target.value)} />
          </Field>
        </div>
        <div className="lg:col-span-2">
          <Field label="mechanism">
            <Textarea rows={4} value={result.mechanism} onChange={(event) => update("mechanism", event.target.value)} />
          </Field>
        </div>
        <div className="lg:col-span-2">
          <Field label="education bullets">
            <Textarea rows={4} value={result.educationBullets.join("\n")} onChange={(event) => update("educationBullets", toLines(event.target.value))} />
          </Field>
        </div>
        <div className="lg:col-span-2">
          <Field label="dopamine candies">
            <Textarea rows={4} value={result.dopamineCandies.join("\n")} onChange={(event) => update("dopamineCandies", toLines(event.target.value))} />
          </Field>
        </div>
        <div className="lg:col-span-2">
          <Field label="offer bridge">
            <Textarea rows={4} value={result.offerBridge} onChange={(event) => update("offerBridge", event.target.value)} />
          </Field>
        </div>
        <Field label="graph title">
          <Input value={result.graphTitle} onChange={(event) => update("graphTitle", event.target.value)} />
        </Field>
        <div className="lg:col-span-1">
          <Field label="graph caption">
            <Textarea rows={3} value={result.graphCaption} onChange={(event) => update("graphCaption", event.target.value)} />
          </Field>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">graph metrics</p>
          {result.metrics.map((metric) => (
            <div key={metric.id} className="rounded-[1.25rem] border border-border bg-white p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{metric.id}</p>
              <div className="mt-3 grid gap-4">
                <Field label="label">
                  <Input
                    value={metric.label}
                    onChange={(event) =>
                      update(
                        "metrics",
                        result.metrics.map((candidate) =>
                          candidate.id === metric.id ? { ...candidate, label: event.target.value } : candidate,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="value">
                  <Input
                    type="number"
                    value={metric.value}
                    onChange={(event) =>
                      update(
                        "metrics",
                        result.metrics.map((candidate) =>
                          candidate.id === metric.id
                            ? { ...candidate, value: clampMetricValue(event.target.value) }
                            : candidate,
                        ),
                      )
                    }
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">criteria cards</p>
          {result.criteria.map((criterion) => (
            <div key={criterion.id} className="rounded-[1.25rem] border border-border bg-white p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{criterion.id}</p>
              <div className="mt-3 grid gap-4">
                <Field label="label">
                  <Input
                    value={criterion.label}
                    onChange={(event) =>
                      update(
                        "criteria",
                        result.criteria.map((candidate) =>
                          candidate.id === criterion.id ? { ...candidate, label: event.target.value } : candidate,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="emphasis">
                  <Select
                    value={criterion.emphasis}
                    onValueChange={(value) =>
                      update(
                        "criteria",
                        result.criteria.map((candidate) =>
                          candidate.id === criterion.id
                            ? {
                                ...candidate,
                                emphasis: value as QuizResultProfile["criteria"][number]["emphasis"],
                              }
                            : candidate,
                        ),
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">high</SelectItem>
                      <SelectItem value="steady">steady</SelectItem>
                      <SelectItem value="watch">watch</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="detail">
                  <Textarea
                    rows={4}
                    value={criterion.detail}
                    onChange={(event) =>
                      update(
                        "criteria",
                        result.criteria.map((candidate) =>
                          candidate.id === criterion.id ? { ...candidate, detail: event.target.value } : candidate,
                        ),
                      )
                    }
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepEditor({
  step,
  onChange,
}: {
  step: QuizStep;
  onChange: (step: QuizStep) => void;
}) {
  const update = <K extends keyof QuizStep>(key: K, value: QuizStep[K]) => {
    onChange({ ...step, [key]: value } as QuizStep);
  };

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="kicker">
          <Input value={step.kicker ?? ""} onChange={(event) => update("kicker", event.target.value as never)} />
        </Field>
        <Field label="title">
          <Input value={step.title} onChange={(event) => update("title", event.target.value as never)} />
        </Field>
      </div>

      <Field label="body">
        <Textarea value={step.body ?? ""} rows={4} onChange={(event) => update("body", event.target.value as never)} />
      </Field>

      {step.kind === "welcome" ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="primary label">
              <Input value={step.primaryLabel} onChange={(event) => onChange({ ...step, primaryLabel: event.target.value })} />
            </Field>
            <Field label="secondary label">
              <Input value={step.secondaryLabel ?? ""} onChange={(event) => onChange({ ...step, secondaryLabel: event.target.value })} />
            </Field>
          </div>
          <Field label="trust points">
            <Textarea value={step.trustPoints.join("\n")} rows={4} onChange={(event) => onChange({ ...step, trustPoints: toLines(event.target.value) })} />
          </Field>
        </>
      ) : null}

      {step.kind === "question" ? (
        <div className="space-y-4">
          {step.selection === "multiple" ? (
            <Field label="continue label">
              <Input value={step.continueLabel ?? ""} onChange={(event) => onChange({ ...step, continueLabel: event.target.value })} />
            </Field>
          ) : null}

          {step.options.map((option) => (
            <div key={option.id} className="rounded-[1.25rem] border border-border bg-white p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{option.id}</p>
              <div className="mt-3 grid gap-4">
                <Field label="label">
                  <Input
                    value={option.label}
                    onChange={(event) =>
                      onChange({
                        ...step,
                        options: step.options.map((candidate) =>
                          candidate.id === option.id ? { ...candidate, label: event.target.value } : candidate,
                        ),
                      })
                    }
                  />
                </Field>
                <Field label="description">
                  <Textarea
                    rows={3}
                    value={option.description ?? ""}
                    onChange={(event) =>
                      onChange({
                        ...step,
                        options: step.options.map((candidate) =>
                          candidate.id === option.id ? { ...candidate, description: event.target.value } : candidate,
                        ),
                      })
                    }
                  />
                </Field>
                <Field label="reveal note">
                  <Input
                    value={option.revealNote ?? ""}
                    onChange={(event) =>
                      onChange({
                        ...step,
                        options: step.options.map((candidate) =>
                          candidate.id === option.id ? { ...candidate, revealNote: event.target.value } : candidate,
                        ),
                      })
                    }
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {step.kind === "message" ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="primary label">
              <Input value={step.primaryLabel} onChange={(event) => onChange({ ...step, primaryLabel: event.target.value })} />
            </Field>
            <Field label="secondary label">
              <Input value={step.secondaryLabel ?? ""} onChange={(event) => onChange({ ...step, secondaryLabel: event.target.value })} />
            </Field>
          </div>
          <Field label="bullets">
            <Textarea value={(step.bullets ?? []).join("\n")} rows={4} onChange={(event) => onChange({ ...step, bullets: toLines(event.target.value) })} />
          </Field>
          {step.highlights?.length ? (
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">highlights</p>
              {step.highlights.map((highlight) => (
                <div key={highlight.id} className="rounded-[1.25rem] border border-border bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{highlight.id}</p>
                  <div className="mt-3 grid gap-4 lg:grid-cols-2">
                    <Field label="label">
                      <Input
                        value={highlight.label}
                        onChange={(event) =>
                          onChange({
                            ...step,
                            highlights: step.highlights?.map((candidate) =>
                              candidate.id === highlight.id ? { ...candidate, label: event.target.value } : candidate,
                            ),
                          })
                        }
                      />
                    </Field>
                    <Field label="value">
                      <Input
                        value={highlight.value}
                        onChange={(event) =>
                          onChange({
                            ...step,
                            highlights: step.highlights?.map((candidate) =>
                              candidate.id === highlight.id ? { ...candidate, value: event.target.value } : candidate,
                            ),
                          })
                        }
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {step.kind === "analysis" ? (
        <div className="space-y-4">
          <div className="rounded-[1.25rem] border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            stage count and timings are locked to cli publish. labels and descriptions remain editable here so preview stays accurate.
          </div>
          {step.stages.map((stage) => (
            <div key={stage.id} className="rounded-[1.25rem] border border-border bg-white p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{stage.id}</p>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <Field label="label">
                  <Input
                    value={stage.label}
                    onChange={(event) =>
                      onChange({
                        ...step,
                        stages: step.stages.map((candidate) =>
                          candidate.id === stage.id ? { ...candidate, label: event.target.value } : candidate,
                        ),
                      })
                    }
                  />
                </Field>
                <Field label="duration">
                  <Input value={`${stage.durationMs}ms`} disabled />
                </Field>
                <div className="lg:col-span-2">
                  <Field label="description">
                    <Input
                      value={stage.description ?? ""}
                      onChange={(event) =>
                        onChange({
                          ...step,
                          stages: step.stages.map((candidate) =>
                            candidate.id === stage.id ? { ...candidate, description: event.target.value } : candidate,
                          ),
                        })
                      }
                    />
                  </Field>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {step.kind === "result" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="primary label">
            <Input value={step.primaryLabel} onChange={(event) => onChange({ ...step, primaryLabel: event.target.value })} />
          </Field>
          <Field label="secondary label">
            <Input value={step.secondaryLabel ?? ""} onChange={(event) => onChange({ ...step, secondaryLabel: event.target.value })} />
          </Field>
          <div className="lg:col-span-2">
            <Field label="disclaimer">
              <Input value={step.disclaimer} onChange={(event) => onChange({ ...step, disclaimer: event.target.value })} />
            </Field>
          </div>
        </div>
      ) : null}

      {step.kind === "lead" ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="submit label">
              <Input value={step.submitLabel} onChange={(event) => onChange({ ...step, submitLabel: event.target.value })} />
            </Field>
            <Field label="consent label">
              <Input value={step.consentLabel} onChange={(event) => onChange({ ...step, consentLabel: event.target.value })} />
            </Field>
          </div>
          <Field label="disclaimer">
            <Textarea value={step.disclaimer} rows={4} onChange={(event) => onChange({ ...step, disclaimer: event.target.value })} />
          </Field>
          <div className="space-y-4">
            {step.fields.map((field) => (
              <div key={field.id} className="rounded-[1.25rem] border border-border bg-white p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{field.id}</p>
                <div className="mt-3 grid gap-4 lg:grid-cols-2">
                  <Field label="label">
                    <Input
                      value={field.label}
                      onChange={(event) =>
                        onChange({
                          ...step,
                          fields: step.fields.map((candidate) =>
                            candidate.id === field.id ? { ...candidate, label: event.target.value } : candidate,
                          ),
                        })
                      }
                    />
                  </Field>
                  <Field label="placeholder">
                    <Input
                      value={field.placeholder}
                      onChange={(event) =>
                        onChange({
                          ...step,
                          fields: step.fields.map((candidate) =>
                            candidate.id === field.id ? { ...candidate, placeholder: event.target.value } : candidate,
                          ),
                        })
                      }
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {step.kind === "offer" ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="cta label">
              <Input value={step.ctaLabel} onChange={(event) => onChange({ ...step, ctaLabel: event.target.value })} />
            </Field>
            <Field label="cta url">
              <Input value={step.ctaUrl} onChange={(event) => onChange({ ...step, ctaUrl: event.target.value })} />
            </Field>
            <Field label="note">
              <Input value={step.note ?? ""} onChange={(event) => onChange({ ...step, note: event.target.value })} />
            </Field>
            <Field label="guarantee">
              <Input value={step.guarantee ?? ""} onChange={(event) => onChange({ ...step, guarantee: event.target.value })} />
            </Field>
          </div>
          <Field label="bullets">
            <Textarea value={step.bullets.join("\n")} rows={4} onChange={(event) => onChange({ ...step, bullets: toLines(event.target.value) })} />
          </Field>
        </>
      ) : null}
    </>
  );
}

function clampMetricValue(value: string) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return 1;
  }

  return Math.max(1, Math.min(100, Math.round(parsed)));
}

function toLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
