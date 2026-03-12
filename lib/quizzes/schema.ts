import { z } from "zod";

export const QUIZ_SCHEMA_VERSION = "quiz-funnel.v2";

const identifierSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/, "ids must use lowercase letters, digits, and hyphens");

const textLineSchema = z.string().min(1).max(180);
const textBlockSchema = z.string().min(1).max(2400);
const optionalUrlSchema = z
  .string()
  .url()
  .or(z.literal(""))
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const quizThemeSchema = z.object({
  variant: z.literal("monochrome-premium"),
  typeface: z.literal("sans"),
  motion: z.literal("smooth"),
});

export const quizEntrypointSchema = z.object({
  id: identifierSchema,
  label: textLineSchema,
  source: textLineSchema,
  pathHint: textLineSchema,
});

const resultMetricSchema = z.object({
  id: identifierSchema,
  label: textLineSchema,
  value: z.number().int().min(1).max(100),
});

const resultCriterionSchema = z.object({
  id: identifierSchema,
  label: textLineSchema,
  detail: textBlockSchema,
  emphasis: z.enum(["high", "steady", "watch"]),
});

export const quizResultProfileSchema = z.object({
  id: identifierSchema,
  label: textLineSchema,
  badge: textLineSchema,
  affirmation: textBlockSchema,
  headline: textLineSchema,
  summary: textBlockSchema,
  mechanism: textBlockSchema,
  educationBullets: z.array(textLineSchema).min(3).max(6),
  dopamineCandies: z.array(textLineSchema).min(2).max(5),
  offerBridge: textBlockSchema,
  graphTitle: textLineSchema,
  graphCaption: textBlockSchema,
  metrics: z.array(resultMetricSchema).min(3).max(5),
  criteria: z.array(resultCriterionSchema).min(3).max(5),
});

export const quizLeadFieldSchema = z.object({
  id: identifierSchema,
  label: textLineSchema,
  type: z.enum(["text", "email", "textarea"]),
  placeholder: textLineSchema,
  required: z.boolean(),
});

const questionOptionSchema = z.object({
  id: identifierSchema,
  label: textLineSchema,
  description: textBlockSchema.optional(),
  imageUrl: optionalUrlSchema,
  next: identifierSchema.optional(),
  revealNote: textLineSchema.optional(),
  resultWeights: z.record(identifierSchema, z.number().int().min(0).max(5)),
});

const messageHighlightSchema = z.object({
  id: identifierSchema,
  label: textLineSchema,
  value: textLineSchema,
});

const analysisStageSchema = z.object({
  id: identifierSchema,
  label: textLineSchema,
  description: textLineSchema.optional(),
  durationMs: z.number().int().min(200).max(8000),
});

const baseStepSchema = z.object({
  id: identifierSchema,
  kind: z.enum(["welcome", "question", "message", "analysis", "result", "lead", "offer"]),
  kicker: textLineSchema.optional(),
  title: textLineSchema,
  body: textBlockSchema.optional(),
  imageUrl: optionalUrlSchema,
  next: identifierSchema.nullish().transform((value) => value ?? null),
});

const welcomeStepSchema = baseStepSchema.extend({
  kind: z.literal("welcome"),
  primaryLabel: textLineSchema,
  secondaryLabel: textLineSchema.optional(),
  trustPoints: z.array(textLineSchema).min(2).max(4),
});

const questionStepSchema = baseStepSchema.extend({
  kind: z.literal("question"),
  selection: z.enum(["single", "multiple"]),
  continueLabel: textLineSchema.optional(),
  options: z.array(questionOptionSchema).min(2).max(6),
});

const messageStepSchema = baseStepSchema.extend({
  kind: z.literal("message"),
  primaryLabel: textLineSchema,
  secondaryLabel: textLineSchema.optional(),
  bullets: z.array(textLineSchema).min(1).max(4).optional(),
  highlights: z.array(messageHighlightSchema).min(1).max(3).optional(),
});

const analysisStepSchema = baseStepSchema.extend({
  kind: z.literal("analysis"),
  autoAdvance: z.boolean().default(true),
  stages: z.array(analysisStageSchema).min(2).max(6),
});

const resultStepSchema = baseStepSchema.extend({
  kind: z.literal("result"),
  primaryLabel: textLineSchema,
  secondaryLabel: textLineSchema.optional(),
  disclaimer: textLineSchema,
});

const leadStepSchema = baseStepSchema.extend({
  kind: z.literal("lead"),
  submitLabel: textLineSchema,
  consentLabel: textLineSchema,
  disclaimer: textBlockSchema,
  requireConsent: z.boolean().default(true),
  fields: z.array(quizLeadFieldSchema).min(1).max(4),
});

const offerStepSchema = baseStepSchema.extend({
  kind: z.literal("offer"),
  ctaLabel: textLineSchema,
  ctaUrl: z.string().url(),
  note: textLineSchema.optional(),
  guarantee: textLineSchema.optional(),
  bullets: z.array(textLineSchema).min(3).max(6),
});

export const quizStepSchema = z.discriminatedUnion("kind", [
  welcomeStepSchema,
  questionStepSchema,
  messageStepSchema,
  analysisStepSchema,
  resultStepSchema,
  leadStepSchema,
  offerStepSchema,
]);

