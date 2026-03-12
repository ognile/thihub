"use client";

import dynamic from "next/dynamic";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type {
  QuizDefinition,
  QuizLeadField,
  QuizResultProfile,
  QuizStep,
} from "@/lib/quizzes/schema";

const QuizResultGraph = dynamic(() => import("./QuizResultGraph"), {
  ssr: false,
  loading: () => (
    <div className="h-[220px] animate-pulse rounded-[1.6rem] border border-white/10 bg-white/[0.03]" />
  ),
});

const STORAGE_PREFIX = "quiz-funnel-v2";

interface QuizExperienceProps {
  quizId: string;
  quiz: QuizDefinition;
  entrySource: string;
  articleSlug: string | null;
  mode: "live" | "preview";
  className?: string;
  embedded?: boolean;
}

function generateSessionToken() {
  return `qf_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

function buildStorageKey(slug: string) {
  return `${STORAGE_PREFIX}:${slug}`;
}

function hasStep(definition: QuizDefinition, stepId: string) {
  return definition.steps.some((step) => step.id === stepId);
}

function isStoredSnapshotValid(definition: QuizDefinition, candidate: unknown): candidate is QuizSessionSnapshot {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }

  const snapshot = candidate as Partial<QuizSessionSnapshot>;
  if (
    typeof snapshot.sessionToken !== "string" ||
    typeof snapshot.currentStepId !== "string" ||
    !Array.isArray(snapshot.trail) ||
    !Array.isArray(snapshot.answers)
  ) {
    return false;
  }

  if (!hasStep(definition, snapshot.currentStepId)) {
    return false;
  }

  return snapshot.trail.every((stepId) => typeof stepId === "string" && hasStep(definition, stepId));
}

function normalizeFieldValue(values: Record<string, string>, fieldId: string) {
  return values[fieldId] ?? "";
}

function emphasisLabel(emphasis: QuizResultProfile["criteria"][number]["emphasis"]) {
  switch (emphasis) {
    case "high":
      return "high signal";
    case "steady":
      return "steady signal";
    default:
      return "watch point";
  }
}

export default function QuizExperience({
  quizId,
  quiz,
  entrySource,
  articleSlug,
  mode,
  className,
  embedded = false,
}: QuizExperienceProps) {
  const reducedMotion = useReducedMotion();
  const isLive = mode === "live";
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

  const sendEvent = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!isLive) {
        return;
      }

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
    },
    [isLive, quizId],
  );

  const persistSnapshot = useCallback(
    (nextSnapshot: QuizSessionSnapshot) => {
      if (!isLive) {
        return;
      }

      localStorage.setItem(buildStorageKey(quiz.slug), JSON.stringify(nextSnapshot));
    },
    [isLive, quiz.slug],
  );

  useEffect(() => {
    let initialSnapshot = createInitialQuizSnapshot(
      quiz,
      isLive ? generateSessionToken() : "preview-session",
    );
    let isNewSession = true;

    if (isLive) {
      const stored = localStorage.getItem(buildStorageKey(quiz.slug));
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (isStoredSnapshotValid(quiz, parsed)) {
            initialSnapshot = parsed;
            isNewSession = false;
          }
        } catch {
          isNewSession = true;
        }
      }
    }

    startTransition(() => {
      setSnapshot(initialSnapshot);
      setIsBooting(false);
    });

    completionSentRef.current = false;
    lastViewedRef.current = null;

    if (isLive && isNewSession) {
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
  }, [articleSlug, entrySource, isLive, quiz, sendEvent]);

  useEffect(() => {
    if (!isLive || !snapshot || !currentStep) {
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
  }, [articleSlug, currentStep, entrySource, isLive, resultProfile.id, sendEvent, snapshot]);

  const resetDraftState = useCallback(() => {
    setDraftStepId(null);
    setSelectedOptions([]);
    setLeadValues({});
    setConsent(false);
    setSubmissionError(null);
  }, []);

  const moveToSnapshot = useCallback(
    (nextSnapshot: QuizSessionSnapshot) => {
      persistSnapshot(nextSnapshot);
      resetDraftState();
      startTransition(() => setSnapshot(nextSnapshot));
    },
    [persistSnapshot, resetDraftState],
  );

  const handleAdvance = useCallback(() => {
    if (!snapshot || !currentStep) {
      return;
    }

    try {
      const nextSnapshot = advanceQuizSnapshot(quiz, snapshot, { stepId: currentStep.id });
      moveToSnapshot(nextSnapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to advance";
      setSubmissionError(message);
    }
  }, [currentStep, moveToSnapshot, quiz, snapshot]);

  const handleSingleSelect = useCallback(
    (optionId: string) => {
      if (!snapshot || !currentStep) {
        return;
      }

      try {
        const nextSnapshot = advanceQuizSnapshot(quiz, snapshot, {
          stepId: currentStep.id,
          optionIds: [optionId],
        });

        void sendEvent({
          sessionToken: snapshot.sessionToken,
          eventType: "answer_submitted",
          stepId: currentStep.id,
          nextStepId: nextSnapshot.currentStepId,
          optionIds: [optionId],
        });

        moveToSnapshot(nextSnapshot);
      } catch (error) {
        const message = error instanceof Error ? error.message : "failed to submit answer";
        setSubmissionError(message);
      }
    },
    [currentStep, moveToSnapshot, quiz, sendEvent, snapshot],
  );

  const handleMultiSelectContinue = useCallback(() => {
    if (!snapshot || !currentStep) {
      return;
    }

    try {
      const nextSnapshot = advanceQuizSnapshot(quiz, snapshot, {
        stepId: currentStep.id,
        optionIds: resolvedSelectedOptionsForStep(currentStep.id, draftStepId, selectedOptions, snapshot),
      });

      void sendEvent({
        sessionToken: snapshot.sessionToken,
        eventType: "answer_submitted",
        stepId: currentStep.id,
        nextStepId: nextSnapshot.currentStepId,
        optionIds: resolvedSelectedOptionsForStep(currentStep.id, draftStepId, selectedOptions, snapshot),
      });

      moveToSnapshot(nextSnapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to submit answers";
      setSubmissionError(message);
    }
  }, [currentStep, draftStepId, moveToSnapshot, quiz, selectedOptions, sendEvent, snapshot]);

  const handleLeadSubmit = useCallback(() => {
    if (!snapshot || !currentStep) {
      return;
    }

    const activeLeadValues =
      draftStepId === currentStep.id ? leadValues : snapshot.leadSubmission?.values ?? {};
    const activeConsent =
      draftStepId === currentStep.id ? consent : snapshot.leadSubmission?.consent ?? false;

    try {
      const nextSnapshot = advanceQuizSnapshot(quiz, snapshot, {
        stepId: currentStep.id,
        leadValues: activeLeadValues,
        consent: activeConsent,
      });

      void sendEvent({
        sessionToken: snapshot.sessionToken,
        eventType: "lead_submitted",
        stepId: currentStep.id,
        nextStepId: nextSnapshot.currentStepId,
        lead: {
          values: activeLeadValues,
          consent: activeConsent,
        },
      });

      moveToSnapshot(nextSnapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to submit lead";
      setSubmissionError(message);
    }
  }, [consent, currentStep, draftStepId, leadValues, moveToSnapshot, quiz, sendEvent, snapshot]);

  const handleBack = useCallback(() => {
    if (!snapshot) {
      return;
    }

    completionSentRef.current = false;
    const nextSnapshot = retreatQuizSnapshot(quiz, snapshot);
    moveToSnapshot(nextSnapshot);
  }, [moveToSnapshot, quiz, snapshot]);

  const handleToggleOption = useCallback(
    (optionId: string) => {
      if (!currentStep) {
        return;
      }

      setDraftStepId(currentStep.id);
      setSubmissionError(null);
      setSelectedOptions((current) => {
        const base = resolvedSelectedOptionsForStep(currentStep.id, draftStepId, current, snapshot);
        return base.includes(optionId)
          ? base.filter((value) => value !== optionId)
          : [...base, optionId];
      });
    },
    [currentStep, draftStepId, snapshot],
  );

  const handleLeadFieldChange = useCallback(
    (fieldId: string, value: string) => {
      if (!currentStep) {
        return;
      }

      setDraftStepId(currentStep.id);
      setSubmissionError(null);
      setLeadValues((current) => {
        const base = currentStep.kind === "lead" && draftStepId !== currentStep.id
          ? snapshot?.leadSubmission?.values ?? {}
          : current;
        return {
          ...base,
          [fieldId]: value,
        };
      });
    },
    [currentStep, draftStepId, snapshot],
  );

  const handleConsentChange = useCallback(
    (checked: boolean) => {
      if (!currentStep) {
        return;
      }

      setDraftStepId(currentStep.id);
      setSubmissionError(null);
      setConsent(checked);
    },
    [currentStep],
  );

  const handleOfferClick = useCallback(() => {
    if (!isLive || !snapshot || !currentStep || currentStep.kind !== "offer") {
      return;
    }

    const payload = JSON.stringify({
      sessionToken: snapshot.sessionToken,
      eventType: "offer_clicked",
      stepId: currentStep.id,
      ctaUrl: currentStep.ctaUrl,
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
  }, [currentStep, isLive, quizId, snapshot]);

  const savedAnswer =
    currentStep?.kind === "question"
      ? snapshot?.answers.find((answer) => answer.stepId === currentStep.id)
      : null;
  const savedSelectedOptions = savedAnswer?.optionIds ?? [];
  const savedLeadValues = currentStep?.kind === "lead" ? snapshot?.leadSubmission?.values ?? {} : {};
  const savedConsent = currentStep?.kind === "lead" ? snapshot?.leadSubmission?.consent ?? false : false;
  const draftMatchesCurrentStep = draftStepId === currentStep?.id;
  const resolvedSelectedOptions = draftMatchesCurrentStep ? selectedOptions : savedSelectedOptions;
  const resolvedLeadValues = draftMatchesCurrentStep ? leadValues : savedLeadValues;
  const resolvedConsent = draftMatchesCurrentStep ? consent : savedConsent;
  const resolvedSubmissionError = draftMatchesCurrentStep ? submissionError : null;
  const sourceLabel = entrySource.replace(/-/g, " ");

  const stageMotion = reducedMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -18 },
      };

  if (isBooting || !snapshot || !currentStep) {
    return (
      <div
        data-quiz-shell="monochrome"
        className={cn(
          embedded
            ? "min-h-full bg-[#050505] font-sans text-white [&_h1]:font-sans [&_h2]:font-sans [&_h3]:font-sans"
            : "min-h-screen bg-[#050505] font-sans text-white [&_h1]:font-sans [&_h2]:font-sans [&_h3]:font-sans",
          className,
        )}
      >
        <div
          className={cn(
            "mx-auto flex max-w-[1160px] items-center justify-center px-4 py-6 sm:px-6",
            embedded ? "min-h-[860px]" : "min-h-screen",
          )}
        >
          <Loader2 className="h-8 w-8 animate-spin text-white/60" strokeWidth={1.2} />
        </div>
      </div>
    );
  }

  return (
    <div
      data-quiz-shell="monochrome"
      className={cn(
        embedded
          ? "min-h-full overflow-hidden bg-[#050505] font-sans text-white [&_h1]:font-sans [&_h2]:font-sans [&_h3]:font-sans"
          : "min-h-screen overflow-hidden bg-[#050505] font-sans text-white [&_h1]:font-sans [&_h2]:font-sans [&_h3]:font-sans",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.16),_transparent_28%),linear-gradient(180deg,#0a0a0a_0%,#030303_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div
        className={cn(
          "relative mx-auto flex w-full max-w-[1160px] items-center justify-center px-4 py-6 sm:px-6 lg:px-10",
          embedded ? "min-h-[860px]" : "min-h-screen",
        )}
      >
        <div className="w-full max-w-[430px]">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] shadow-[0_40px_120px_rgba(0,0,0,0.65)] backdrop-blur-xl">
            <div className="border-b border-white/10 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
              <div className="flex items-center justify-between gap-3">
                {snapshot.trail.length > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={1.2} />
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] uppercase tracking-[0.28em] text-white/72">
                    <Sparkles className="h-3.5 w-3.5" strokeWidth={1.2} />
                    private flow
                  </div>
                )}

                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/48">{sourceLabel}</p>
                  <p className="mt-1 text-xs text-white/74">
                    {progress.current}/{progress.total}
                  </p>
                </div>
              </div>

              <div className="mt-5 h-[2px] overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-white"
                  initial={false}
                  animate={{ width: `${progress.percent}%` }}
                  transition={{ duration: reducedMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>

            <div className="relative min-h-[680px] px-5 py-6 sm:px-6 sm:py-7">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${currentStep.id}:${snapshot.trail.length}`}
                  initial={stageMotion.initial}
                  animate={stageMotion.animate}
                  exit={stageMotion.exit}
                  transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <StepSurface
                    currentStep={currentStep}
                    quiz={quiz}
                    resultProfile={resultProfile}
                    selectedOptions={resolvedSelectedOptions}
                    leadValues={resolvedLeadValues}
                    consent={resolvedConsent}
                    submissionError={resolvedSubmissionError}
                    reducedMotion={Boolean(reducedMotion)}
                    onAdvance={handleAdvance}
                    onSingleSelect={handleSingleSelect}
                    onToggleOption={handleToggleOption}
                    onMultiSelectContinue={handleMultiSelectContinue}
                    onLeadFieldChange={handleLeadFieldChange}
                    onConsentChange={handleConsentChange}
                    onLeadSubmit={handleLeadSubmit}
                    onOfferClick={handleOfferClick}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function resolvedSelectedOptionsForStep(
  stepId: string,
  draftStepId: string | null,
  selectedOptions: string[],
  snapshot: QuizSessionSnapshot | null,
) {
  if (draftStepId === stepId) {
    return selectedOptions;
  }

  return snapshot?.answers.find((answer) => answer.stepId === stepId)?.optionIds ?? [];
}

