"use client";

import dynamic from "next/dynamic";
import {
  type ReactNode,
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
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
const PREMIUM_PANEL =
  "rounded-[1.8rem] border border-[#171614] bg-[#171614] text-white shadow-[0_24px_52px_rgba(23,22,20,0.16)]";
const STEP_LABEL =
  "text-[11px] uppercase tracking-[0.34em] text-[#7b746a]";
const STEP_TITLE =
  "font-sans text-[1.95rem] font-semibold leading-[0.98] tracking-[-0.06em] text-[#15130f] sm:text-[2.45rem]";
const STEP_BODY = "text-[14px] leading-6 text-[#5a544c] sm:text-[15px] sm:leading-7";
const PRIMARY_BUTTON =
  "h-12 w-full rounded-full border border-[#171614] bg-[#171614] text-white shadow-[0_18px_38px_rgba(23,22,20,0.14)] transition duration-300 hover:-translate-y-0.5 hover:bg-black disabled:pointer-events-none disabled:opacity-45";
const OPTION_IDLE =
  "border-black/[0.08] bg-white/88 text-[#171410] shadow-[0_14px_34px_rgba(24,20,12,0.05)] hover:-translate-y-0.5 hover:border-black/[0.14] hover:shadow-[0_22px_50px_rgba(24,20,12,0.08)]";
const OPTION_ACTIVE =
  "border-[#171614] bg-[#171614] text-white shadow-[0_24px_52px_rgba(23,22,20,0.16)]";
const ANALYSIS_BAR_LAYOUT = [0.42, 0.68, 0.94, 0.58, 0.8];
const MOBILE_BREAKPOINT_QUERY = "(max-width: 639px)";
const MOBILE_ANALYSIS_STAGE_DURATIONS = [1350, 1500, 1300];
const MOBILE_ANALYSIS_COMPLETION_DELAY_MS = 650;
const MOBILE_STEP_EASE = [0.22, 1, 0.36, 1] as const;
const DESKTOP_STAGE_EASE = [0.19, 1, 0.22, 1] as const;
const MOBILE_PROGRESS_EASE = [0.16, 1, 0.3, 1] as const;

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

interface AdaptiveSelectionSummary {
  stepId: string;
  stepTitle: string;
  optionLabel: string;
}

interface AdaptiveSignalSummary {
  leadingBadge: string;
  leadingLabel: string;
  recentSelection: AdaptiveSelectionSummary | null;
  recentSelections: AdaptiveSelectionSummary[];
}

interface MobileAnalysisStageSummary {
  id: string;
  label: string;
  description: string;
  evidenceLabel: string;
  evidenceValue: string;
}

function getQuestionStep(definition: QuizDefinition, stepId: string) {
  return definition.steps.find(
    (candidate): candidate is Extract<QuizStep, { kind: "question" }> =>
      candidate.id === stepId && candidate.kind === "question",
  );
}

function buildAdaptiveSignal(
  definition: QuizDefinition,
  answers: QuizSessionSnapshot["answers"],
  resultProfile: QuizResultProfile,
): AdaptiveSignalSummary {
  const recentSelections = answers
    .slice(-3)
    .reverse()
    .flatMap((answer) => {
      const step = getQuestionStep(definition, answer.stepId);
      if (!step) {
        return [];
      }

      const optionLabel = answer.optionIds
        .map((optionId) => step.options.find((candidate) => candidate.id === optionId)?.label ?? null)
        .filter((value): value is string => Boolean(value))
        .join(", ");

      if (!optionLabel) {
        return [];
      }

      return [{
        stepId: step.id,
        stepTitle: step.title,
        optionLabel,
      }];
    });

  return {
    leadingBadge: resultProfile.badge,
    leadingLabel: resultProfile.label,
    recentSelection: recentSelections[0] ?? null,
    recentSelections,
  };
}

function buildMobileAnalysisStages(
  adaptiveSignal: AdaptiveSignalSummary,
  resultProfile: QuizResultProfile,
): MobileAnalysisStageSummary[] {
  const primarySelection = adaptiveSignal.recentSelections[0]?.optionLabel ?? "your strongest recent answer";
  const secondarySelection = adaptiveSignal.recentSelections[1]?.optionLabel ?? adaptiveSignal.leadingBadge;

  return [
    {
      id: "normalize-answers",
      label: "normalizing answer weights",
      description: "removing broad-match noise from the strongest signals you gave us.",
      evidenceLabel: "recent signal",
      evidenceValue: primarySelection,
    },
    {
      id: "compare-clusters",
      label: "checking symptom overlap",
      description: `scoring your answers against the closest ${adaptiveSignal.leadingBadge.toLowerCase()} pattern.`,
      evidenceLabel: "highest overlap",
      evidenceValue: secondarySelection,
    },
    {
      id: "lock-pattern",
      label: "locking report direction",
      description: "finalizing the clearest pattern and the next step tied to it.",
      evidenceLabel: "report direction",
      evidenceValue: resultProfile.badge,
    },
  ];
}

function isLeadStepReady(
  step: Extract<QuizStep, { kind: "lead" }>,
  leadValues: Record<string, string>,
  consent: boolean,
) {
  const hasRequiredFields = step.fields.every(
    (field) => !field.required || normalizeFieldValue(leadValues, field.id).trim().length > 0,
  );

  if (!hasRequiredFields) {
    return false;
  }

  return !step.requireConsent || consent;
}

function inlineActionVisibilityClass(mobileRailActive: boolean) {
  return mobileRailActive ? "hidden sm:flex" : "flex";
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
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobileKeyboardOpen, setIsMobileKeyboardOpen] = useState(false);
  const [isLeadFieldFocused, setIsLeadFieldFocused] = useState(false);
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

  const resetViewport = useCallback(() => {
    if (embedded) {
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement !== document.body) {
      activeElement.blur();
    }

    window.scrollTo({ top: 0, behavior: "auto" });
  }, [embedded]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (!isMobileViewport || currentStep?.kind !== "lead") {
      return;
    }

    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }

    const syncKeyboardState = () => {
      const keyboardInset = Math.max(0, window.innerHeight - viewport.height);
      setIsMobileKeyboardOpen(keyboardInset > 120);
    };

    syncKeyboardState();
    viewport.addEventListener("resize", syncKeyboardState);
    viewport.addEventListener("scroll", syncKeyboardState);

    return () => {
      viewport.removeEventListener("resize", syncKeyboardState);
      viewport.removeEventListener("scroll", syncKeyboardState);
    };
  }, [currentStep?.kind, isMobileViewport]);

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

    const isInitialLandingStep =
      snapshot.trail.length === 1 && currentStep.id === quiz.steps[0]?.id;

    if (!isInitialLandingStep) {
      void sendEvent({
        sessionToken: snapshot.sessionToken,
        eventType: "step_viewed",
        stepId: currentStep.id,
        source: entrySource,
        articleSlug,
        landingPath: window.location.pathname + window.location.search,
      });
    }

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
  }, [articleSlug, currentStep, entrySource, isLive, quiz.steps, resultProfile.id, sendEvent, snapshot]);

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
      setIsLeadFieldFocused(false);
      setIsMobileKeyboardOpen(false);
      resetViewport();
      startTransition(() => setSnapshot(nextSnapshot));
    },
    [persistSnapshot, resetDraftState, resetViewport],
  );

  useLayoutEffect(() => {
    if (!snapshot?.currentStepId) {
      return;
    }

    resetViewport();
  }, [resetViewport, snapshot?.currentStepId]);

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
      }, 240);
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
  const resolvedSubmissionError = submissionError;
  const adaptiveSignal = buildAdaptiveSignal(quiz, snapshot?.answers ?? [], resultProfile);
  const leadStepReady =
    currentStep?.kind === "lead"
      ? isLeadStepReady(currentStep, resolvedLeadValues, resolvedConsent)
      : false;
  const isLeadFieldCurrentlyFocused = currentStep?.kind === "lead" && isLeadFieldFocused;
  const isPhoneViewport = !embedded && isMobileViewport;
  const sourceLabel = entrySource.replace(/-/g, " ");
  const visibleProgress = Math.max(progress.percent, 6);
  const progressIndicatorLeft = Math.min(Math.max(visibleProgress, 6), 97);
  const mobileRailActive =
    isPhoneViewport &&
    ["welcome", "message", "result", "lead", "offer"].includes(currentStep?.kind ?? "") &&
    !(currentStep?.kind === "lead" && (isLeadFieldCurrentlyFocused || isMobileKeyboardOpen));

  const stageMotion = reducedMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : isPhoneViewport
      ? {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0 },
        }
    : {
        initial: { opacity: 0, x: 58, y: 16, scale: 0.976, filter: "blur(16px)" },
        animate: { opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)" },
        exit: { opacity: 0, x: -46, y: -12, scale: 0.986, filter: "blur(14px)" },
      };
  const stageTransition = reducedMotion
    ? { duration: 0 }
    : isPhoneViewport
      ? { duration: 0.2, ease: MOBILE_STEP_EASE }
      : { duration: 0.58, ease: DESKTOP_STAGE_EASE };
  const shellTransition = reducedMotion
    ? { duration: 0 }
    : isPhoneViewport
      ? { duration: 0.22, ease: MOBILE_STEP_EASE }
      : { duration: 0.55, ease: MOBILE_STEP_EASE };
  const progressTransition = reducedMotion
    ? { duration: 0 }
    : isPhoneViewport
      ? { type: "tween" as const, duration: 0.18, ease: MOBILE_PROGRESS_EASE }
      : { type: "spring" as const, stiffness: 170, damping: 24 };
  const surfacePaddingClass = mobileRailActive ? "pb-[6.75rem] sm:pb-7" : "pb-6 sm:pb-7";

  const handleLeadFieldFocusChange = useCallback((focused: boolean) => {
    setIsLeadFieldFocused(focused);
  }, []);

  if (isBooting || !snapshot || !currentStep) {
    return (
      <div
        data-quiz-shell="monochrome"
        className={cn(
          embedded
            ? `relative isolate min-h-full w-full max-w-full overflow-x-clip overscroll-x-none touch-pan-y ${LIGHT_SHELL}`
            : `relative isolate min-h-screen w-full max-w-full overflow-x-clip overscroll-x-none touch-pan-y ${LIGHT_SHELL}`,
          className,
        )}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(17,17,17,0.08),transparent_28%),linear-gradient(180deg,#faf8f2_0%,#ebe5da_100%)]" />
        </div>
        <div
          className={cn(
            "mx-auto flex max-w-[1160px] items-start justify-center px-4 py-6 sm:px-6",
            embedded ? "min-h-full" : "min-h-screen sm:items-center",
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
        embedded
          ? `relative isolate min-h-full w-full max-w-full overflow-x-clip overscroll-x-none touch-pan-y ${LIGHT_SHELL}`
          : `relative isolate min-h-screen w-full max-w-full overflow-x-clip overscroll-x-none touch-pan-y ${LIGHT_SHELL}`,
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.94),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(17,17,17,0.08),transparent_30%),linear-gradient(180deg,#faf8f2_0%,#ebe5da_100%)]" />
        <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(17,17,17,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(17,17,17,0.045)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]" />
        {isPhoneViewport ? (
          <div
            aria-hidden="true"
            className="absolute inset-x-6 top-5 h-28 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.74),rgba(255,255,255,0))] blur-2xl"
          />
        ) : (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-12 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.74),rgba(255,255,255,0))]"
            animate={reducedMotion ? undefined : { scale: [1, 1.06, 1], opacity: [0.65, 0.9, 0.65] }}
            transition={reducedMotion ? undefined : { duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>
      <div
        className={cn(
          "relative mx-auto flex w-full max-w-[1160px] items-start justify-center px-4 pb-6 pt-4 sm:px-6 sm:py-6 lg:px-10",
          embedded ? "min-h-full" : "min-h-screen sm:items-center",
        )}
      >
        <div className="w-full max-w-[446px]">
          <motion.div
            initial={reducedMotion ? undefined : isPhoneViewport ? { opacity: 0, y: 10 } : { opacity: 0, y: 18, scale: 0.988 }}
            animate={reducedMotion ? undefined : isPhoneViewport ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            transition={shellTransition}
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
                  transition={progressTransition}
                />
                <motion.div
                  className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-white bg-[#171614] shadow-[0_0_0_4px_rgba(23,22,20,0.12)]"
                  initial={false}
                  animate={{ left: `calc(${progressIndicatorLeft}% - 6px)` }}
                  transition={progressTransition}
                />
              </div>
              </div>

              <div
                className={cn(
                  "relative px-5 pt-5 sm:min-h-[620px] sm:px-6 sm:pt-7",
                  surfacePaddingClass,
                )}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${currentStep.id}:${snapshot.trail.length}`}
                    initial={stageMotion.initial}
                    animate={stageMotion.animate}
                    exit={stageMotion.exit}
                    transition={stageTransition}
                >
                  <StepSurface
                    currentStep={currentStep}
                    quiz={quiz}
                    resultProfile={resultProfile}
                    adaptiveSignal={adaptiveSignal}
                    selectedOptions={resolvedSelectedOptions}
                    pendingOptionId={pendingOptionId}
                    leadValues={resolvedLeadValues}
                    consent={resolvedConsent}
                    submissionError={resolvedSubmissionError}
                    reducedMotion={Boolean(reducedMotion)}
                    isPhoneViewport={isPhoneViewport}
                    mobileRailActive={mobileRailActive}
                    leadStepReady={leadStepReady}
                    onAdvance={handleAdvance}
                    onSingleSelect={handleSingleSelect}
                    onToggleOption={handleToggleOption}
                    onMultiSelectContinue={handleMultiSelectContinue}
                    onLeadFieldChange={handleLeadFieldChange}
                    onConsentChange={handleConsentChange}
                    onLeadFieldFocusChange={handleLeadFieldFocusChange}
                    onLeadSubmit={handleLeadSubmit}
                    onOfferClick={handleOfferClick}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
      {mobileRailActive && currentStep ? (
        <>
          {currentStep.kind === "welcome" ? (
            <MobileActionRail
              kind="button"
              label={currentStep.primaryLabel}
              caption={currentStep.secondaryLabel ?? currentStep.kicker}
              onClick={handleAdvance}
            />
          ) : null}
          {currentStep.kind === "message" ? (
            <MobileActionRail
              kind="button"
              label={currentStep.primaryLabel}
              caption={
                adaptiveSignal.recentSelection
                  ? `current read: ${adaptiveSignal.leadingBadge}`
                  : currentStep.secondaryLabel ?? "keep the momentum"
              }
              onClick={handleAdvance}
            />
          ) : null}
          {currentStep.kind === "result" ? (
            <MobileActionRail
              kind="button"
              label={currentStep.primaryLabel}
              caption={`current read: ${resultProfile.badge}`}
              onClick={handleAdvance}
            />
          ) : null}
          {currentStep.kind === "lead" ? (
            <MobileActionRail
              kind="button"
              label={currentStep.submitLabel}
              caption={
                leadStepReady
                  ? "send the result while this is fresh"
                  : "enter your details to continue"
              }
              disabled={!leadStepReady}
              onClick={handleLeadSubmit}
            />
          ) : null}
          {currentStep.kind === "offer" ? (
            <MobileActionRail
              kind="link"
              label={currentStep.ctaLabel}
              caption={currentStep.note ?? resultProfile.badge}
              href={currentStep.ctaUrl}
              onClick={handleOfferClick}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function StepSurface({
  currentStep,
  quiz,
  resultProfile,
  adaptiveSignal,
  selectedOptions,
  pendingOptionId,
  leadValues,
  consent,
  submissionError,
  reducedMotion,
  isPhoneViewport,
  mobileRailActive,
  leadStepReady,
  onAdvance,
  onSingleSelect,
  onToggleOption,
  onMultiSelectContinue,
  onLeadFieldChange,
  onConsentChange,
  onLeadFieldFocusChange,
  onLeadSubmit,
  onOfferClick,
}: {
  currentStep: QuizStep;
  quiz: QuizDefinition;
  resultProfile: QuizResultProfile;
  adaptiveSignal: AdaptiveSignalSummary;
  selectedOptions: string[];
  pendingOptionId: string | null;
  leadValues: Record<string, string>;
  consent: boolean;
  submissionError: string | null;
  reducedMotion: boolean;
  isPhoneViewport: boolean;
  mobileRailActive: boolean;
  leadStepReady: boolean;
  onAdvance: () => void;
  onSingleSelect: (optionId: string) => void;
  onToggleOption: (optionId: string) => void;
  onMultiSelectContinue: () => void;
  onLeadFieldChange: (fieldId: string, value: string) => void;
  onConsentChange: (checked: boolean) => void;
  onLeadFieldFocusChange: (focused: boolean) => void;
  onLeadSubmit: () => void;
  onOfferClick: () => void;
}) {
  return (
    <div className="space-y-6">
      {currentStep.kind === "welcome" ? (
        <WelcomeStep
          step={currentStep}
          reducedMotion={reducedMotion}
          isPhoneViewport={isPhoneViewport}
          mobileRailActive={mobileRailActive}
          onAdvance={onAdvance}
        />
      ) : null}

      {currentStep.kind === "question" ? (
        <QuestionStep
          step={currentStep}
          pendingOptionId={pendingOptionId}
          reducedMotion={reducedMotion}
          isPhoneViewport={isPhoneViewport}
          selectedOptions={selectedOptions}
          onSingleSelect={onSingleSelect}
          onToggleOption={onToggleOption}
          onContinue={onMultiSelectContinue}
        />
      ) : null}

      {currentStep.kind === "message" ? (
        <MessageStep
          step={currentStep}
          adaptiveSignal={adaptiveSignal}
          reducedMotion={reducedMotion}
          isPhoneViewport={isPhoneViewport}
          mobileRailActive={mobileRailActive}
          onAdvance={onAdvance}
        />
      ) : null}

      {currentStep.kind === "analysis" ? (
        <AnalysisStep
          key={`${currentStep.id}:${isPhoneViewport ? "phone" : "desktop"}:${resultProfile.id}`}
          step={currentStep}
          adaptiveSignal={adaptiveSignal}
          resultProfile={resultProfile}
          onAdvance={onAdvance}
          reducedMotion={reducedMotion}
          isPhoneViewport={isPhoneViewport}
        />
      ) : null}

      {currentStep.kind === "result" ? (
        <ResultStep
          step={currentStep}
          resultProfile={resultProfile}
          adaptiveSignal={adaptiveSignal}
          reducedMotion={reducedMotion}
          isPhoneViewport={isPhoneViewport}
          mobileRailActive={mobileRailActive}
          onAdvance={onAdvance}
        />
      ) : null}

      {currentStep.kind === "lead" ? (
        <LeadStep
          step={currentStep}
          resultProfile={resultProfile}
          adaptiveSignal={adaptiveSignal}
          leadValues={leadValues}
          consent={consent}
          isReady={leadStepReady}
          isPhoneViewport={isPhoneViewport}
          mobileRailActive={mobileRailActive}
          onLeadFieldChange={onLeadFieldChange}
          onConsentChange={onConsentChange}
          onLeadFieldFocusChange={onLeadFieldFocusChange}
          onLeadSubmit={onLeadSubmit}
        />
      ) : null}

      {currentStep.kind === "offer" ? (
        <OfferStep
          step={currentStep}
          resultProfile={resultProfile}
          isPhoneViewport={isPhoneViewport}
          mobileRailActive={mobileRailActive}
          onOfferClick={onOfferClick}
        />
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
  isPhoneViewport,
  mobileRailActive,
  onAdvance,
}: {
  step: Extract<QuizStep, { kind: "welcome" }>;
  reducedMotion: boolean;
  isPhoneViewport: boolean;
  mobileRailActive: boolean;
  onAdvance: () => void;
}) {
  const cardEntranceAllowed = !reducedMotion && !isPhoneViewport;

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        {step.kicker ? <p className={STEP_LABEL}>{step.kicker}</p> : null}
        <h1 className={STEP_TITLE}>{step.title}</h1>
        {step.body ? <p className={cn(STEP_BODY, "max-w-[32rem]")}>{step.body}</p> : null}
      </div>

      <div className="grid gap-2.5 sm:gap-3">
        {step.trustPoints.map((point, index) => (
          <motion.div
            key={point}
            initial={cardEntranceAllowed ? { opacity: 0, y: 16 } : false}
            animate={cardEntranceAllowed ? { opacity: 1, y: 0 } : undefined}
            transition={cardEntranceAllowed ? { duration: 0.32, delay: 0.08 * index } : undefined}
            className={cn(SECONDARY_PANEL, "flex items-center gap-3 px-4 py-3")}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.08] bg-[#171614] text-white">
              <Check className="h-4 w-4" strokeWidth={1.2} />
            </div>
            <p className="text-sm leading-5 text-[#3f3a33]">{point}</p>
          </motion.div>
        ))}
      </div>

      <div className={cn(PREMIUM_PANEL, "space-y-2 px-4 py-4 sm:px-5")}>
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/48">what happens next</p>
        <p className="text-base font-medium leading-6 tracking-[-0.03em] text-white">
          {step.secondaryLabel ?? "quick questions first, then a sharp result with a clear next move."}
        </p>
      </div>

      <motion.button
        type="button"
        onClick={onAdvance}
        whileTap={reducedMotion ? undefined : { scale: isPhoneViewport ? 0.995 : 0.992 }}
        whileHover={!reducedMotion && !isPhoneViewport ? { y: -2 } : undefined}
        className={cn(
          "group relative w-full items-center justify-between overflow-hidden rounded-[1.75rem] border border-[#171614] bg-[#171614] px-5 py-5 text-left text-white shadow-[0_24px_50px_rgba(23,22,20,0.16)]",
          inlineActionVisibilityClass(mobileRailActive),
        )}
      >
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-[linear-gradient(90deg,rgba(255,255,255,0.18),rgba(255,255,255,0))]"
          animate={!reducedMotion && !isPhoneViewport ? { x: ["-100%", "220%"] } : undefined}
          transition={!reducedMotion && !isPhoneViewport ? { duration: 1.8, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" } : undefined}
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
  isPhoneViewport,
  onSingleSelect,
  onToggleOption,
  onContinue,
}: {
  step: Extract<QuizStep, { kind: "question" }>;
  selectedOptions: string[];
  pendingOptionId: string | null;
  reducedMotion: boolean;
  isPhoneViewport: boolean;
  onSingleSelect: (optionId: string) => void;
  onToggleOption: (optionId: string) => void;
  onContinue: () => void;
}) {
  const interactionLocked = step.selection === "single" && pendingOptionId !== null;
  const optionEntranceAllowed = !reducedMotion && !isPhoneViewport;

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        {step.kicker ? <p className={STEP_LABEL}>{step.kicker}</p> : null}
        <h1 className={STEP_TITLE}>{step.title}</h1>
        {step.body ? <p className={STEP_BODY}>{step.body}</p> : null}
      </div>

      {pendingOptionId ? (
        <motion.div
          initial={optionEntranceAllowed ? { opacity: 0, y: 8 } : false}
          animate={optionEntranceAllowed ? { opacity: 1, y: 0 } : undefined}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3 py-2 text-[11px] uppercase tracking-[0.28em] text-[#61594f]"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={1.6} />
          locked in
        </motion.div>
      ) : null}

      <div className="grid gap-2.5 sm:gap-3">
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
              initial={optionEntranceAllowed ? { opacity: 0, y: 10 } : false}
              animate={optionEntranceAllowed ? { opacity: 1, y: 0 } : undefined}
              transition={optionEntranceAllowed ? { duration: 0.18, ease: [0.22, 1, 0.36, 1] } : undefined}
              whileTap={interactionLocked || reducedMotion ? undefined : { scale: isPhoneViewport ? 0.995 : 0.988 }}
              whileHover={interactionLocked || isPhoneViewport ? undefined : { y: -2 }}
              className={cn(
                "group relative w-full overflow-hidden rounded-[1.55rem] border px-4 py-3.5 text-left transition duration-200 sm:px-5 sm:py-4",
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
                    <p className={cn("text-base font-medium leading-6 tracking-[-0.02em] sm:text-lg", isSelected ? "text-white" : "text-[#171410]")}>
                      {option.label}
                    </p>
                    <span className={cn("min-w-[2.25rem] text-right text-[10px] uppercase tracking-[0.28em] tabular-nums sm:text-xs", isSelected ? "text-white/54" : "text-[#8c8377]")}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  {option.description ? (
                    <p className={cn("text-[13px] leading-5 sm:text-sm sm:leading-6", isSelected ? "text-white/74" : "text-[#5d564d]")}>
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
          {pendingOptionId ? "moving to the next step" : "tap once to lock and continue"}
        </p>
      )}
    </div>
  );
}

function MessageStep({
  step,
  adaptiveSignal,
  reducedMotion,
  isPhoneViewport,
  mobileRailActive,
  onAdvance,
}: {
  step: Extract<QuizStep, { kind: "message" }>;
  adaptiveSignal: AdaptiveSignalSummary;
  reducedMotion: boolean;
  isPhoneViewport: boolean;
  mobileRailActive: boolean;
  onAdvance: () => void;
}) {
  const primaryHighlight = step.highlights?.[0] ?? null;
  const supportingBullets = step.bullets?.slice(0, 2) ?? [];
  const extraBullets = step.bullets?.slice(2) ?? [];
  const cardEntranceAllowed = !reducedMotion && !isPhoneViewport;

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        {step.kicker ? <p className={STEP_LABEL}>{step.kicker}</p> : null}
        <h1 className={STEP_TITLE}>{step.title}</h1>
        {step.body ? <p className={STEP_BODY}>{step.body}</p> : null}
      </div>

      <AdaptiveCueCard adaptiveSignal={adaptiveSignal} eyebrow="signal taking shape" />

      {primaryHighlight ? (
        <motion.div
          initial={cardEntranceAllowed ? { opacity: 0, y: 18 } : false}
          animate={cardEntranceAllowed ? { opacity: 1, y: 0 } : undefined}
          transition={cardEntranceAllowed ? { duration: 0.34 } : undefined}
          className={cn(PREMIUM_PANEL, "space-y-3 px-4 py-4 sm:px-5")}
        >
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/44">{primaryHighlight.label}</p>
          <p className="text-lg font-medium leading-7 tracking-[-0.03em] text-white">
            {primaryHighlight.value}
          </p>
        </motion.div>
      ) : null}

      {supportingBullets.length > 0 ? (
        <div className="grid gap-2">
          {supportingBullets.map((bullet, index) => (
            <motion.div
              key={bullet}
              initial={cardEntranceAllowed ? { opacity: 0, y: 8 } : false}
              animate={cardEntranceAllowed ? { opacity: 1, y: 0 } : undefined}
              transition={cardEntranceAllowed ? { duration: 0.24, delay: 0.05 * index } : undefined}
              className={cn(SECONDARY_PANEL, "flex gap-3 px-4 py-3")}
            >
              <div className="mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full border border-black/[0.08] bg-white">
                <Check className="h-3.5 w-3.5 text-[#171614]" strokeWidth={1.2} />
              </div>
              <p className="text-sm leading-5 text-[#514a43]">{bullet}</p>
            </motion.div>
          ))}
        </div>
      ) : null}

      {extraBullets.length > 0 ? (
        <ExpandablePanel eyebrow="more context" title="open the full insight">
          <div className="grid gap-3">
            {extraBullets.map((bullet) => (
              <div key={bullet} className="flex gap-3">
                <div className="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-[#171614]" />
                <p className="text-sm leading-6 text-[#565048]">{bullet}</p>
              </div>
            ))}
          </div>
        </ExpandablePanel>
      ) : null}

      <Button
        onClick={onAdvance}
        className={cn(PRIMARY_BUTTON, inlineActionVisibilityClass(mobileRailActive))}
      >
        {step.primaryLabel}
      </Button>

      {step.secondaryLabel ? (
        <p className="hidden text-center text-xs uppercase tracking-[0.28em] text-[#8d857b] sm:block">{step.secondaryLabel}</p>
      ) : null}
    </div>
  );
}

function AnalysisStep({
  step,
  adaptiveSignal,
  resultProfile,
  onAdvance,
  reducedMotion,
  isPhoneViewport,
}: {
  step: Extract<QuizStep, { kind: "analysis" }>;
  adaptiveSignal: AdaptiveSignalSummary;
  resultProfile: QuizResultProfile;
  onAdvance: () => void;
  reducedMotion: boolean;
  isPhoneViewport: boolean;
}) {
  const stageDefinitions = useMemo(
    () =>
      isPhoneViewport
        ? buildMobileAnalysisStages(adaptiveSignal, resultProfile)
        : step.stages.map((stage) => ({
            id: stage.id,
            label: stage.label,
            description: stage.description,
            evidenceLabel: "stage",
            evidenceValue: stage.label,
          })),
    [adaptiveSignal, isPhoneViewport, resultProfile, step.stages],
  );
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [completedStageIds, setCompletedStageIds] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const stageCount = stageDefinitions.length;
  const activeStage = stageDefinitions[Math.min(activeStageIndex, stageCount - 1)];
  const stageDurations = useMemo(() => {
    if (isPhoneViewport) {
      return stageDefinitions.map((_, index) =>
        reducedMotion
          ? 120
          : MOBILE_ANALYSIS_STAGE_DURATIONS[index] ?? MOBILE_ANALYSIS_STAGE_DURATIONS.at(-1) ?? 1100,
      );
    }

    const originalTotalDuration = step.stages.reduce((total, stage) => total + stage.durationMs, 0) || 1;
    const compressedTotalDuration = reducedMotion
      ? stageCount * 60
      : Math.min(2200, Math.max(1600, stageCount * 320));

    return step.stages.map((stage) =>
      Math.max(
        reducedMotion ? 60 : 140,
        Math.round((stage.durationMs / originalTotalDuration) * compressedTotalDuration),
      ),
    );
  }, [isPhoneViewport, reducedMotion, stageCount, stageDefinitions, step.stages]);
  const cumulativeDurations = useMemo(() => {
    const values: number[] = [];
    let durationCursor = 0;
    stageDurations.forEach((durationMs) => {
      durationCursor += durationMs;
      values.push(durationCursor);
    });
    return values;
  }, [stageDurations]);
  const totalDurationMs = cumulativeDurations.at(-1) ?? 1;
  const activeStageStartMs = activeStageIndex === 0 ? 0 : (cumulativeDurations[activeStageIndex - 1] ?? 0);
  const activeStageEndMs = cumulativeDurations[activeStageIndex] ?? totalDurationMs;
  const activeStageDurationMs = stageDurations[activeStageIndex] ?? 0;
  const progressStartPercent = (activeStageStartMs / totalDurationMs) * 100;
  const progressEndPercent = isFinished ? 100 : (activeStageEndMs / totalDurationMs) * 100;
  const stageProgressLabel = isFinished ? "complete" : isPhoneViewport ? "resolving" : "running";
  const mobileRecentSignal = adaptiveSignal.recentSelections[0]?.optionLabel ?? "recent answer captured";
  const mobileSignalSummary = adaptiveSignal.recentSelections[1]?.optionLabel ?? resultProfile.badge;

  useEffect(() => {
    let stageTimer: ReturnType<typeof setTimeout> | null = null;
    let finishTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const runStage = (index: number) => {
      if (cancelled) {
        return;
      }

      if (index >= stageDefinitions.length) {
        setIsFinished(true);
        if (step.autoAdvance) {
          finishTimer = setTimeout(
            () => onAdvance(),
            reducedMotion ? 0 : isPhoneViewport ? MOBILE_ANALYSIS_COMPLETION_DELAY_MS : 140,
          );
        }
        return;
      }

      setActiveStageIndex(index);
      const durationMs = stageDurations[index] ?? 0;

      stageTimer = setTimeout(() => {
        setCompletedStageIds((current) =>
          current.includes(stageDefinitions[index].id) ? current : [...current, stageDefinitions[index].id],
        );
        runStage(index + 1);
      }, durationMs);
    };

    runStage(0);

    return () => {
      cancelled = true;
      if (stageTimer) {
        clearTimeout(stageTimer);
      }
      if (finishTimer) {
        clearTimeout(finishTimer);
      }
    };
  }, [isPhoneViewport, onAdvance, reducedMotion, stageDefinitions, stageDurations, step.autoAdvance]);

  if (isPhoneViewport) {
    return (
      <div data-mobile-analysis="true" className="space-y-4">
        <div className={cn(LIGHT_INSET, "overflow-hidden p-3.5")}>
          <div className="rounded-[1.45rem] border border-black/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,243,238,0.96))] p-4 shadow-[0_18px_44px_rgba(23,22,20,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.32em] text-[#7f776d]">
                  {step.kicker ?? "profile analysis"}
                </p>
                <h1 className="mt-2 text-[1.4rem] font-semibold leading-[1.02] tracking-[-0.05em] text-[#15130f]">
                  {step.title}
                </h1>
              </div>
              <div className="rounded-full border border-black/[0.08] bg-white/86 px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] text-[#6d665d]">
                {isFinished ? "match locked" : "scan live"}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-[#7f776d]">
              <span>phase {Math.min(activeStageIndex + 1, stageCount)} of {stageCount}</span>
              <span>{Math.round(progressEndPercent)}%</span>
            </div>

            <div className="mt-2.5 h-[5px] overflow-hidden rounded-full bg-black/[0.08]">
              <motion.div
                key={`mobile-analysis-progress-${isFinished ? "complete" : activeStage?.id ?? "analysis"}`}
                className="h-full rounded-full bg-[#171614]"
                initial={{ width: `${Math.max(progressStartPercent, 8)}%` }}
                animate={{ width: `${Math.max(progressEndPercent, 14)}%` }}
                transition={{
                  duration: isFinished ? 0.2 : reducedMotion ? 0 : activeStageDurationMs / 1000,
                  ease: "linear",
                }}
              />
            </div>

            <div className="mt-4 rounded-[1.2rem] border border-black/[0.07] bg-white/92 px-3.5 py-3.5" role="status" aria-live="polite" aria-atomic="true">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#827a70]">
                {isFinished ? "result confidence locked" : "active process"}
              </p>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStage?.id ?? "mobile-analysis-finished"}
                  initial={reducedMotion ? undefined : { opacity: 0, y: 6 }}
                  animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0 }}
                  transition={reducedMotion ? undefined : { duration: 0.18 }}
                  className="mt-2.5"
                >
                  <p className="text-[1.02rem] font-semibold leading-[1.12] tracking-[-0.03em] text-[#171410]">
                    {isFinished ? "report match finalized" : activeStage?.label ?? "finalizing your report"}
                  </p>
                  <p className="mt-1.5 text-[13px] leading-5 text-[#575149]">
                    {isFinished
                      ? `highest confidence match: ${resultProfile.badge.toLowerCase()}.`
                      : activeStage?.description ?? "finalizing your report"}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-3 grid gap-2">
              {stageDefinitions.map((stage, index) => {
                const isActive = index === activeStageIndex && !isFinished;
                const isComplete = completedStageIds.includes(stage.id) || isFinished;

                return (
                  <div
                    key={stage.id}
                    className={cn(
                      "flex items-center gap-3 rounded-[1rem] border px-3 py-2.5",
                      isActive
                        ? "border-[#171614] bg-white text-[#171410]"
                        : isComplete
                          ? "border-black/[0.08] bg-white text-[#171410]"
                          : "border-black/[0.06] bg-[#f7f5ef] text-[#60584f]",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-5 w-5 flex-none items-center justify-center rounded-full border",
                        isActive || isComplete ? "border-black/[0.08] bg-[#171614] text-white" : "border-black/[0.08] bg-white",
                      )}
                    >
                      {isComplete ? (
                        <Check className="h-3 w-3 text-white" strokeWidth={1.2} />
                      ) : isActive ? (
                        <Loader2 className="h-3 w-3 animate-spin text-white/80" strokeWidth={1.2} />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#171614]/22" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium leading-4 text-current">{stage.label}</p>
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#7f776d]">
                      {isComplete ? "locked" : isActive ? "live" : "queued"}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-[0.95rem] border border-black/[0.06] bg-white/88 px-3 py-2.5">
                <p className="text-[9px] uppercase tracking-[0.24em] text-[#867f75]">latest signal</p>
                <p className="mt-1 truncate text-[12px] font-medium leading-4 text-[#171410]">{mobileRecentSignal}</p>
              </div>
              <div className="rounded-[0.95rem] border border-black/[0.06] bg-white/88 px-3 py-2.5">
                <p className="text-[9px] uppercase tracking-[0.24em] text-[#867f75]">pattern lead</p>
                <p className="mt-1 truncate text-[12px] font-medium leading-4 text-[#171410]">{mobileSignalSummary}</p>
              </div>
            </div>

            {isFinished ? (
              <p className="mt-3 text-center text-[10px] uppercase tracking-[0.28em] text-[#867e73]">
                opening report...
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        {step.kicker ? <p className={STEP_LABEL}>{step.kicker}</p> : null}
        <h1 className={STEP_TITLE}>{step.title}</h1>
        {step.body ? <p className={STEP_BODY}>{step.body}</p> : null}
      </div>

      <div className={cn(LIGHT_INSET, "overflow-hidden p-4 sm:p-5")}>
        <div className="rounded-[1.55rem] border border-black/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,243,238,0.96))] p-4 shadow-[0_22px_60px_rgba(23,22,20,0.07)]">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-[#7f776d]">
            <span>analysis sweep</span>
            <span>{Math.round(progressEndPercent)}%</span>
          </div>

          <div className="mt-4 flex h-[58px] items-end gap-2 overflow-hidden rounded-[1.2rem] border border-black/[0.05] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(242,242,238,0.88))] px-3 py-3">
            {ANALYSIS_BAR_LAYOUT.map((barHeight, index) => (
              <motion.div
                key={`analysis-bar-${index}`}
                className="min-w-0 flex-1 rounded-full bg-[linear-gradient(180deg,rgba(23,22,20,0.18),rgba(23,22,20,0.88))]"
                style={{ height: `${18 + barHeight * 26}px`, transformOrigin: "50% 100%" }}
                animate={
                  reducedMotion
                    ? undefined
                    : {
                        scaleY: [0.76, 1, 0.84],
                        opacity: [0.42, 0.96, 0.52],
                      }
                }
                transition={
                  reducedMotion
                    ? undefined
                    : {
                        duration: 0.85 + index * 0.08,
                        delay: index * 0.05,
                        repeat: Infinity,
                        repeatType: "mirror",
                        ease: "easeInOut",
                      }
                }
              />
            ))}
          </div>

          <div className="mt-4" role="status" aria-live="polite" aria-atomic="true">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#81796f]">
                phase {Math.min(activeStageIndex + 1, stageCount)} of {stageCount}
              </p>
              <span className="rounded-full border border-black/[0.08] bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.28em] text-[#5f584f]">
                {stageProgressLabel}
              </span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStage?.id ?? "analysis-finished"}
                initial={reducedMotion ? undefined : { opacity: 0, y: 10 }}
                animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
                transition={reducedMotion ? undefined : { duration: 0.24 }}
                className="mt-3"
              >
                <p className="text-[1.2rem] font-semibold leading-[1.04] tracking-[-0.04em] text-[#171410]">
                  {isFinished ? "your report is locked in." : activeStage?.label ?? "finalizing your profile"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#575149]">
                  {isFinished
                    ? "we resolved the strongest pattern and staged the next move."
                    : activeStage?.description ?? "handoff to your result screen"}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-4 h-[5px] overflow-hidden rounded-full bg-black/[0.08]">
              <motion.div
                key={`overall-progress-${isFinished ? "complete" : activeStage?.id ?? "analysis"}`}
                className="h-full rounded-full bg-[#171614]"
                initial={{ width: `${Math.max(progressStartPercent, 5)}%` }}
                animate={{ width: `${Math.max(progressEndPercent, 10)}%` }}
                transition={{
                  duration: isFinished ? 0.24 : reducedMotion ? 0 : activeStageDurationMs / 1000,
                  ease: "linear",
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {stageDefinitions.map((stage, index) => {
            const isActive = index === activeStageIndex && !isFinished;
            const isComplete = completedStageIds.includes(stage.id) || isFinished;

            return (
              <div
                key={stage.id}
                className={cn(
                  "flex items-center gap-3 rounded-[1.2rem] border px-3 py-3",
                  isActive
                    ? "border-[#171614] bg-white text-[#171410]"
                    : isComplete
                      ? "border-black/[0.08] bg-white text-[#171410]"
                      : "border-black/[0.06] bg-[#f4f4f1] text-[#5c554d]",
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 flex-none items-center justify-center rounded-full border",
                    isActive || isComplete ? "border-black/[0.08] bg-[#171614] text-white" : "border-black/[0.08] bg-white",
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
                    <p className="text-sm font-medium tracking-[-0.01em] text-current">{stage.label}</p>
                    <span className="text-[10px] uppercase tracking-[0.26em] text-[#8a8175]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                </div>
              </div>
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
  adaptiveSignal,
  reducedMotion,
  isPhoneViewport,
  mobileRailActive,
  onAdvance,
}: {
  step: Extract<QuizStep, { kind: "result" }>;
  resultProfile: QuizResultProfile;
  adaptiveSignal: AdaptiveSignalSummary;
  reducedMotion: boolean;
  isPhoneViewport: boolean;
  mobileRailActive: boolean;
  onAdvance: () => void;
}) {
  const headlineCriteria = resultProfile.criteria.slice(0, 2);
  const headlineMetrics = resultProfile.metrics.slice(0, 2);
  const cardEntranceAllowed = !reducedMotion && !isPhoneViewport;

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        {step.kicker ? <p className={STEP_LABEL}>{step.kicker}</p> : null}
        <div className="inline-flex rounded-full border border-black/[0.08] bg-white/84 px-3 py-2 text-[11px] uppercase tracking-[0.3em] text-[#5b554d]">
          {resultProfile.badge}
        </div>
        <h1 className={STEP_TITLE}>{resultProfile.headline}</h1>
        <p className={STEP_BODY}>{resultProfile.summary}</p>
      </div>

      <motion.div
        initial={cardEntranceAllowed ? { opacity: 0, y: 16 } : false}
        animate={cardEntranceAllowed ? { opacity: 1, y: 0 } : undefined}
        transition={cardEntranceAllowed ? { duration: 0.35 } : undefined}
        className={cn(LIGHT_INSET, "p-5 sm:p-6")}
      >
        <p className="text-[11px] uppercase tracking-[0.3em] text-[#80786e]">current read</p>
        <p className="mt-3 text-lg font-medium leading-7 tracking-[-0.03em] text-[#171410]">
          {resultProfile.affirmation}
        </p>
        <p className="mt-3 text-sm leading-6 text-[#575149]">{resultProfile.mechanism}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {headlineMetrics.map((metric) => (
            <MetricChip key={metric.id} label={metric.label} value={metric.value} />
          ))}
        </div>
      </motion.div>

      <AdaptiveCueCard
        adaptiveSignal={adaptiveSignal}
        eyebrow="what pushed this result"
        showSelectionTrail
      />

      <div className="grid gap-2">
        {headlineCriteria.map((criterion, index) => (
          <motion.div
            key={criterion.id}
            initial={cardEntranceAllowed ? { opacity: 0, y: 8 } : false}
            animate={cardEntranceAllowed ? { opacity: 1, y: 0 } : undefined}
            transition={cardEntranceAllowed ? { duration: 0.24, delay: 0.05 * index } : undefined}
            className={cn(SECONDARY_PANEL, "px-4 py-3")}
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

      <ExpandablePanel eyebrow="full breakdown" title="open graph and supporting notes">
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#80786e]">{resultProfile.graphTitle}</p>
            <p className="text-sm leading-6 text-[#5a544c]">{resultProfile.graphCaption}</p>
          </div>
          <QuizResultGraph resultId={resultProfile.id} metrics={resultProfile.metrics} />
          <div className="grid gap-3">
            {resultProfile.criteria.map((criterion) => (
              <div key={criterion.id} className={cn(SECONDARY_PANEL, "px-4 py-4")}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium tracking-[-0.01em] text-[#171410]">{criterion.label}</p>
                  <span className="text-[11px] uppercase tracking-[0.28em] text-[#827a70]">
                    {emphasisLabel(criterion.emphasis)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#5c554d]">{criterion.detail}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={cn(SECONDARY_PANEL, "p-4")}>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#80786e]">what supports this read</p>
              <div className="mt-3 grid gap-2.5">
                {resultProfile.educationBullets.map((bullet) => (
                  <div key={bullet} className="flex gap-3">
                    <div className="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-[#171614]" />
                    <p className="text-sm leading-6 text-[#5b554d]">{bullet}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className={cn(PREMIUM_PANEL, "p-4")}>
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/46">keep in mind</p>
              <div className="mt-3 flex flex-wrap gap-2">
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
        </div>
      </ExpandablePanel>

      <Button
        onClick={onAdvance}
        className={cn(PRIMARY_BUTTON, inlineActionVisibilityClass(mobileRailActive))}
      >
        {step.primaryLabel}
      </Button>

      <p className="text-center text-xs leading-6 text-[#81796e]">{step.disclaimer}</p>
    </div>
  );
}

function LeadStep({
  step,
  resultProfile,
  adaptiveSignal,
  leadValues,
  consent,
  isReady,
  isPhoneViewport,
  mobileRailActive,
  onLeadFieldChange,
  onConsentChange,
  onLeadFieldFocusChange,
  onLeadSubmit,
}: {
  step: Extract<QuizStep, { kind: "lead" }>;
  resultProfile: QuizResultProfile;
  adaptiveSignal: AdaptiveSignalSummary;
  leadValues: Record<string, string>;
  consent: boolean;
  isReady: boolean;
  isPhoneViewport: boolean;
  mobileRailActive: boolean;
  onLeadFieldChange: (fieldId: string, value: string) => void;
  onConsentChange: (checked: boolean) => void;
  onLeadFieldFocusChange: (focused: boolean) => void;
  onLeadSubmit: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-4">
        {step.kicker ? <p className={STEP_LABEL}>{step.kicker}</p> : null}
        <h1 className={STEP_TITLE}>{step.title}</h1>
        {step.body ? <p className={STEP_BODY}>{step.body}</p> : null}
      </div>

      <AdaptiveCueCard
        adaptiveSignal={adaptiveSignal}
        eyebrow="what you're sending"
        customLead={`sending ${resultProfile.badge}`}
      />

      <LeadFormCard
        step={step}
        leadValues={leadValues}
        consent={consent}
        onLeadFieldChange={onLeadFieldChange}
        onConsentChange={onConsentChange}
        onLeadFieldFocusChange={onLeadFieldFocusChange}
      />

      <Button
        disabled={!isReady}
        onClick={onLeadSubmit}
        className={cn(PRIMARY_BUTTON, inlineActionVisibilityClass(mobileRailActive))}
      >
        {step.submitLabel}
      </Button>

      {isPhoneViewport && !mobileRailActive ? (
        <p className="text-center text-[10px] uppercase tracking-[0.28em] text-[#877f74]">
          finish the form, then send the report from here
        </p>
      ) : null}

      <p className="text-sm leading-6 text-[#7e766b]">{step.disclaimer}</p>
    </div>
  );
}

function OfferStep({
  step,
  resultProfile,
  isPhoneViewport,
  mobileRailActive,
  onOfferClick,
}: {
  step: Extract<QuizStep, { kind: "offer" }>;
  resultProfile: QuizResultProfile;
  isPhoneViewport: boolean;
  mobileRailActive: boolean;
  onOfferClick: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-4">
        {step.kicker ? <p className={STEP_LABEL}>{step.kicker}</p> : null}
        <h1 className={STEP_TITLE}>{step.title}</h1>
        {step.body ? <p className={STEP_BODY}>{step.body}</p> : null}
      </div>

      <div className={cn(LIGHT_INSET, "space-y-4 p-5 sm:p-6")}>
        <div className="flex flex-wrap gap-2">
          <SignalPill>{resultProfile.badge}</SignalPill>
          {step.note ? <SignalPill tone="soft">{step.note}</SignalPill> : null}
        </div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-[#80786e]">why this fits</p>
        <p className="mt-3 text-lg font-medium leading-7 tracking-[-0.03em] text-[#171410]">
          {resultProfile.offerBridge}
        </p>

        <div className="grid gap-2">
          {step.bullets.map((bullet) => (
            <div key={bullet} className={cn(SECONDARY_PANEL, "flex gap-3 px-4 py-3")}>
              <div className="mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full border border-black/[0.08] bg-[#171614]">
                <Check className="h-3.5 w-3.5 text-white" strokeWidth={1.2} />
              </div>
              <p className="text-sm leading-5 text-[#554f47]">{bullet}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={mobileRailActive ? "hidden sm:block" : ""}>
        <Button asChild className={PRIMARY_BUTTON}>
          <a href={step.ctaUrl} onClick={onOfferClick} rel="noopener noreferrer" target="_blank">
            {step.ctaLabel}
          </a>
        </Button>
      </div>

      {step.note ? (
        <p className={cn("text-center text-xs uppercase tracking-[0.28em] text-[#857d73]", mobileRailActive ? "hidden sm:block" : "")}>{step.note}</p>
      ) : null}
      {step.guarantee ? (
        <p className={cn("text-center text-sm leading-6 text-[#6b645b]", isPhoneViewport ? "pb-1" : "")}>{step.guarantee}</p>
      ) : null}
    </div>
  );
}

function MobileActionRail({
  kind,
  label,
  caption,
  disabled = false,
  href,
  onClick,
}: {
  kind: "button" | "link";
  label: string;
  caption?: string;
  disabled?: boolean;
  href?: string;
  onClick: () => void;
}) {
  return (
    <div data-mobile-dock="true" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[env(safe-area-inset-bottom)] sm:hidden">
      <div className="pointer-events-auto mx-auto w-full max-w-[446px] rounded-t-[1.35rem] border-x border-t border-black/[0.08] bg-[linear-gradient(180deg,rgba(250,247,240,0.98),rgba(244,240,232,0.98))] px-4 pb-3 pt-3 shadow-[0_-2px_18px_rgba(23,22,20,0.08)]">
        {caption ? (
          <p className="truncate px-1 pb-2 text-[10px] uppercase tracking-[0.24em] text-[#6f675d]">
            {caption}
          </p>
        ) : null}

        {kind === "button" ? (
          <Button
            disabled={disabled}
            onClick={onClick}
            className={cn(PRIMARY_BUTTON, "h-12 justify-between rounded-[1rem] px-4 shadow-[0_8px_18px_rgba(23,22,20,0.08)]")}
          >
            <span className="text-left">{label}</span>
            <ArrowRight className="h-4 w-4" strokeWidth={1.3} />
          </Button>
        ) : (
          <Button asChild className={cn(PRIMARY_BUTTON, "h-12 justify-between rounded-[1rem] px-4 shadow-[0_8px_18px_rgba(23,22,20,0.08)]")}>
            <a href={href} onClick={onClick} rel="noopener noreferrer" target="_blank">
              <span className="text-left">{label}</span>
              <ArrowRight className="h-4 w-4" strokeWidth={1.3} />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

function AdaptiveCueCard({
  adaptiveSignal,
  eyebrow,
  showSelectionTrail = false,
  customLead,
}: {
  adaptiveSignal: AdaptiveSignalSummary;
  eyebrow: string;
  showSelectionTrail?: boolean;
  customLead?: string;
}) {
  return (
    <div className={cn(SECONDARY_PANEL, "space-y-3 px-4 py-4")}>
      <p className="text-[11px] uppercase tracking-[0.28em] text-[#7c746a]">{eyebrow}</p>
      <div className="flex flex-wrap gap-2">
        <SignalPill>{customLead ?? adaptiveSignal.leadingBadge}</SignalPill>
        {adaptiveSignal.recentSelection ? (
          <SignalPill tone="soft">{adaptiveSignal.recentSelection.optionLabel}</SignalPill>
        ) : null}
      </div>

      {showSelectionTrail && adaptiveSignal.recentSelections.length > 0 ? (
        <div className="grid gap-2">
          {adaptiveSignal.recentSelections.map((selection) => (
            <div
              key={`${selection.stepId}-${selection.optionLabel}`}
              className="rounded-[1.15rem] border border-black/[0.06] bg-white/70 px-3 py-3"
            >
              <p className="text-[10px] uppercase tracking-[0.26em] text-[#888074]">{selection.stepTitle}</p>
              <p className="mt-2 text-sm leading-6 text-[#453f38]">{selection.optionLabel}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LeadFormCard({
  step,
  leadValues,
  consent,
  onLeadFieldChange,
  onConsentChange,
  onLeadFieldFocusChange,
}: {
  step: Extract<QuizStep, { kind: "lead" }>;
  leadValues: Record<string, string>;
  consent: boolean;
  onLeadFieldChange: (fieldId: string, value: string) => void;
  onConsentChange: (checked: boolean) => void;
  onLeadFieldFocusChange: (focused: boolean) => void;
}) {
  const formRef = useRef<HTMLDivElement | null>(null);

  const handleBlurCapture = () => {
    requestAnimationFrame(() => {
      const activeElement = document.activeElement;
      const stillInside =
        activeElement instanceof HTMLElement && formRef.current?.contains(activeElement);
      onLeadFieldFocusChange(Boolean(stillInside));
    });
  };

  return (
    <div
      ref={formRef}
      onFocusCapture={() => onLeadFieldFocusChange(true)}
      onBlurCapture={handleBlurCapture}
      className={cn(LIGHT_INSET, "space-y-4 p-4 sm:p-5")}
    >
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
  );
}

function ExpandablePanel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <details className={cn(LIGHT_INSET, "group p-4 sm:p-5")}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#7b746a]">{eyebrow}</p>
          <p className="mt-1 text-sm font-medium tracking-[-0.01em] text-[#171410]">{title}</p>
        </div>
        <ChevronDown className="h-4 w-4 text-[#6e665c] transition group-open:rotate-180" strokeWidth={1.6} />
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function SignalPill({
  children,
  tone = "dark",
}: {
  children: string;
  tone?: "dark" | "soft";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-2 text-[11px] uppercase tracking-[0.24em]",
        tone === "dark"
          ? "border border-[#171614] bg-[#171614] text-white"
          : "border border-black/[0.08] bg-white text-[#5b544c]",
      )}
    >
      {children}
    </span>
  );
}

function MetricChip({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[1.2rem] border border-black/[0.06] bg-[#f7f5ef] px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.26em] text-[#8a8278]">{label}</p>
      <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#171410]">
        {value}
        <span className="ml-1 text-xs font-medium text-[#847c72]">/100</span>
      </p>
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
