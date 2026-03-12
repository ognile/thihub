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
    <div className="h-[220px] animate-pulse rounded-[1.6rem] border border-black/[0.08] bg-black/[0.03]" />
  ),
});

const STORAGE_PREFIX = "quiz-funnel-v2";
const LIGHT_SHELL =
  "bg-[#f4f1ea] font-sans text-[#161410] [&_h1]:font-sans [&_h2]:font-sans [&_h3]:font-sans";
const LIGHT_PANEL =
  "overflow-hidden rounded-[2.15rem] border border-black/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,240,232,0.92))] shadow-[0_28px_90px_rgba(28,24,17,0.12)] backdrop-blur-xl";
const LIGHT_INSET =
  "rounded-[1.6rem] border border-black/[0.08] bg-white/82 shadow-[0_14px_48px_rgba(28,24,17,0.06)]";
const SECONDARY_PANEL =
  "rounded-[1.45rem] border border-black/[0.07] bg-[#f1ede4]/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]";
const STEP_LABEL =
  "text-[11px] uppercase tracking-[0.34em] text-[#7b746a]";
const STEP_TITLE =
  "font-sans text-[2.12rem] font-semibold leading-[0.96] tracking-[-0.065em] text-[#15130f] sm:text-[2.55rem]";
const STEP_BODY = "text-[15px] leading-7 text-[#5a544c]";
const PRIMARY_BUTTON =
  "h-12 w-full rounded-full border border-[#171614] bg-[#171614] text-white shadow-[0_18px_38px_rgba(23,22,20,0.14)] transition duration-300 hover:-translate-y-0.5 hover:bg-black disabled:pointer-events-none disabled:opacity-45";
const OPTION_IDLE =
  "border-black/[0.08] bg-white/88 text-[#171410] shadow-[0_14px_34px_rgba(24,20,12,0.05)] hover:-translate-y-0.5 hover:border-black/[0.14] hover:shadow-[0_22px_50px_rgba(24,20,12,0.08)]";