function StepSurface({
  currentStep,
  quiz,
  resultProfile,
  selectedOptions,
  leadValues,
  consent,
  submissionError,
  reducedMotion,
  onAdvance,
  onSingleSelect,
  onToggleOption,
  onMultiSelectContinue,
  onLeadFieldChange,
  onConsentChange,
  onLeadSubmit,
  onOfferClick,
}: {
  currentStep: QuizStep;
  quiz: QuizDefinition;
  resultProfile: QuizResultProfile;
  selectedOptions: string[];
  leadValues: Record<string, string>;
  consent: boolean;
  submissionError: string | null;
  reducedMotion: boolean;
  onAdvance: () => void;
  onSingleSelect: (optionId: string) => void;
  onToggleOption: (optionId: string) => void;
  onMultiSelectContinue: () => void;
  onLeadFieldChange: (fieldId: string, value: string) => void;
  onConsentChange: (checked: boolean) => void;
  onLeadSubmit: () => void;
  onOfferClick: () => void;
}) {
  return (
    <div className="space-y-6">
      {currentStep.kind === "welcome" ? (
        <WelcomeStep step={currentStep} onAdvance={onAdvance} />
      ) : null}

      {currentStep.kind === "question" ? (
        <QuestionStep
          step={currentStep}
          selectedOptions={selectedOptions}
          onSingleSelect={onSingleSelect}
          onToggleOption={onToggleOption}
          onContinue={onMultiSelectContinue}
        />
      ) : null}

      {currentStep.kind === "message" ? (
        <MessageStep step={currentStep} onAdvance={onAdvance} />
      ) : null}

      {currentStep.kind === "analysis" ? (
        <AnalysisStep step={currentStep} onAdvance={onAdvance} reducedMotion={reducedMotion} />
      ) : null}

      {currentStep.kind === "result" ? (
        <ResultStep step={currentStep} resultProfile={resultProfile} onAdvance={onAdvance} />
      ) : null}

      {currentStep.kind === "lead" ? (
        <LeadStep
          step={currentStep}
          leadValues={leadValues}
          consent={consent}
          onLeadFieldChange={onLeadFieldChange}
          onConsentChange={onConsentChange}
          onLeadSubmit={onLeadSubmit}
        />
      ) : null}

      {currentStep.kind === "offer" ? (
        <OfferStep step={currentStep} resultProfile={resultProfile} onOfferClick={onOfferClick} />
      ) : null}

      {submissionError ? (
        <p className="rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white/82">
          {submissionError}
        </p>
      ) : null}

      <div className="flex items-center justify-between border-t border-white/10 pt-4 text-[11px] uppercase tracking-[0.28em] text-white/38">
        <span>{quiz.name}</span>
        <span>{currentStep.kind}</span>
      </div>
    </div>
  );
}