function assertUniqueIds(
  items: Array<{ id: string }>,
  ctx: z.RefinementCtx,
  path: Array<string | number>,
  label: string,
) {
  const ids = new Set<string>();
  items.forEach((item, index) => {
    if (ids.has(item.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `duplicate ${label} id: ${item.id}`,
        path: [...path, index, "id"],
      });
    }
    ids.add(item.id);
  });
}

export const quizDefinitionSchema = z
  .object({
    schemaVersion: z.literal(QUIZ_SCHEMA_VERSION),
    slug: identifierSchema,
    name: textLineSchema,
    description: textBlockSchema,
    estimatedMinutes: z.number().int().min(2).max(30),
    theme: quizThemeSchema,
    entrypoints: z.array(quizEntrypointSchema).min(1),
    results: z.array(quizResultProfileSchema).min(2).max(6),
    steps: z.array(quizStepSchema).min(3),
  })
  .superRefine((definition, ctx) => {
    const stepIds = new Set<string>();
    const resultIds = new Set<string>();

    assertUniqueIds(definition.entrypoints, ctx, ["entrypoints"], "entrypoint");
    assertUniqueIds(definition.results, ctx, ["results"], "result");

    definition.results.forEach((result, resultIndex) => {
      resultIds.add(result.id);
      assertUniqueIds(result.metrics, ctx, ["results", resultIndex, "metrics"], "result metric");
      assertUniqueIds(result.criteria, ctx, ["results", resultIndex, "criteria"], "result criterion");
    });

    definition.steps.forEach((step, stepIndex) => {
      if (stepIds.has(step.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate step id: ${step.id}`,
          path: ["steps", stepIndex, "id"],
        });
      }
      stepIds.add(step.id);

      if (step.kind === "question") {
        assertUniqueIds(step.options, ctx, ["steps", stepIndex, "options"], "option");
        step.options.forEach((option, optionIndex) => {
          Object.keys(option.resultWeights).forEach((resultId) => {
            if (!resultIds.has(resultId)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `unknown result id "${resultId}" in step ${step.id}`,
                path: ["steps", stepIndex, "options", optionIndex, "resultWeights", resultId],
              });
            }
          });
        });
      }

      if (step.kind === "message" && step.highlights) {
        assertUniqueIds(step.highlights, ctx, ["steps", stepIndex, "highlights"], "message highlight");
      }

      if (step.kind === "analysis") {
        assertUniqueIds(step.stages, ctx, ["steps", stepIndex, "stages"], "analysis stage");
      }
    });

    if (!definition.steps.some((step) => step.kind === "result")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "at least one result step is required",
        path: ["steps"],
      });
    }

    if (!definition.steps.some((step) => step.kind === "analysis")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "at least one analysis step is required",
        path: ["steps"],
      });
    }

    if (!definition.steps.some((step) => step.kind === "offer")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "at least one offer step is required",
        path: ["steps"],
      });
    }

    definition.steps.forEach((step, stepIndex) => {
      if (step.next && !stepIds.has(step.next)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `step ${step.id} points to unknown next step "${step.next}"`,
          path: ["steps", stepIndex, "next"],
        });
      }

      if (step.kind === "question") {
        step.options.forEach((option, optionIndex) => {
          if (option.next && !stepIds.has(option.next)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `option ${option.id} points to unknown next step "${option.next}"`,
              path: ["steps", stepIndex, "options", optionIndex, "next"],
            });
          }
        });
      }
    });
  });

export type QuizTheme = z.infer<typeof quizThemeSchema>;
export type QuizEntrypoint = z.infer<typeof quizEntrypointSchema>;
export type QuizResultProfile = z.infer<typeof quizResultProfileSchema>;
export type QuizLeadField = z.infer<typeof quizLeadFieldSchema>;
export type QuizQuestionOption = z.infer<typeof questionOptionSchema>;
export type QuizStep = z.infer<typeof quizStepSchema>;
export type QuizDefinition = z.infer<typeof quizDefinitionSchema>;

export function parseQuizDefinition(input: unknown): QuizDefinition {
  return quizDefinitionSchema.parse(input);
}

export function getQuizStructureFingerprint(definition: QuizDefinition): string {
  const shape = {
    slug: definition.slug,
    theme: definition.theme,
    results: definition.results.map((result) => result.id),
    steps: definition.steps.map((step) => ({
      id: step.id,
      kind: step.kind,
      next: step.next ?? null,
      optionIds: step.kind === "question" ? step.options.map((option) => option.id) : [],
      optionNext:
        step.kind === "question"
          ? step.options.map((option) => ({ id: option.id, next: option.next ?? null }))
          : [],
      leadFieldIds: step.kind === "lead" ? step.fields.map((field) => field.id) : [],
      analysisStages:
        step.kind === "analysis"
          ? step.stages.map((stage) => ({ id: stage.id, durationMs: stage.durationMs }))
          : [],
    })),
  };

  return JSON.stringify(shape);
}

export function assertAdminEditableStructure(
  currentDefinition: QuizDefinition,
  nextDefinition: QuizDefinition,
): void {
  if (getQuizStructureFingerprint(currentDefinition) !== getQuizStructureFingerprint(nextDefinition)) {
    throw new Error("admin edits cannot change quiz structure; use cli publish for structural changes");
  }
}

export function getQuestionStepOptionMap(step: Extract<QuizStep, { kind: "question" }>) {
  return new Map(step.options.map((option) => [option.id, option] as const));
}
