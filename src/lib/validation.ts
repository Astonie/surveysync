import { z } from "zod";

export const questionTypeSchema = z.enum([
  "MULTIPLE_CHOICE",
  "CHECKBOX",
  "TEXT_INPUT",
  "RATING_SCALE",
  "DROPDOWN",
  "DATE_INPUT",
]);

export const questionSchema = z.object({
  id: z.string().optional(),
  type: questionTypeSchema,
  text: z.string().min(1, "Question text is required"),
  required: z.boolean().default(true),
  options: z
    .array(z.string())
    .optional()
    .refine(
      (options) => {
        return true;
      },
      { message: "Options are required for choice-based questions" }
    ),
  order: z.number().int().min(0),
});

export const surveySchema = z.object({
  title: z.string().min(1, "Survey title is required").max(200),
  description: z.string().max(2000).optional(),
  questions: z.array(questionSchema).min(1, "At least one question is required"),
  isPublished: z.boolean().default(false),
  status: z.enum(["draft", "active", "paused", "closed"]).default("draft"),
});

export const answerSchema = z.object({
  questionId: z.string(),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

export const responseSchema = z.object({
  surveyId: z.string(),
  answers: z.array(answerSchema),
  submittedBy: z.string().optional(),
  isOffline: z.boolean().default(false),
});

export type QuestionType = z.infer<typeof questionTypeSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type SurveyInput = z.infer<typeof surveySchema>;
export type AnswerInput = z.infer<typeof answerSchema>;
export type ResponseInput = z.infer<typeof responseSchema>;