function WelcomeStep({
  step,
  onAdvance,
}: {
  step: Extract<QuizStep, { kind: "welcome" }>;
  onAdvance: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {step.kicker ? (
          <p className="text-[11px] uppercase tracking-[0.34em] text-white/46">{step.kicker}</p>
        ) : null}
        <h1 className="font-sans text-[2.25rem] font-semibold leading-[0.98] tracking-[-0.06em] text-white sm:text-[2.65rem]">
          {step.title}
        </h1>
        {step.body ? (
          <p className="max-w-[32rem] text-base leading-7 text-white/68">{step.body}</p>
        ) : null}
      </div>

      <div className="grid gap-3">
        {step.trustPoints.map((point) => (
          <div
            key={point}
            className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.03] px-4 py-4"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/[0.06]">
              <Check className="h-4 w-4 text-white/86" strokeWidth={1.2} />
            </div>
            <p className="text-sm leading-6 text-white/78">{point}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onAdvance}
        className="group flex w-full items-center justify-between rounded-[1.6rem] border border-white/12 bg-white px-5 py-5 text-left text-black transition hover:translate-y-[-1px] hover:bg-white/92"
      >
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.3em] text-black/54">begin</p>
          <p className="text-xl font-semibold tracking-[-0.03em]">{step.primaryLabel}</p>
          {step.secondaryLabel ? (
            <p className="text-sm leading-6 text-black/66">{step.secondaryLabel}</p>
          ) : null}
        </div>
        <ArrowRight className="h-5 w-5 text-black transition group-hover:translate-x-0.5" strokeWidth={1.2} />
      </button>
    </div>
  );
}

