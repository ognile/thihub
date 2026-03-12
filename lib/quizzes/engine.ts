import type { QuizDefinition, QuizQuestionOption, QuizResultProfile, QuizStep } from "./schema";

export interface QuizAnswerRecord {
  stepId: string;
  optionIds: string[];
  answeredAt: string;
}

export interface QuizLeadSubmission {
  values: Record<string, string>;
  consent: boolean;
  submittedAt: string;
}

export interface QuizSessionSnapshot {
  sessionToken: string;
  currentStepId: string;
  trail: string[];
  answers: QuizAnswerRecord[];
  resultId: string | null;
  leadSubmission: QuizLeadSubmission | null;
  completed: boolean;
  startedAt: string;
  updatedAt: string;
}

export interface QuizAdvanceInput {
  stepId: string;
  optionIds?: string[];
  leadValues?: Record<string, string>;
  consent?: boolean;
}

export function getFirstStep(definition: QuizDefinition): QuizStep {
  return definition.steps[0];
}

export function getStepById(definition: QuizDefinition, stepId: string): QuizStep {
  const step = definition.steps.find((candidate) => candidate.id === stepId);
  if (!step) {
    throw new Error(`unknown quiz step: ${stepId}`);
  }
  return step;
}

function getSequentialNextStepId(definition: QuizDefinition, stepId: string): string | null {
  const index = definition.steps.findIndex((candidate) => candidate.id === stepId);
  if (index === -1) {
    return null;
  }
  return definition.steps[index + 1]?.id ?? null;
}

function getResolvedNextStepId(
  definition: QuizDefinition,
  step: QuizStep,
  selectedOptions: QuizQuestionOption[] = [],
): string | null {
  const optionNext = selectedOptions.find((option) => option.next)?.next ?? null;
  if (optionNext) {
    return optionNext;
  }

  if (step.next) {
    return step.next;
  }

  return getSequentialNextStepId(definition, step.id);
}

function replaceAnswerRecord(records: QuizAnswerRecord[], nextRecord: QuizAnswerRecord): QuizAnswerRecord[] {
  const filtered = records.filter((record) => record.stepId !== nextRecord.stepId);
  return [...filtered, nextRecord];
}

export function resolveResultScores(definition: QuizDefinition, answers: QuizAnswerRecord[]) {
  const scores = new Map(definition.results.map((result) => [result.id, 0]));

  answers.forEach((answer) => {
    const step = definition.steps.find(
      (candidate): candidate is Extract<QuizStep, { kind: "question" }> =>
        candidate.id === answer.stepId && candidate.kind === "question",
    );
    if (!step) {
      return;
    }

    answer.optionIds.forEach((optionId) => {
      const option = step.options.find((candidate) => candidate.id === optionId);
      if (!option) {
        return;
      }

      Object.entries(option.resultWeights).forEach(([resultId, weight]) => {
        scores.set(resultId, (scores.get(resultId) ?? 0) + weight);
      });
    });
  });

  return scores;
}

export function resolveResultProfile(
  definition: QuizDefinition,
  answers: QuizAnswerRecord[],
): QuizResultProfile {
  const scores = resolveResultScores(definition, answers);
  let winner = definition.results[0];
  let winnerScore = scores.get(winner.id) ?? 0;

  definition.results.slice(1).forEach((result) => {
    const score = scores.get(result.id) ?? 0;
    if (score > winnerScore) {
      winner = result;
      winnerScore = score;
    }
  });

  return winner;
}

export function createInitialQuizSnapshot(
  definition: QuizDefinition,
  sessionToken: string,
  now = new Date().toISOString(),
): QuizSessionSnapshot {
  const firstStep = getFirstStep(definition);
  return {
    sessionToken,
    currentStepId: firstStep.id,
    trail: [firstStep.id],
    answers: [],
    resultId: null,
    leadSubmission: null,
    completed: false,
    startedAt: now,
    updatedAt: now,
  };
}

export function advanceQuizSnapshot(
  definition: QuizDefinition,
  snapshot: QuizSessionSnapshot,
  input: QuizAdvanceInput,
  now = new Date().toISOString(),
): QuizSessionSnapshot {
  if (snapshot.currentStepId !== input.stepId) {
    throw new Error(`expected current step ${snapshot.currentStepId} but received ${input.stepId}`);
  }

  const currentStep = getStepById(definition, input.stepId);

  if (currentStep.kind === "question") {
    const optionIds = input.optionIds ?? [];
    if (optionIds.length === 0) {
      throw new Error("question steps require at least one selected option");
    }

    const selectedOptions = optionIds.map((optionId) => {
      const option = currentStep.options.find((candidate) => candidate.id === optionId);
      if (!option) {
        throw new Error(`unknown option ${optionId} for step ${currentStep.id}`);
      }
      return option;
    });

    if (currentStep.selection === "single" && selectedOptions.length !== 1) {
      throw new Error(`step ${currentStep.id} expects a single selection`);
    }

    const answers = replaceAnswerRecord(snapshot.answers, {
      stepId: currentStep.id,
      optionIds,
      answeredAt: now,
    });
    const result = resolveResultProfile(definition, answers);
    const nextStepId = getResolvedNextStepId(definition, currentStep, selectedOptions);

    return {
      ...snapshot,
      trail: nextStepId ? [...snapshot.trail, nextStepId] : snapshot.trail,
      answers,
      resultId: result.id,
      currentStepId: nextStepId ?? currentStep.id,
      completed: nextStepId === null,
      updatedAt: now,
    };
  }

  if (currentStep.kind === "lead") {
    const values = input.leadValues ?? {};
    currentStep.fields.forEach((field) => {
      if (field.required && !(values[field.id] ?? "").trim()) {
        throw new Error(`missing required lead field ${field.id}`);
      }
    });

    if (currentStep.requireConsent && !input.consent) {
      throw new Error("lead consent is required");
    }

    const nextStepId = getResolvedNextStepId(definition, currentStep);

    return {
      ...snapshot,
      trail: nextStepId ? [...snapshot.trail, nextStepId] : snapshot.trail,
      leadSubmission: {
        values,
        consent: Boolean(input.consent),
        submittedAt: now,
      },
      currentStepId: nextStepId ?? currentStep.id,
      completed: nextStepId === null,
      updatedAt: now,
    };
  }

  const nextStepId = getResolvedNextStepId(definition, currentStep);

  return {
    ...snapshot,
    trail: nextStepId ? [...snapshot.trail, nextStepId] : snapshot.trail,
    currentStepId: nextStepId ?? currentStep.id,
    completed: currentStep.kind === "offer" || nextStepId === null,
    updatedAt: now,
  };
}

export function retreatQuizSnapshot(
  definition: QuizDefinition,
  snapshot: QuizSessionSnapshot,
  now = new Date().toISOString(),
): QuizSessionSnapshot {
  if (snapshot.trail.length <= 1) {
    return snapshot;
  }

  const trail = snapshot.trail.slice(0, -1);
  const currentStepId = trail[trail.length - 1] ?? getFirstStep(definition).id;

  return {
    ...snapshot,
    currentStepId,
    trail,
    completed: false,
    updatedAt: now,
  };
}

export function getQuizProgress(definition: QuizDefinition, currentStepId: string) {
  const index = definition.steps.findIndex((step) => step.id === currentStepId);
  const safeIndex = index === -1 ? 0 : index;
  const total = definition.steps.length;
  const current = Math.min(safeIndex + 1, total);

  return {
    current,
    total,
    percent: Math.round((current / total) * 100),
  };
}