const OPTION_ACTIVE =
  "border-[#171614] bg-[#171614] text-white shadow-[0_24px_52px_rgba(23,22,20,0.16)]";

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
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null);
  const [leadValues, setLeadValues] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [draftStepId, setDraftStepId] = useState<string | null>(null);
  const completionSentRef = useRef(false);
  const lastViewedRef = useRef<string | null>(null);
  const pendingAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (pendingAdvanceTimerRef.current) {
      clearTimeout(pendingAdvanceTimerRef.current);
      pendingAdvanceTimerRef.current = null;
    }

    setDraftStepId(null);
    setSelectedOptions([]);
    setPendingOptionId(null);
    setLeadValues({});
    setConsent(false);
    setSubmissionError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (pendingAdvanceTimerRef.current) {
        clearTimeout(pendingAdvanceTimerRef.current);
      }
    };
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
      if (!snapshot || !currentStep || pendingOptionId) {
        return;
      }

      const submitSelection = () => {
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
          setPendingOptionId(null);
          setSubmissionError(message);
        }
      };

      if (reducedMotion) {
        submitSelection();
        return;
      }

      setSubmissionError(null);
      setPendingOptionId(optionId);
      pendingAdvanceTimerRef.current = setTimeout(() => {
        pendingAdvanceTimerRef.current = null;
        submitSelection();
      }, 260);
    },
    [currentStep, moveToSnapshot, pendingOptionId, quiz, reducedMotion, sendEvent, snapshot],
  );

  const handleMultiSelectContinue = useCallback(() => {
    if (!snapshot || !currentStep) {
      return;
    }

    try {
      const optionIds = resolvedSelectedOptionsForStep(currentStep.id, draftStepId, selectedOptions, snapshot);
      const nextSnapshot = advanceQuizSnapshot(quiz, snapshot, {
        stepId: currentStep.id,
        optionIds,
      });

      void sendEvent({
        sessionToken: snapshot.sessionToken,
        eventType: "answer_submitted",
        stepId: currentStep.id,
        nextStepId: nextSnapshot.currentStepId,
        optionIds,
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

    if (pendingAdvanceTimerRef.current) {
      clearTimeout(pendingAdvanceTimerRef.current);
      pendingAdvanceTimerRef.current = null;
    }

    setPendingOptionId(null);
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
  const visibleProgress = Math.max(progress.percent, 6);
  const progressIndicatorLeft = Math.min(Math.max(visibleProgress, 6), 97);

  const stageMotion = reducedMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : {
        initial: { opacity: 0, x: 46, y: 10, scale: 0.982, filter: "blur(12px)" },
        animate: { opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)" },
        exit: { opacity: 0, x: -38, y: -8, scale: 0.988, filter: "blur(10px)" },
      };

  if (isBooting || !snapshot || !currentStep) {
    return (
      <div
        data-quiz-shell="monochrome"
        className={cn(
          embedded ? `min-h-full ${LIGHT_SHELL}` : `min-h-screen ${LIGHT_SHELL}`,
          className,
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(17,17,17,0.08),transparent_28%),linear-gradient(180deg,#faf8f2_0%,#ebe5da_100%)]" />
        <div
          className={cn(
            "mx-auto flex max-w-[1160px] items-center justify-center px-4 py-6 sm:px-6",
            embedded ? "min-h-[860px]" : "min-h-screen",
          )}
        >
          <Loader2 className="h-8 w-8 animate-spin text-black/42" strokeWidth={1.2} />
        </div>
      </div>
    );
  }

  return (
    <div
      data-quiz-shell="monochrome"
      className={cn(
        embedded ? `min-h-full overflow-hidden ${LIGHT_SHELL}` : `min-h-screen overflow-hidden ${LIGHT_SHELL}`,
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.94),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(17,17,17,0.08),transparent_30%),linear-gradient(180deg,#faf8f2_0%,#ebe5da_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(17,17,17,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(17,17,17,0.045)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]" />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-12 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.74),rgba(255,255,255,0))]"
        animate={reducedMotion ? undefined : { scale: [1, 1.06, 1], opacity: [0.65, 0.9, 0.65] }}
        transition={reducedMotion ? undefined : { duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className={cn(
          "relative mx-auto flex w-full max-w-[1160px] items-center justify-center px-4 py-6 sm:px-6 lg:px-10",
          embedded ? "min-h-[920px]" : "min-h-screen",
        )}
      >
        <div className="w-full max-w-[446px]">
          <motion.div
            initial={reducedMotion ? undefined : { opacity: 0, y: 18, scale: 0.988 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            transition={reducedMotion ? undefined : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className={LIGHT_PANEL}
          >
            <div className="border-b border-black/[0.08] px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
              <div className="flex items-center justify-between gap-3">
                {snapshot.trail.length > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.08] bg-white/88 text-[#171614] transition duration-300 hover:-translate-y-0.5 hover:border-black/[0.16] hover:bg-white"
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={1.2} />
                  </button>
                ) : (
                  <motion.div
                    initial={reducedMotion ? undefined : { opacity: 0, x: -10 }}
                    animate={reducedMotion ? undefined : { opacity: 1, x: 0 }}
                    transition={reducedMotion ? undefined : { duration: 0.35, delay: 0.12 }}
                    className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/84 px-3 py-2 text-[11px] uppercase tracking-[0.28em] text-[#5f584f]"
                  >
                    <Sparkles className="h-3.5 w-3.5" strokeWidth={1.2} />
                    private flow
                  </motion.div>
                )}

                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-[#81796f]">{sourceLabel}</p>
                  <p className="mt-1 text-xs text-[#302c27]">
                    {progress.current}/{progress.total}
                  </p>
                </div>
              </div>

              <div className="relative mt-5 h-[4px] overflow-hidden rounded-full bg-black/[0.08]">
                <motion.div
                  className="h-full rounded-full bg-[#171614]"
                  initial={false}
                  animate={{ width: `${visibleProgress}%` }}
                  transition={{
                    type: reducedMotion ? "tween" : "spring",
                    duration: reducedMotion ? 0 : undefined,
                    stiffness: 170,
                    damping: 24,
                  }}
                />
                <motion.div
                  className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-white bg-[#171614] shadow-[0_0_0_4px_rgba(23,22,20,0.12)]"
                  initial={false}
                  animate={{ left: `calc(${progressIndicatorLeft}% - 6px)` }}
                  transition={{
                    type: reducedMotion ? "tween" : "spring",
                    duration: reducedMotion ? 0 : undefined,
                    stiffness: 170,
                    damping: 24,
                  }}
                />
              </div>
            </div>

            <div className="relative min-h-[710px] px-5 py-6 sm:px-6 sm:py-7">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${currentStep.id}:${snapshot.trail.length}`}
                  initial={stageMotion.initial}
                  animate={stageMotion.animate}
                  exit={stageMotion.exit}
                  transition={{ duration: reducedMotion ? 0 : 0.5, ease: [0.19, 1, 0.22, 1] }}
                >
                  <StepSurface
                    currentStep={currentStep}
                    quiz={quiz}
                    resultProfile={resultProfile}
                    selectedOptions={resolvedSelectedOptions}
                    pendingOptionId={pendingOptionId}
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
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function StepSurface({
  currentStep,
  quiz,
  resultProfile,
  selectedOptions,
  pendingOptionId,
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
  pendingOptionId: string | null;
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
    <div className="space-y-7">
      {currentStep.kind === "welcome" ? (
        <WelcomeStep step={currentStep} reducedMotion={reducedMotion} onAdvance={onAdvance} />
      ) : null}

      {currentStep.kind === "question" ? (
        <QuestionStep
          step={currentStep}
          pendingOptionId={pendingOptionId}
          reducedMotion={reducedMotion}
          selectedOptions={selectedOptions}
          onSingleSelect={onSingleSelect}
          onToggleOption={onToggleOption}
          onContinue={onMultiSelectContinue}
        />
      ) : null}

      {currentStep.kind === "message" ? (
        <MessageStep step={currentStep} reducedMotion={reducedMotion} onAdvance={onAdvance} />
      ) : null}

      {currentStep.kind === "analysis" ? (
        <AnalysisStep step={currentStep} onAdvance={onAdvance} reducedMotion={reducedMotion} />
      ) : null}

      {currentStep.kind === "result" ? (
        <ResultStep
          step={currentStep}
          resultProfile={resultProfile}
          reducedMotion={reducedMotion}
          onAdvance={onAdvance}
        />
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
        <p className="rounded-[1.35rem] border border-black/[0.08] bg-white/80 px-4 py-3 text-sm text-[#3d3832]">
          {submissionError}
        </p>
      ) : null}

      <div className="flex items-center justify-between border-t border-black/[0.08] pt-4 text-[11px] uppercase tracking-[0.28em] text-[#847c71]">
        <span>{quiz.name}</span>
        <span>{currentStep.kind}</span>
      </div>
    </div>
  );
}

function WelcomeStep({
  step,
  reducedMotion,
  onAdvance,
}: {
  step: Extract<QuizStep, { kind: "welcome" }>;
  reducedMotion: boolean;
  onAdvance: () => void;
}) {
  return (
    <div className="space-y-7">
      <div className="space-y-5">
        {step.kicker ? <p className={STEP_LABEL}>{step.kicker}</p> : null}
        <h1 className={STEP_TITLE}>{step.title}</h1>
        {step.body ? <p className={cn(STEP_BODY, "max-w-[32rem]")}>{step.body}</p> : null}
      </div>

      <div className="grid gap-3">
        {step.trustPoints.map((point, index) => (
          <motion.div
            key={point}
            initial={reducedMotion ? undefined : { opacity: 0, y: 16 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={reducedMotion ? undefined : { duration: 0.32, delay: 0.08 * index }}
            className={cn(LIGHT_INSET, "flex items-center gap-3 px-4 py-4")}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.08] bg-[#171614] text-white">
              <Check className="h-4 w-4" strokeWidth={1.2} />
            </div>
            <p className="text-sm leading-6 text-[#3f3a33]">{point}</p>
          </motion.div>
        ))}
      </div>

      <motion.button
        type="button"
        onClick={onAdvance}
        whileTap={reducedMotion ? undefined : { scale: 0.992 }}
        whileHover={reducedMotion ? undefined : { y: -2 }}
        className="group relative flex w-full items-center justify-between overflow-hidden rounded-[1.75rem] border border-[#171614] bg-[#171614] px-5 py-5 text-left text-white shadow-[0_24px_50px_rgba(23,22,20,0.16)]"
      >
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-[linear-gradient(90deg,rgba(255,255,255,0.18),rgba(255,255,255,0))]"
          animate={reducedMotion ? undefined : { x: ["-100%", "220%"] }}
          transition={reducedMotion ? undefined : { duration: 1.8, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
        />
        <div className="relative space-y-2">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/56">begin</p>
          <p className="text-xl font-semibold tracking-[-0.03em]">{step.primaryLabel}</p>
          {step.secondaryLabel ? (
            <p className="text-sm leading-6 text-white/68">{step.secondaryLabel}</p>
          ) : null}
        </div>
        <ArrowRight className="relative h-5 w-5 transition group-hover:translate-x-0.5" strokeWidth={1.2} />
      </motion.button>
    </div>
  );
}

function QuestionStep({
  step,
  selectedOptions,
  pendingOptionId,
  reducedMotion,
  onSingleSelect,
  onToggleOption,
  onContinue,
}: {
  step: Extract<QuizStep, { kind: "question" }>;
  selectedOptions: string[];
  pendingOptionId: string | null;
  reducedMotion: boolean;
  onSingleSelect: (optionId: string) => void;
  onToggleOption: (optionId: string) => void;
  onContinue: () => void;
}) {
  const interactionLocked = step.selection === "single" && pendingOptionId !== null;

  return (
    <div className="space-y-7">
      <div className="space-y-4">
        {step.kicker ? <p className={STEP_LABEL}>{step.kicker}</p> : null}
        <h1 className={STEP_TITLE}>{step.title}</h1>
        {step.body ? <p className={STEP_BODY}>{step.body}</p> : null}
      </div>

      <div className="grid gap-3">
        {step.options.map((option, index) => {
          const isSelected = selectedOptions.includes(option.id) || pendingOptionId === option.id;
          const action = step.selection === "single"
            ? () => onSingleSelect(option.id)
            : () => onToggleOption(option.id);

          return (
            <motion.button
              key={option.id}
              type="button"
              onClick={action}
              disabled={interactionLocked && !isSelected}
              initial={reducedMotion ? undefined : { opacity: 0, y: 20, scale: 0.985 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
              transition={reducedMotion ? undefined : { duration: 0.32, delay: index * 0.055, ease: [0.22, 1, 0.36, 1] }}
              whileTap={interactionLocked ? undefined : { scale: 0.988 }}
              whileHover={interactionLocked ? undefined : { y: -2 }}
              className={cn(
                "group relative w-full overflow-hidden rounded-[1.55rem] border px-4 py-4 text-left transition duration-300 sm:px-5",
                isSelected ? OPTION_ACTIVE : OPTION_IDLE,
                interactionLocked && !isSelected ? "opacity-60" : "",
              )}
            >
              <motion.div
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-y-0 left-0 w-full origin-left",
                  isSelected ? "bg-[linear-gradient(90deg,rgba(255,255,255,0.14),rgba(255,255,255,0))]" : "bg-[linear-gradient(90deg,rgba(23,22,20,0.045),rgba(23,22,20,0))]",
                )}
                initial={false}
                animate={{ scaleX: isSelected ? 1 : 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.24, ease: "easeOut" }}
              />
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full border transition",
                    isSelected ? "border-white/65 bg-white text-[#171614]" : "border-black/20 bg-transparent text-transparent",
                  )}
                >
                  <motion.span
                    className={cn("h-2.5 w-2.5 rounded-full", isSelected ? "bg-[#171614]" : "bg-transparent")}
                    initial={false}
                    animate={{ scale: isSelected ? 1 : 0.4, opacity: isSelected ? 1 : 0 }}
                    transition={{ duration: reducedMotion ? 0 : 0.18 }}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className={cn("text-lg font-medium tracking-[-0.02em]", isSelected ? "text-white" : "text-[#171410]")}>
                      {option.label}
                    </p>
                    <span className={cn("text-xs uppercase tracking-[0.28em]", isSelected ? "text-white/54" : "text-[#8c8377]")}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  {option.description ? (
                    <p className={cn("text-sm leading-6", isSelected ? "text-white/74" : "text-[#5d564d]")}>
                      {option.description}
                    </p>
                  ) : null}
                  {option.revealNote ? (
                    <p className={cn("text-[11px] uppercase tracking-[0.28em]", isSelected ? "text-white/44" : "text-[#8f877c]")}>
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
        <Button onClick={onContinue} disabled={selectedOptions.length === 0} className={PRIMARY_BUTTON}>
          {step.continueLabel ?? "continue"}
        </Button>
      ) : (
        <p className="text-center text-xs uppercase tracking-[0.28em] text-[#8b8377]">
          {pendingOptionId ? "locking your answer" : "tap one answer to move instantly"}
        </p>
      )}
    </div>
  );
}

function MessageStep({
  step,
  reducedMotion,
  onAdvance,
}: {
  step: Extract<QuizStep, { kind: "message" }>;
  reducedMotion: boolean;
  onAdvance: () => void;
}) {
  return (
    <div className="space-y-7">
      <div className={cn(LIGHT_INSET, "overflow-hidden p-5 sm:p-6")}>
        <div className="space-y-5">
          {step.kicker ? <p className={STEP_LABEL}>{step.kicker}</p> : null}
          <h1 className={STEP_TITLE}>{step.title}</h1>
          {step.body ? <p className={STEP_BODY}>{step.body}</p> : null}
        </div>

        {step.highlights?.length ? (
          <div className="mt-6 grid gap-3">
            {step.highlights.map((highlight, index) => (
              <motion.div
                key={highlight.id}
                initial={reducedMotion ? undefined : { opacity: 0, y: 18 }}
                animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                transition={reducedMotion ? undefined : { duration: 0.34, delay: 0.09 * index }}
                className="rounded-[1.55rem] border border-[#171614] bg-[#171614] px-4 py-4 text-white shadow-[0_24px_52px_rgba(23,22,20,0.12)]"
              >
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/44">{highlight.label}</p>
                <p className="mt-3 text-lg font-medium leading-7 tracking-[-0.03em] text-white">
                  {highlight.value}
                </p>
              </motion.div>
            ))}
          </div>
        ) : null}

        {step.bullets?.length ? (
          <div className="mt-6 grid gap-3">
            {step.bullets.map((bullet, index) => (
              <motion.div
                key={bullet}
                initial={reducedMotion ? undefined : { opacity: 0, x: -14 }}
                animate={reducedMotion ? undefined : { opacity: 1, x: 0 }}
                transition={reducedMotion ? undefined : { duration: 0.28, delay: 0.07 * index }}
                className={cn(SECONDARY_PANEL, "flex gap-3 px-4 py-4")}
              >
                <div className="mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full border border-black/[0.08] bg-white">
                  <Check className="h-3.5 w-3.5 text-[#171614]" strokeWidth={1.2} />
                </div>
                <p className="text-sm leading-6 text-[#514a43]">{bullet}</p>
              </motion.div>
            ))}
          </div>
        ) : null}
      </div>

      <Button onClick={onAdvance} className={PRIMARY_BUTTON}>
        {step.primaryLabel}
      </Button>

      {step.secondaryLabel ? (
        <p className="text-center text-xs uppercase tracking-[0.28em] text-[#8d857b]">{step.secondaryLabel}</p>
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
  const stageCount = step.stages.length;
  const activeStage = step.stages[Math.min(activeStageIndex, stageCount - 1)];
  const completedCount = isFinished ? stageCount : completedStageIds.length;
  const progressPercent = isFinished
    ? 100
    : Math.round(((activeStageIndex + 1) / stageCount) * 100);
  const ringRadius = 38;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progressPercent / 100);

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
          timer = setTimeout(() => onAdvance(), reducedMotion ? 0 : 420);
        }
        return;
      }

      setActiveStageIndex(index);
      const durationMs = reducedMotion ? 160 : step.stages[index].durationMs;

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

  return (
    <div className="space-y-7">
      <div className="space-y-4">
        {step.kicker ? <p className={STEP_LABEL}>{step.kicker}</p> : null}
        <h1 className={STEP_TITLE}>{step.title}</h1>
        {step.body ? <p className={STEP_BODY}>{step.body}</p> : null}
      </div>

      <div className={cn(LIGHT_INSET, "overflow-hidden p-5 sm:p-6")}>
        <div className="grid gap-5 sm:grid-cols-[136px_minmax(0,1fr)] sm:items-center">
          <div className="relative mx-auto flex h-[128px] w-[128px] items-center justify-center">
            {!reducedMotion ? (
              <>
                <motion.span
                  className="absolute inset-[8px] rounded-full border border-black/8"
                  animate={{ scale: [1, 1.08, 1], opacity: [0.18, 0.06, 0.18] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.span
                  className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(23,22,20,0.08),rgba(23,22,20,0))]"
                  animate={{ scale: [0.92, 1.02, 0.92], opacity: [0.45, 0.72, 0.45] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                />
              </>
            ) : null}
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
              <circle
                cx="48"
                cy="48"
                r={ringRadius}
                fill="none"
                stroke="rgba(23,22,20,0.08)"
                strokeWidth="6"
              />
              <motion.circle
                cx="48"
                cy="48"
                r={ringRadius}
                fill="none"
                stroke="#171614"
                strokeLinecap="round"
                strokeWidth="6"
                initial={false}
                animate={{ strokeDashoffset: ringOffset }}
                strokeDasharray={ringCircumference}
                transition={{
                  type: reducedMotion ? "tween" : "spring",
                  duration: reducedMotion ? 0 : undefined,
                  stiffness: 130,
                  damping: 24,
                }}
              />
            </svg>
            <div className="relative flex h-[86px] w-[86px] flex-col items-center justify-center rounded-full border border-black/[0.08] bg-white/92 text-[#171614] shadow-[0_12px_36px_rgba(23,22,20,0.08)]">
              <Sparkles className="h-5 w-5" strokeWidth={1.2} />
              <span className="mt-2 text-[11px] uppercase tracking-[0.28em] text-[#7a7268]">
                {progressPercent}%
              </span>
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-[#7f776d]">
              <span>analysis pass</span>
              <span>{completedCount}/{stageCount} complete</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#544d46]">
              the analysis now intentionally lingers so the sequence feels credible instead of instant.
            </p>
            <div className="mt-4 rounded-[1.35rem] border border-black/[0.06] bg-[#f7f3eb] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#81796f]">
                {activeStage?.label ?? "finalizing your profile"}
              </p>
              <p className="mt-2 text-base font-medium tracking-[-0.02em] text-[#171410]">
                {activeStage?.description ?? "handoff to your result screen"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 h-[5px] overflow-hidden rounded-full bg-black/[0.08]">
          <motion.div
            className="h-full rounded-full bg-[#171614]"
            initial={false}
            animate={{ width: `${Math.max(progressPercent, 8)}%` }}
            transition={{
              type: reducedMotion ? "tween" : "spring",
              duration: reducedMotion ? 0 : undefined,
              stiffness: 180,
              damping: 24,
            }}
          />
        </div>

        <div className="mt-6 grid gap-3">
          {step.stages.map((stage, index) => {
            const isActive = index === activeStageIndex && !isFinished;
            const isComplete = completedStageIds.includes(stage.id) || isFinished;
            return (
              <motion.div
                key={stage.id}
                initial={reducedMotion ? undefined : { opacity: 0, y: 18 }}
                animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                transition={reducedMotion ? undefined : { duration: 0.28, delay: 0.06 * index }}
                className={cn(
                  "relative overflow-hidden rounded-[1.45rem] border px-4 py-4 transition duration-300",
                  isActive
                    ? "border-[#171614] bg-[#171614] text-white shadow-[0_24px_52px_rgba(23,22,20,0.14)]"
                    : isComplete
                      ? "border-black/[0.08] bg-white text-[#171614]"
                      : "border-black/[0.06] bg-[#f1ece3] text-[#3c3934]",
                )}
              >
                <motion.div
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute inset-y-0 left-0 w-full origin-left",
                    isActive ? "bg-[linear-gradient(90deg,rgba(255,255,255,0.12),rgba(255,255,255,0))]" : "bg-black/[0.04]",
                  )}
                  initial={false}
                  animate={{ scaleX: isActive || isComplete ? 1 : 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.28, ease: "easeOut" }}
                />
                <div className="relative flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full border",
                      isActive
                        ? "border-white/24 bg-white/12"
                        : isComplete
                          ? "border-black/[0.08] bg-[#171614] text-white"
                          : "border-black/[0.08] bg-white",
                    )}
                  >
                    {isComplete ? (
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={1.2} />
                    ) : isActive ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-white/80" strokeWidth={1.2} />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-[#171614]/20" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className={cn("text-sm font-medium tracking-[-0.01em]", isActive ? "text-white" : "text-current")}>
                        {stage.label}
                      </p>
                      <span className={cn("text-[11px] uppercase tracking-[0.26em]", isActive ? "text-white/46" : "text-[#8a8175]")}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    {stage.description ? (
                      <p className={cn("mt-1 text-sm leading-6", isActive ? "text-white/72" : "text-[#5b544d]")}>
                        {stage.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {!step.autoAdvance && isFinished ? (
        <Button onClick={onAdvance} className={PRIMARY_BUTTON}>
          continue
        </Button>
      ) : null}
    </div>
  );
}

function ResultStep({
  step,
  resultProfile,
  reducedMotion,
  onAdvance,
}: {
  step: Extract<QuizStep, { kind: "result" }>;
  resultProfile: QuizResultProfile;
  reducedMotion: boolean;
  onAdvance: () => void;
}) {
  return (
    <div className="space-y-7">
      <div className="space-y-4">
        {step.kicker ? <p className={STEP_LABEL}>{step.kicker}</p> : null}
        <div className="inline-flex rounded-full border border-black/[0.08] bg-white/84 px-3 py-2 text-[11px] uppercase tracking-[0.3em] text-[#5b554d]">
          {resultProfile.badge}
        </div>
        <h1 className={STEP_TITLE}>{resultProfile.headline}</h1>
        <p className={STEP_BODY}>{resultProfile.summary}</p>
      </div>

      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, y: 16 }}
        animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.35 }}
        className={cn(LIGHT_INSET, "p-5 sm:p-6")}
      >
        <p className="text-[11px] uppercase tracking-[0.3em] text-[#80786e]">current read</p>
        <p className="mt-3 text-lg font-medium leading-7 tracking-[-0.03em] text-[#171410]">
          {resultProfile.affirmation}
        </p>
        <p className="mt-4 text-sm leading-7 text-[#575149]">{resultProfile.mechanism}</p>
      </motion.div>

      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, y: 18 }}
        animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.38, delay: 0.05 }}
        className={cn(LIGHT_INSET, "p-5 sm:p-6")}
      >
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#80786e]">{resultProfile.graphTitle}</p>
          <p className="text-sm leading-6 text-[#5a544c]">{resultProfile.graphCaption}</p>
        </div>
        <div className="mt-5">
          <QuizResultGraph resultId={resultProfile.id} metrics={resultProfile.metrics} />
        </div>
      </motion.div>

      <div className="grid gap-3">
        {resultProfile.criteria.map((criterion, index) => (
          <motion.div
            key={criterion.id}
            initial={reducedMotion ? undefined : { opacity: 0, x: -14 }}
            animate={reducedMotion ? undefined : { opacity: 1, x: 0 }}
            transition={reducedMotion ? undefined : { duration: 0.28, delay: 0.06 * index }}
            className={cn(SECONDARY_PANEL, "px-4 py-4")}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium tracking-[-0.01em] text-[#171410]">{criterion.label}</p>
              <span className="text-[11px] uppercase tracking-[0.28em] text-[#827a70]">
                {emphasisLabel(criterion.emphasis)}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#5c554d]">{criterion.detail}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className={cn(LIGHT_INSET, "p-5")}>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#80786e]">what supports this read</p>
          <div className="mt-4 grid gap-3">
            {resultProfile.educationBullets.map((bullet) => (
              <div key={bullet} className="flex gap-3">
                <div className="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-[#171614]" />
                <p className="text-sm leading-6 text-[#5b554d]">{bullet}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[1.6rem] border border-[#171614] bg-[#171614] p-5 text-white shadow-[0_24px_50px_rgba(23,22,20,0.12)]">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/46">keep in mind</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {resultProfile.dopamineCandies.map((candy) => (
              <span
                key={candy}
                className="rounded-full border border-white/14 bg-white/8 px-3 py-2 text-xs leading-5 text-white/82"
              >
                {candy}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={onAdvance} className={PRIMARY_BUTTON}>
        {step.primaryLabel}
      </Button>

      <p className="text-center text-xs leading-6 text-[#81796e]">{step.disclaimer}</p>
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
    <div className="space-y-7">
      <div className="space-y-4">
        {step.kicker ? <p className={STEP_LABEL}>{step.kicker}</p> : null}
        <h1 className={STEP_TITLE}>{step.title}</h1>
        {step.body ? <p className={STEP_BODY}>{step.body}</p> : null}
      </div>

      <div className={cn(LIGHT_INSET, "space-y-4 p-5 sm:p-6")}>
        {step.fields.map((field) => (
          <LeadFieldInput
            key={field.id}
            field={field}
            value={normalizeFieldValue(leadValues, field.id)}
            onChange={(value) => onLeadFieldChange(field.id, value)}
          />
        ))}

        <label className={cn(SECONDARY_PANEL, "flex items-start gap-3 px-4 py-4")}>
          <input
            checked={consent}
            onChange={(event) => onConsentChange(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-black/20 bg-white text-[#171614] accent-[#171614]"
            type="checkbox"
          />
          <span className="text-sm leading-6 text-[#5c554d]">{step.consentLabel}</span>
        </label>
      </div>

      <Button onClick={onLeadSubmit} className={PRIMARY_BUTTON}>
        {step.submitLabel}
      </Button>

      <p className="text-sm leading-6 text-[#7e766b]">{step.disclaimer}</p>
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
    <div className="space-y-7">
      <div className="space-y-4">
        {step.kicker ? <p className={STEP_LABEL}>{step.kicker}</p> : null}
        <h1 className={STEP_TITLE}>{step.title}</h1>
        {step.body ? <p className={STEP_BODY}>{step.body}</p> : null}
      </div>

      <div className={cn(LIGHT_INSET, "p-5 sm:p-6")}>
        <p className="text-[11px] uppercase tracking-[0.3em] text-[#80786e]">why this fits</p>
        <p className="mt-3 text-lg font-medium leading-7 tracking-[-0.03em] text-[#171410]">
          {resultProfile.offerBridge}
        </p>

        <div className="mt-6 grid gap-3">
          {step.bullets.map((bullet) => (
            <div key={bullet} className={cn(SECONDARY_PANEL, "flex gap-3 px-4 py-4")}>
              <div className="mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full border border-black/[0.08] bg-[#171614]">
                <Check className="h-3.5 w-3.5 text-white" strokeWidth={1.2} />
              </div>
              <p className="text-sm leading-6 text-[#554f47]">{bullet}</p>
            </div>
          ))}
        </div>
      </div>

      <Button asChild className={PRIMARY_BUTTON}>
        <a href={step.ctaUrl} onClick={onOfferClick} rel="noopener noreferrer" target="_blank">
          {step.ctaLabel}
        </a>
      </Button>

      {step.note ? (
        <p className="text-center text-xs uppercase tracking-[0.28em] text-[#857d73]">{step.note}</p>
      ) : null}
      {step.guarantee ? (
        <p className="text-center text-sm leading-6 text-[#6b645b]">{step.guarantee}</p>
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
      <Label className="text-[11px] uppercase tracking-[0.28em] text-[#80796f]">{field.label}</Label>
      {field.type === "textarea" ? (
        <Textarea
          className="min-h-[120px] rounded-[1.2rem] border-black/[0.08] bg-white text-[#171410] placeholder:text-[#9a9288] focus-visible:ring-black/12"
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          value={value}
        />
      ) : (
        <Input
          className="h-12 rounded-[1.2rem] border-black/[0.08] bg-white text-[#171410] placeholder:text-[#9a9288] focus-visible:ring-black/12"
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          type={field.type}
          value={value}
        />
      )}
    </div>
  );
}
