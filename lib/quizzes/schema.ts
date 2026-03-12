import { z } from "zod";

export const QUIZ_SCHEMA_VERSION = "quiz-funnel.v1";

const identifierSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/, "ids must use lowercase letters, digits, and hyphens");

const textLineSchema = z.string().min(1).max(160);
const textBlockSchema = z.string().min(1).max(2400);
const optionalUrlSchema = z
  .string()
  .url()
  .or(z.literal(""))
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));
const hexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, "expected hex color");

export const quizThemeSchema = z.object({
  shell: textLineSchema,
  displayFont: textLineSchema,
  bodyFont: textLineSchema,
  canvasColor: hexColorSchema,
  panelColor: hexColorSchema,
  inkColor: hexColorSchema,
  accentColor: hexColorSchema,
  accentSoftColor: hexColorSchema,
  edgeColor: hexColorSchema,
  successColor: hexColorSchema,
});

export const quizEntrypointSchema = z.object({
  id: identifierSchema,
  label: textLineSchema,
  source: textLineSchema,
  pathHint: textLineSchema,
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

const baseStepSchema = z.object({
  id: identifierSchema,
  kind: z.enum(["welcome", "question", "insight", "result", "lead", "offer"]),
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

const insightStepSchema = baseStepSchema.extend({
  kind: z.literal("insight"),
  primaryLabel: textLineSchema,
  bullets: z.array(textLineSchema).min(2).max(5),
  quoteText: textBlockSchema.optional(),
  quoteAttribution: textLineSchema.optional(),
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
  insightStepSchema,
  resultStepSchema,
  leadStepSchema,
  offerStepSchema,
]);

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
    const entrypointIds = new Set<string>();

    definition.results.forEach((result, index) => {
      if (resultIds.has(result.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate result id: ${result.id}`,
          path: ["results", index, "id"],
        });
      }
      resultIds.add(result.id);
    });

    definition.entrypoints.forEach((entrypoint, index) => {
      if (entrypointIds.has(entrypoint.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate entrypoint id: ${entrypoint.id}`,
          path: ["entrypoints", index, "id"],
        });
      }
      entrypointIds.add(entrypoint.id);
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
        const optionIds = new Set<string>();
        step.options.forEach((option, optionIndex) => {
          if (optionIds.has(option.id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `duplicate option id: ${option.id}`,
              path: ["steps", stepIndex, "options", optionIndex, "id"],
            });
          }
          optionIds.add(option.id);

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
    });

    if (!definition.steps.some((step) => step.kind === "result")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "at least one result step is required",
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
    results: definition.results.map((result) => result.id),
    steps: definition.steps.map((step) => ({
      id: step.id,
      kind: step.kind,
      next: step.next ?? null,
      optionIds: step.kind === "question" ? step.options.map((option) => option.id) : [],
      optionNext: step.kind === "question"
        ? step.options.map((option) => ({ id: option.id, next: option.next ?? null }))
        : [],
      leadFieldIds: step.kind === "lead" ? step.fields.map((field) => field.id) : [],
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