function QuestionStep({
  step,
  selectedOptions,
  onSingleSelect,
  onToggleOption,
  onContinue,
}: {
  step: Extract<QuizStep, { kind: "question" }>;
  selectedOptions: string[];
  onSingleSelect: (optionId: string) => void;
  onToggleOption: (optionId: string) => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {step.kicker ? (
          <p className="text-[11px] uppercase tracking-[0.34em] text-white/46">{step.kicker}</p>
        ) : null}
        <h1 className="font-sans text-[2.05rem] font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-[2.4rem]">
          {step.title}
        </h1>
        {step.body ? (
          <p className="text-base leading-7 text-white/66">{step.body}</p>
        ) : null}
      </div>

      <div className="grid gap-3">
        {step.options.map((option, index) => {
          const isSelected = selectedOptions.includes(option.id);
          const action = step.selection === "single"
            ? () => onSingleSelect(option.id)
            : () => onToggleOption(option.id);

          return (
            <motion.button
              key={option.id}
              type="button"
              onClick={action}
              whileTap={{ scale: 0.985 }}
              className={cn(
                "group w-full rounded-[1.5rem] border px-4 py-4 text-left transition sm:px-5",
                isSelected
                  ? "border-white bg-white text-black shadow-[0_16px_50px_rgba(255,255,255,0.08)]"
                  : "border-white/10 bg-white/[0.03] text-white hover:border-white/18 hover:bg-white/[0.06]",
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full border transition",
                    isSelected ? "border-black bg-black text-white" : "border-white/30 bg-transparent text-transparent",
                  )}
                >
                  <span className={cn("h-2.5 w-2.5 rounded-full", isSelected ? "bg-white" : "bg-transparent")} />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className={cn("text-lg font-medium tracking-[-0.02em]", isSelected ? "text-black" : "text-white")}>
                      {option.label}
                    </p>
                    <span className={cn("text-xs uppercase tracking-[0.28em]", isSelected ? "text-black/52" : "text-white/34")}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  {option.description ? (
                    <p className={cn("text-sm leading-6", isSelected ? "text-black/64" : "text-white/56")}>
                      {option.description}
                    </p>
                  ) : null}
                  {option.revealNote ? (
                    <p className={cn("text-[11px] uppercase tracking-[0.28em]", isSelected ? "text-black/48" : "text-white/34")}>
                      {option.revealNote}
                    </p>
                  ) : null}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {step.selection === "multiple" ? (
        <Button
          onClick={onContinue}
          disabled={selectedOptions.length === 0}
          className="h-12 w-full rounded-full bg-white text-black hover:bg-white/92"
        >
          {step.continueLabel ?? "continue"}
        </Button>
      ) : null}
    </div>
  );
}

function MessageStep({
  step,
  onAdvance,
}: {
  step: Extract<QuizStep, { kind: "message" }>;
  onAdvance: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <div className="space-y-4">
          {step.kicker ? (
            <p className="text-[11px] uppercase tracking-[0.34em] text-white/46">{step.kicker}</p>
          ) : null}
          <h1 className="font-sans text-[2rem] font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-[2.35rem]">
            {step.title}
          </h1>
          {step.body ? (
            <p className="text-base leading-7 text-white/68">{step.body}</p>
          ) : null}
        </div>

        {step.highlights?.length ? (
          <div className="mt-6 grid gap-3">
            {step.highlights.map((highlight) => (
              <div
                key={highlight.id}
                className="rounded-[1.5rem] border border-white/10 bg-black/30 px-4 py-4"
              >
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/42">{highlight.label}</p>
                <p className="mt-3 text-lg font-medium leading-7 tracking-[-0.03em] text-white">
                  {highlight.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {step.bullets?.length ? (
          <div className="mt-6 grid gap-3">
            {step.bullets.map((bullet) => (
              <div key={bullet} className="flex gap-3 rounded-[1.3rem] border border-white/8 bg-white/[0.02] px-4 py-4">
                <div className="mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full border border-white/14 bg-white/[0.06]">
                  <Check className="h-3.5 w-3.5 text-white/84" strokeWidth={1.2} />
                </div>
                <p className="text-sm leading-6 text-white/72">{bullet}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <Button
        onClick={onAdvance}
        className="h-12 w-full rounded-full bg-white text-black hover:bg-white/92"
      >
        {step.primaryLabel}
      </Button>

      {step.secondaryLabel ? (
        <p className="text-center text-xs uppercase tracking-[0.28em] text-white/40">{step.secondaryLabel}</p>
      ) : null}
    </div>
  );
}

function AnalysisStep({
  step,
  onAdvance,
  reducedMotion,
}: {
  step: Extract<QuizStep, { kind: "analysis" }>;
  onAdvance: () => void;
  reducedMotion: boolean;
}) {
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [completedStageIds, setCompletedStageIds] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const runStage = (index: number) => {
      if (cancelled) {
        return;
      }

      if (index >= step.stages.length) {
        setIsFinished(true);
        if (step.autoAdvance) {
          timer = setTimeout(() => onAdvance(), reducedMotion ? 0 : 180);
        }
        return;
      }

      setActiveStageIndex(index);
      const durationMs = reducedMotion ? 120 : step.stages[index].durationMs;

      timer = setTimeout(() => {
        setCompletedStageIds((current) => [...current, step.stages[index].id]);
        runStage(index + 1);
      }, durationMs);
    };

    runStage(0);

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [onAdvance, reducedMotion, step]);

  const progressPercent = isFinished
    ? 100
    : Math.round(((activeStageIndex + 1) / step.stages.length) * 100);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {step.kicker ? (
          <p className="text-[11px] uppercase tracking-[0.34em] text-white/46">{step.kicker}</p>
        ) : null}
        <h1 className="font-sans text-[2rem] font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-[2.35rem]">
          {step.title}
        </h1>
        {step.body ? (
          <p className="text-base leading-7 text-white/66">{step.body}</p>
        ) : null}
      </div>

      <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-white/44">
          <span>analysis pass</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="mt-4 h-[2px] overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-white"
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        <div className="mt-6 grid gap-3">
          {step.stages.map((stage, index) => {
            const isActive = index === activeStageIndex && !isFinished;
            const isComplete = completedStageIds.includes(stage.id) || isFinished;
            return (
              <div
                key={stage.id}
                className={cn(
                  "rounded-[1.4rem] border px-4 py-4 transition",
                  isActive
                    ? "border-white/18 bg-white/[0.08]"
                    : isComplete
                      ? "border-white/10 bg-white/[0.04]"
                      : "border-white/8 bg-black/30",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full border border-white/14 bg-white/[0.06]">
                    {isComplete ? (
                      <Check className="h-3.5 w-3.5 text-white/86" strokeWidth={1.2} />
                    ) : isActive ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-white/74" strokeWidth={1.2} />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-white/22" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium tracking-[-0.01em] text-white">{stage.label}</p>
                    {stage.description ? (
                      <p className="mt-1 text-sm leading-6 text-white/54">{stage.description}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!step.autoAdvance && isFinished ? (
        <Button
          onClick={onAdvance}
          className="h-12 w-full rounded-full bg-white text-black hover:bg-white/92"
        >
          continue
        </Button>
      ) : null}
    </div>
  );
}

function ResultStep({
  step,
  resultProfile,
  onAdvance,
}: {
  step: Extract<QuizStep, { kind: "result" }>;
  resultProfile: QuizResultProfile;
  onAdvance: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {step.kicker ? (
          <p className="text-[11px] uppercase tracking-[0.34em] text-white/46">{step.kicker}</p>
        ) : null}
        <div className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[11px] uppercase tracking-[0.3em] text-white/68">
          {resultProfile.badge}
        </div>
        <h1 className="font-sans text-[2.1rem] font-semibold leading-[1.01] tracking-[-0.05em] text-white sm:text-[2.5rem]">
          {resultProfile.headline}
        </h1>
        <p className="text-base leading-7 text-white/72">{resultProfile.summary}</p>
      </div>

      <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">current read</p>
        <p className="mt-3 text-lg font-medium leading-7 tracking-[-0.03em] text-white">
          {resultProfile.affirmation}
        </p>
        <p className="mt-4 text-sm leading-7 text-white/60">{resultProfile.mechanism}</p>
      </div>

      <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">{resultProfile.graphTitle}</p>
          <p className="text-sm leading-6 text-white/58">{resultProfile.graphCaption}</p>
        </div>
        <div className="mt-5">
          <QuizResultGraph resultId={resultProfile.id} metrics={resultProfile.metrics} />
        </div>
      </div>

      <div className="grid gap-3">
        {resultProfile.criteria.map((criterion) => (
          <div
            key={criterion.id}
            className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium tracking-[-0.01em] text-white">{criterion.label}</p>
              <span className="text-[11px] uppercase tracking-[0.28em] text-white/42">
                {emphasisLabel(criterion.emphasis)}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-white/60">{criterion.detail}</p>
          </div>
        ))}
      </div>

      <Button
        onClick={onAdvance}
        className="h-12 w-full rounded-full bg-white text-black hover:bg-white/92"
      >
        {step.primaryLabel}
      </Button>

      <p className="text-center text-xs leading-6 text-white/40">{step.disclaimer}</p>
    </div>
  );
}

function LeadStep({
  step,
  leadValues,
  consent,
  onLeadFieldChange,
  onConsentChange,
  onLeadSubmit,
}: {
  step: Extract<QuizStep, { kind: "lead" }>;
  leadValues: Record<string, string>;
  consent: boolean;
  onLeadFieldChange: (fieldId: string, value: string) => void;
  onConsentChange: (checked: boolean) => void;
  onLeadSubmit: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {step.kicker ? (
          <p className="text-[11px] uppercase tracking-[0.34em] text-white/46">{step.kicker}</p>
        ) : null}
        <h1 className="font-sans text-[2rem] font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-[2.35rem]">
          {step.title}
        </h1>
        {step.body ? (
          <p className="text-base leading-7 text-white/66">{step.body}</p>
        ) : null}
      </div>

      <div className="space-y-4 rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        {step.fields.map((field) => (
          <LeadFieldInput
            key={field.id}
            field={field}
            value={normalizeFieldValue(leadValues, field.id)}
            onChange={(value) => onLeadFieldChange(field.id, value)}
          />
        ))}

        <label className="flex items-start gap-3 rounded-[1.4rem] border border-white/10 bg-black/30 px-4 py-4">
          <input
            checked={consent}
            onChange={(event) => onConsentChange(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-white/30 bg-black text-white accent-white"
            type="checkbox"
          />
          <span className="text-sm leading-6 text-white/68">{step.consentLabel}</span>
        </label>
      </div>

      <Button
        onClick={onLeadSubmit}
        className="h-12 w-full rounded-full bg-white text-black hover:bg-white/92"
      >
        {step.submitLabel}
      </Button>

      <p className="text-sm leading-6 text-white/42">{step.disclaimer}</p>
    </div>
  );
}

function OfferStep({
  step,
  resultProfile,
  onOfferClick,
}: {
  step: Extract<QuizStep, { kind: "offer" }>;
  resultProfile: QuizResultProfile;
  onOfferClick: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {step.kicker ? (
          <p className="text-[11px] uppercase tracking-[0.34em] text-white/46">{step.kicker}</p>
        ) : null}
        <h1 className="font-sans text-[2rem] font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-[2.35rem]">
          {step.title}
        </h1>
        {step.body ? (
          <p className="text-base leading-7 text-white/66">{step.body}</p>
        ) : null}
      </div>

      <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">why this fits</p>
        <p className="mt-3 text-lg font-medium leading-7 tracking-[-0.03em] text-white">
          {resultProfile.offerBridge}
        </p>

        <div className="mt-6 grid gap-3">
          {step.bullets.map((bullet) => (
            <div key={bullet} className="flex gap-3 rounded-[1.3rem] border border-white/8 bg-black/30 px-4 py-4">
              <div className="mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full border border-white/14 bg-white/[0.06]">
                <Check className="h-3.5 w-3.5 text-white/84" strokeWidth={1.2} />
              </div>
              <p className="text-sm leading-6 text-white/72">{bullet}</p>
            </div>
          ))}
        </div>
      </div>

      <Button
        asChild
        className="h-12 w-full rounded-full bg-white text-black hover:bg-white/92"
      >
        <a href={step.ctaUrl} onClick={onOfferClick} rel="noopener noreferrer" target="_blank">
          {step.ctaLabel}
        </a>
      </Button>

      {step.note ? (
        <p className="text-center text-xs uppercase tracking-[0.28em] text-white/40">{step.note}</p>
      ) : null}
      {step.guarantee ? (
        <p className="text-center text-sm leading-6 text-white/46">{step.guarantee}</p>
      ) : null}
    </div>
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
  return (
    <div className="grid gap-2">
      <Label className="text-[11px] uppercase tracking-[0.28em] text-white/46">{field.label}</Label>
      {field.type === "textarea" ? (
        <Textarea
          className="min-h-[120px] rounded-[1.2rem] border-white/10 bg-black/30 text-white placeholder:text-white/28 focus-visible:ring-white/20"
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          value={value}
        />
      ) : (
        <Input
          className="h-12 rounded-[1.2rem] border-white/10 bg-black/30 text-white placeholder:text-white/28 focus-visible:ring-white/20"
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          type={field.type}
          value={value}
        />
      )}
    </div>
  );
}
