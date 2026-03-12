"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";
import { Check, ChevronLeft, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  advanceQuizSnapshot,
  createInitialQuizSnapshot,
  getQuizProgress,
  getStepById,
  resolveResultProfile,
  retreatQuizSnapshot,
  type QuizSessionSnapshot,
} from "@/lib/quizzes/engine";
import type { QuizDefinition, QuizLeadField, QuizStep } from "@/lib/quizzes/schema";

const STORAGE_PREFIX = "quiz-funnel";

function generateSessionToken() {
  return `qf_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildStorageKey(slug: string) {
  return `${STORAGE_PREFIX}:${slug}`;
}

interface QuizPlayerClientProps {
  quizId: string;
  quiz: QuizDefinition;
  entrySource: string;
  articleSlug: string | null;
}

export default function QuizPlayerClient({
  quizId,
  quiz,
  entrySource,
  articleSlug,
}: QuizPlayerClientProps) {
  const [snapshot, setSnapshot] = useState<QuizSessionSnapshot | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [leadValues, setLeadValues] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [draftStepId, setDraftStepId] = useState<string | null>(null);
  const completionSentRef = useRef(false);
  const lastViewedRef = useRef<string | null>(null);

  const currentStep = snapshot ? getStepById(quiz, snapshot.currentStepId) : null;
  const resultProfile = resolveResultProfile(quiz, snapshot?.answers ?? []);
  const progress = currentStep
    ? getQuizProgress(quiz, currentStep.id)
    : { current: 0, total: quiz.steps.length, percent: 0 };

  const sendEvent = useCallback(async (payload: Record<string, unknown>) => {
    try {
      await fetch(`/api/quizzes/${quizId}/events`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch (error) {
      console.error("quiz event failed", error);
    }
  }, [quizId]);

  const persistSnapshot = useCallback((nextSnapshot: QuizSessionSnapshot) => {
    localStorage.setItem(buildStorageKey(quiz.slug), JSON.stringify(nextSnapshot));
  }, [quiz.slug]);

  useEffect(() => {
    const stored = localStorage.getItem(buildStorageKey(quiz.slug));
    let initialSnapshot: QuizSessionSnapshot;
    let isNewSession = false;

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as QuizSessionSnapshot;
        if (parsed && typeof parsed.sessionToken === "string" && typeof parsed.currentStepId === "string") {
          initialSnapshot = parsed;
        } else {
          initialSnapshot = createInitialQuizSnapshot(quiz, generateSessionToken());
          isNewSession = true;
        }
      } catch {
        initialSnapshot = createInitialQuizSnapshot(quiz, generateSessionToken());
        isNewSession = true;
      }
    } else {
      initialSnapshot = createInitialQuizSnapshot(quiz, generateSessionToken());
      isNewSession = true;
    }

    startTransition(() => {
      setSnapshot(initialSnapshot);
      setIsBooting(false);
    });

    if (isNewSession) {
      void sendEvent({
        sessionToken: initialSnapshot.sessionToken,
        eventType: "session_started",
        stepId: initialSnapshot.currentStepId,
        source: entrySource,
        articleSlug,
        landingPath: window.location.pathname + window.location.search,
        referrer: document.referrer || null,
      });
    }
  }, [articleSlug, entrySource, quiz, sendEvent]);

  useEffect(() => {
    if (!snapshot || !currentStep) {
      return;
    }

    const marker = `${snapshot.sessionToken}:${currentStep.id}:${snapshot.trail.length}`;
    if (lastViewedRef.current === marker) {
      return;
    }

    lastViewedRef.current = marker;

    void sendEvent({
      sessionToken: snapshot.sessionToken,
      eventType: "step_viewed",
      stepId: currentStep.id,
      source: entrySource,
      articleSlug,
      landingPath: window.location.pathname + window.location.search,
    });

    if (currentStep.kind === "result") {
      void sendEvent({
        sessionToken: snapshot.sessionToken,
        eventType: "result_viewed",
        stepId: currentStep.id,
        resultId: resultProfile.id,
      });
    }

    if (currentStep.kind === "offer" && !completionSentRef.current) {
      completionSentRef.current = true;
      void sendEvent({
        sessionToken: snapshot.sessionToken,
        eventType: "session_completed",
        stepId: currentStep.id,
      });
    }
  }, [articleSlug, currentStep, entrySource, resultProfile.id, sendEvent, snapshot]);

  if (isBooting || !snapshot || !currentStep) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: quiz.theme.canvasColor }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: quiz.theme.accentColor }} />
      </div>
    );
  }

  const shellStyle = {
    "--quiz-canvas": quiz.theme.canvasColor,
    "--quiz-panel": quiz.theme.panelColor,
    "--quiz-ink": quiz.theme.inkColor,
    "--quiz-accent": quiz.theme.accentColor,
    "--quiz-accent-soft": quiz.theme.accentSoftColor,
    "--quiz-edge": quiz.theme.edgeColor,
    "--quiz-success": quiz.theme.successColor,
    "--quiz-display-font": quiz.theme.displayFont,
    "--quiz-body-font": quiz.theme.bodyFont,
  } as CSSProperties;

  const savedAnswer =
    currentStep.kind === "question"
      ? snapshot.answers.find((answer) => answer.stepId === currentStep.id)
      : null;
  const savedSelectedOptions = savedAnswer?.optionIds ?? [];
  const savedLeadValues =
    currentStep.kind === "lead" ? snapshot.leadSubmission?.values ?? {} : {};
  const savedConsent =
    currentStep.kind === "lead" ? snapshot.leadSubmission?.consent ?? false : false;
  const draftMatchesCurrentStep = draftStepId === currentStep.id;
  const resolvedSelectedOptions = draftMatchesCurrentStep ? selectedOptions : savedSelectedOptions;
  const resolvedLeadValues = draftMatchesCurrentStep ? leadValues : savedLeadValues;
  const resolvedConsent = draftMatchesCurrentStep ? consent : savedConsent;
  const resolvedSubmissionError = draftMatchesCurrentStep ? submissionError : null;

  const resetDraftState = () => {
    setDraftStepId(null);
    setSelectedOptions([]);
    setLeadValues({});
    setConsent(false);
    setSubmissionError(null);
  };

  const handleAdvance = () => {
    try {
      const nextSnapshot = advanceQuizSnapshot(quiz, snapshot, { stepId: currentStep.id });
      persistSnapshot(nextSnapshot);
      resetDraftState();
      startTransition(() => setSnapshot(nextSnapshot));
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to advance";
      setSubmissionError(message);
    }
  };

  const handleSingleSelect = (optionId: string) => {
    try {
      const nextSnapshot = advanceQuizSnapshot(quiz, snapshot, {
        stepId: currentStep.id,
        optionIds: [optionId],
      });
      persistSnapshot(nextSnapshot);
      resetDraftState();
      void sendEvent({
        sessionToken: snapshot.sessionToken,
        eventType: "answer_submitted",
        stepId: currentStep.id,
        nextStepId: nextSnapshot.currentStepId,
        optionIds: [optionId],
      });
      startTransition(() => setSnapshot(nextSnapshot));
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to submit answer";
      setSubmissionError(message);
    }
  };

  const handleMultiSelectContinue = () => {
    try {
      const nextSnapshot = advanceQuizSnapshot(quiz, snapshot, {
        stepId: currentStep.id,
        optionIds: resolvedSelectedOptions,
      });
      persistSnapshot(nextSnapshot);
      resetDraftState();
      void sendEvent({
        sessionToken: snapshot.sessionToken,
        eventType: "answer_submitted",
        stepId: currentStep.id,
        nextStepId: nextSnapshot.currentStepId,
        optionIds: resolvedSelectedOptions,
      });
      startTransition(() => setSnapshot(nextSnapshot));
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to submit answers";
      setSubmissionError(message);
    }
  };

  const handleLeadSubmit = () => {
    try {
      const nextSnapshot = advanceQuizSnapshot(quiz, snapshot, {
        stepId: currentStep.id,
        leadValues: resolvedLeadValues,
        consent: resolvedConsent,
      });
      persistSnapshot(nextSnapshot);
      resetDraftState();
      void sendEvent({
        sessionToken: snapshot.sessionToken,
        eventType: "lead_submitted",
        stepId: currentStep.id,
        nextStepId: nextSnapshot.currentStepId,
        lead: {
          values: resolvedLeadValues,
          consent: resolvedConsent,
        },
      });
      startTransition(() => setSnapshot(nextSnapshot));
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to submit lead";
      setSubmissionError(message);
    }
  };

  const handleBack = () => {
    completionSentRef.current = false;
    const nextSnapshot = retreatQuizSnapshot(quiz, snapshot);
    persistSnapshot(nextSnapshot);
    resetDraftState();
    startTransition(() => setSnapshot(nextSnapshot));
  };

  const handleToggleOption = (optionId: string) => {
    setDraftStepId(currentStep.id);
    setSubmissionError(null);
    setSelectedOptions((current) => {
      const base = draftMatchesCurrentStep ? current : savedSelectedOptions;
      return base.includes(optionId)
        ? base.filter((value) => value !== optionId)
        : [...base, optionId];
    });
  };

  const handleLeadFieldChange = (fieldId: string, value: string) => {
    setDraftStepId(currentStep.id);
    setSubmissionError(null);
    setLeadValues((current) => ({
      ...(draftMatchesCurrentStep ? current : savedLeadValues),
      [fieldId]: value,
    }));
  };

  const handleConsentChange = (checked: boolean) => {
    setDraftStepId(currentStep.id);
    setSubmissionError(null);
    setConsent(checked);
  };

  const handleOfferClick = () => {
    const payload = JSON.stringify({
      sessionToken: snapshot.sessionToken,
      eventType: "offer_clicked",
      stepId: currentStep.id,
      ctaUrl: currentStep.kind === "offer" ? currentStep.ctaUrl : null,
    });
    const endpoint = `/api/quizzes/${quizId}/events`;

    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([payload], { type: "application/json" }));
      return;
    }

    void fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    });
  };

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.75),_transparent_45%),linear-gradient(180deg,var(--quiz-canvas),#f1e4d8)] px-4 py-6 text-[var(--quiz-ink)] sm:px-6"
      style={shellStyle}
    >
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.1fr)_420px]">
        <section className="relative overflow-hidden rounded-[2rem] border border-[var(--quiz-edge)] bg-[linear-gradient(155deg,rgba(255,255,255,0.78),rgba(255,250,245,0.98))] shadow-[0_32px_90px_rgba(90,44,19,0.13)]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(179,79,45,0.08),transparent_45%,rgba(46,108,86,0.08))]" />
          <div className="relative flex h-full flex-col p-6 sm:p-8 lg:p-10">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--quiz-accent-soft)] text-[var(--quiz-accent)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-sans text-xs uppercase tracking-[0.28em] text-[var(--quiz-accent)]">
                    {quiz.name}
                  </p>
                  <p className="font-sans text-sm text-[color:rgba(34,24,19,0.68)]">
                    {entrySource.replace(/-/g, " ")}
                  </p>
                </div>
              </div>
              {snapshot.trail.length > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--quiz-edge)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--quiz-ink)] transition hover:border-[var(--quiz-accent)] hover:text-[var(--quiz-accent)]"
                >
                  <ChevronLeft className="h-4 w-4" />
                  back
                </button>
              ) : null}
            </div>

            <div className="mb-6 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[rgba(34,24,19,0.08)]">
                <div
                  className="h-full rounded-full bg-[var(--quiz-accent)] transition-all duration-500"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="font-sans text-xs uppercase tracking-[0.24em] text-[color:rgba(34,24,19,0.55)]">
                {progress.current}/{progress.total}
              </p>
            </div>

            <StepPanel
              step={currentStep}
              resultProfile={resultProfile}
              selectedOptions={resolvedSelectedOptions}
              onSingleSelect={handleSingleSelect}
              onToggleOption={handleToggleOption}
              onAdvance={handleAdvance}
              onMultiSelectContinue={handleMultiSelectContinue}
              onLeadFieldChange={handleLeadFieldChange}
              onConsentChange={handleConsentChange}
              leadValues={resolvedLeadValues}
              consent={resolvedConsent}
              onLeadSubmit={handleLeadSubmit}
              onOfferClick={handleOfferClick}
            />

            {resolvedSubmissionError ? (
              <p className="mt-4 font-sans text-sm text-red-700">{resolvedSubmissionError}</p>
            ) : null}
          </div>
        </section>

        <aside className="overflow-hidden rounded-[2rem] border border-[var(--quiz-edge)] bg-[linear-gradient(180deg,rgba(255,250,245,0.92),rgba(255,248,243,0.82))] shadow-[0_24px_70px_rgba(90,44,19,0.12)]">
          <div className="p-6 sm:p-8">
            <p className="font-sans text-xs uppercase tracking-[0.28em] text-[var(--quiz-accent)]">
              what this profile is built to do
            </p>
            <h2 className="mt-3 font-serif text-3xl font-black leading-tight text-[var(--quiz-ink)]">
              less random. more readable.
            </h2>
            <p className="mt-4 font-sans text-sm leading-7 text-[color:rgba(34,24,19,0.72)]">
              this is designed to feel like a sharp editorial brief, not a sterile quiz. the goal is
              to make the pattern easier to see, then route you cleanly into the best next move.
            </p>

            <div className="mt-8 grid gap-4">
              {resultProfile.educationBullets.map((bullet) => (
                <div
                  key={bullet}
                  className="rounded-3xl border border-[var(--quiz-edge)] bg-white/85 px-4 py-4"
                >
                  <p className="font-sans text-sm leading-6 text-[var(--quiz-ink)]">{bullet}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[1.75rem] border border-[var(--quiz-edge)] bg-[var(--quiz-accent-soft)]/65 p-5">
              <p className="font-sans text-xs uppercase tracking-[0.24em] text-[var(--quiz-accent)]">
                current read
              </p>
              <p className="mt-3 font-serif text-2xl font-black text-[var(--quiz-ink)]">
                {resultProfile.label}
              </p>
              <p className="mt-2 font-sans text-sm leading-6 text-[color:rgba(34,24,19,0.72)]">
                {resultProfile.affirmation}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StepPanel({
  step,
  resultProfile,
  selectedOptions,
  onSingleSelect,
  onToggleOption,
  onAdvance,
  onMultiSelectContinue,
  onLeadFieldChange,
  onConsentChange,
  leadValues,
  consent,
  onLeadSubmit,
  onOfferClick,
}: {
  step: QuizStep;
  resultProfile: ReturnType<typeof resolveResultProfile>;
  selectedOptions: string[];
  onSingleSelect: (optionId: string) => void;
  onToggleOption: (optionId: string) => void;
  onAdvance: () => void;
  onMultiSelectContinue: () => void;
  onLeadFieldChange: (fieldId: string, value: string) => void;
  onConsentChange: (checked: boolean) => void;
  leadValues: Record<string, string>;
  consent: boolean;
  onLeadSubmit: () => void;
  onOfferClick: () => void;
}) {
  return (
    <>
      <div className="max-w-3xl">
        {step.kicker ? (
          <p className="font-sans text-xs uppercase tracking-[0.3em] text-[var(--quiz-accent)]">
            {step.kicker}
          </p>
        ) : null}
        <h1
          className="mt-4 text-balance font-serif text-4xl font-black leading-[1.04] tracking-[-0.03em] text-[var(--quiz-ink)] sm:text-5xl"
          style={{ fontFamily: "var(--quiz-display-font)" }}
        >
          {step.kind === "result" ? resultProfile.headline : step.title}
        </h1>
        <p
          className="mt-5 max-w-2xl font-sans text-lg leading-8 text-[color:rgba(34,24,19,0.72)]"
          style={{ fontFamily: "var(--quiz-body-font)" }}
        >
          {step.kind === "result" ? resultProfile.summary : step.body}
        </p>
      </div>

      {step.kind === "welcome" ? (
        <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <button
            type="button"
            onClick={onAdvance}
            className="rounded-[1.5rem] bg-[var(--quiz-accent)] px-6 py-5 text-left text-white shadow-[0_18px_45px_rgba(179,79,45,0.35)] transition hover:translate-y-[-1px]"
          >
            <span className="font-sans text-xs uppercase tracking-[0.26em] text-white/70">begin</span>
            <span className="mt-2 block font-serif text-2xl font-black">{step.primaryLabel}</span>
            {step.secondaryLabel ? (
              <span className="mt-2 block font-sans text-sm text-white/80">{step.secondaryLabel}</span>
            ) : null}
          </button>
          <div className="rounded-[1.5rem] border border-[var(--quiz-edge)] bg-white/82 p-5">
            <p className="font-sans text-xs uppercase tracking-[0.26em] text-[var(--quiz-accent)]">
              built for clarity
            </p>
            <div className="mt-4 space-y-3">
              {step.trustPoints.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--quiz-accent-soft)] text-[var(--quiz-accent)]">
                    <Check className="h-4 w-4" />
                  </div>
                  <p className="font-sans text-sm text-[var(--quiz-ink)]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {step.kind === "question" ? (
        <div className="mt-10 space-y-4">
          {step.options.map((option) => {
            const isSelected = selectedOptions.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() =>
                  step.selection === "single" ? onSingleSelect(option.id) : onToggleOption(option.id)
                }
                className={cn(
                  "group w-full rounded-[1.6rem] border bg-white/88 p-5 text-left transition-all",
                  isSelected
                    ? "border-[var(--quiz-accent)] shadow-[0_22px_40px_rgba(179,79,45,0.16)]"
                    : "border-[var(--quiz-edge)] hover:border-[var(--quiz-accent)]/60 hover:shadow-[0_18px_30px_rgba(34,24,19,0.08)]",
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border text-sm font-bold",
                      isSelected
                        ? "border-transparent bg-[var(--quiz-accent)] text-white"
                        : "border-[var(--quiz-edge)] text-[var(--quiz-accent)]",
                    )}
                  >
                    {isSelected ? <Check className="h-4 w-4" /> : option.label.slice(0, 1)}
                  </div>
                  <div className="flex-1">
                    <p className="font-serif text-2xl font-black leading-tight text-[var(--quiz-ink)]">
                      {option.label}
                    </p>
                    {option.description ? (
                      <p className="mt-2 font-sans text-sm leading-6 text-[color:rgba(34,24,19,0.66)]">
                        {option.description}
                      </p>
                    ) : null}
                    {option.revealNote ? (
                      <p className="mt-3 font-sans text-xs uppercase tracking-[0.24em] text-[var(--quiz-accent)]">
                        {option.revealNote}
                      </p>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}

          {step.selection === "multiple" ? (
            <button
              type="button"
              onClick={onMultiSelectContinue}
              disabled={selectedOptions.length === 0}
              className="mt-6 inline-flex rounded-full bg-[var(--quiz-accent)] px-6 py-3 font-sans text-sm font-semibold uppercase tracking-[0.24em] text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {step.continueLabel ?? "continue"}
            </button>
          ) : null}
        </div>
      ) : null}

      {step.kind === "insight" ? (
        <div className="mt-10 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {step.bullets.map((bullet) => (
              <div
                key={bullet}
                className="rounded-[1.5rem] border border-[var(--quiz-edge)] bg-white/88 p-5 shadow-[0_16px_30px_rgba(34,24,19,0.06)]"
              >
                <p className="font-sans text-sm leading-7 text-[var(--quiz-ink)]">{bullet}</p>
              </div>
            ))}
          </div>
          {step.quoteText ? (
            <div className="rounded-[1.75rem] bg-[var(--quiz-accent-soft)]/60 p-6">
              <p className="font-serif text-2xl font-black leading-tight text-[var(--quiz-ink)]">
                &ldquo;{step.quoteText}&rdquo;
              </p>
              {step.quoteAttribution ? (
                <p className="mt-3 font-sans text-xs uppercase tracking-[0.24em] text-[var(--quiz-accent)]">
                  {step.quoteAttribution}
                </p>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            onClick={onAdvance}
            className="inline-flex rounded-full border border-[var(--quiz-accent)] bg-white px-6 py-3 font-sans text-sm font-semibold uppercase tracking-[0.24em] text-[var(--quiz-accent)] transition hover:bg-[var(--quiz-accent)] hover:text-white"
          >
            {step.primaryLabel}
          </button>
        </div>
      ) : null}

      {step.kind === "result" ? (
        <div className="mt-10 space-y-6">
          <div className="rounded-[1.75rem] border border-[var(--quiz-edge)] bg-white/90 p-6">
            <p className="font-sans text-xs uppercase tracking-[0.28em] text-[var(--quiz-accent)]">
              {resultProfile.badge}
            </p>
            <p className="mt-3 font-serif text-2xl font-black text-[var(--quiz-ink)]">
              {resultProfile.affirmation}
            </p>
            <p className="mt-4 font-sans text-sm leading-7 text-[color:rgba(34,24,19,0.72)]">
              {resultProfile.mechanism}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {resultProfile.dopamineCandies.map((candy) => (
              <div
                key={candy}
                className="rounded-[1.4rem] border border-[var(--quiz-edge)] bg-[var(--quiz-accent-soft)]/50 p-5"
              >
                <p className="font-sans text-sm leading-7 text-[var(--quiz-ink)]">{candy}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[1.75rem] border border-[var(--quiz-edge)] bg-white/88 p-6">
            <p className="font-sans text-xs uppercase tracking-[0.24em] text-[var(--quiz-accent)]">
              next
            </p>
            <p className="mt-3 font-sans text-base leading-8 text-[color:rgba(34,24,19,0.76)]">
              {resultProfile.offerBridge}
            </p>
            <p className="mt-4 font-sans text-xs uppercase tracking-[0.24em] text-[color:rgba(34,24,19,0.48)]">
              {step.disclaimer}
            </p>
          </div>

          <button
            type="button"
            onClick={onAdvance}
            className="inline-flex rounded-full bg-[var(--quiz-accent)] px-6 py-3 font-sans text-sm font-semibold uppercase tracking-[0.24em] text-white shadow-[0_16px_32px_rgba(179,79,45,0.22)]"
          >
            {step.primaryLabel}
          </button>
        </div>
      ) : null}

      {step.kind === "lead" ? (
        <div className="mt-10 grid gap-5">
          {step.fields.map((field) => (
            <LeadFieldInput
              key={field.id}
              field={field}
              value={leadValues[field.id] ?? ""}
              onChange={(value) => onLeadFieldChange(field.id, value)}
            />
          ))}

          <label className="flex items-start gap-3 rounded-[1.25rem] border border-[var(--quiz-edge)] bg-white/88 p-4">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => onConsentChange(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[var(--quiz-edge)] text-[var(--quiz-accent)]"
            />
            <span className="font-sans text-sm leading-6 text-[var(--quiz-ink)]">{step.consentLabel}</span>
          </label>

          <p className="font-sans text-sm leading-7 text-[color:rgba(34,24,19,0.65)]">{step.disclaimer}</p>

          <button
            type="button"
            onClick={onLeadSubmit}
            className="inline-flex rounded-full bg-[var(--quiz-accent)] px-6 py-3 font-sans text-sm font-semibold uppercase tracking-[0.24em] text-white shadow-[0_16px_32px_rgba(179,79,45,0.22)]"
          >
            {step.submitLabel}
          </button>
        </div>
      ) : null}

      {step.kind === "offer" ? (
        <div className="mt-10 grid gap-6">
          <div className="rounded-[1.75rem] border border-[var(--quiz-edge)] bg-white/90 p-6">
            <p className="font-sans text-xs uppercase tracking-[0.24em] text-[var(--quiz-accent)]">
              matched next step
            </p>
            <p className="mt-3 font-serif text-2xl font-black text-[var(--quiz-ink)]">
              {resultProfile.label} {"->"} feminine balance gummies
            </p>
            <p className="mt-4 font-sans text-base leading-8 text-[color:rgba(34,24,19,0.72)]">
              {step.body}
            </p>
            <div className="mt-6 grid gap-3">
              {step.bullets.map((bullet) => (
                <div key={bullet} className="flex items-start gap-3">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--quiz-accent-soft)] text-[var(--quiz-accent)]">
                    <Check className="h-4 w-4" />
                  </div>
                  <p className="font-sans text-sm leading-7 text-[var(--quiz-ink)]">{bullet}</p>
                </div>
              ))}
            </div>
          </div>

          <a
            href={step.ctaUrl}
            onClick={onOfferClick}
            className="inline-flex items-center justify-center rounded-full bg-[var(--quiz-success)] px-6 py-4 font-sans text-sm font-semibold uppercase tracking-[0.24em] text-white shadow-[0_18px_36px_rgba(46,108,86,0.3)] transition hover:translate-y-[-1px]"
          >
            {step.ctaLabel}
          </a>
          {step.guarantee ? (
            <p className="font-sans text-xs uppercase tracking-[0.24em] text-[color:rgba(34,24,19,0.5)]">
              {step.guarantee}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function LeadFieldInput({
  field,
  value,
  onChange,
}: {
  field: QuizLeadField;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.type === "textarea") {
    return (
      <label className="grid gap-2">
        <span className="font-sans text-xs uppercase tracking-[0.24em] text-[var(--quiz-accent)]">
          {field.label}
        </span>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className="rounded-[1.4rem] border border-[var(--quiz-edge)] bg-white/92 px-4 py-4 font-sans text-base text-[var(--quiz-ink)] outline-none transition focus:border-[var(--quiz-accent)]"
        />
      </label>
    );
  }

  return (
    <label className="grid gap-2">
      <span className="font-sans text-xs uppercase tracking-[0.24em] text-[var(--quiz-accent)]">
        {field.label}
      </span>
      <input
        value={value}
        type={field.type}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        className="rounded-[1.4rem] border border-[var(--quiz-edge)] bg-white/92 px-4 py-4 font-sans text-base text-[var(--quiz-ink)] outline-none transition focus:border-[var(--quiz-accent)]"
      />
    </label>
  );
}
