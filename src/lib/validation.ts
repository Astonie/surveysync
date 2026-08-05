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
  id: z.string().min(1).optional(),
  type: questionTypeSchema,
  text: z.string().min(1, "Question text is required").max(2000),
  required: z.boolean().default(true),
  options: z.array(z.string()).max(500).nullable().optional(),
  order: z.number().int().min(0),
});

export const sectionSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().max(200),
  description: z.string().max(2000).nullable().optional(),
  order: z.number().int().min(0).optional(),
  questions: z.array(questionSchema).default([]),
});

export const surveyInputSchema = z.object({
  title: z.string().min(1, "Survey title is required").max(200),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(["draft", "active", "paused", "closed"]).default("draft"),
  sections: z.array(sectionSchema).default([]),
});

export const surveyPatchSchema = z
  .object({
    title: z.string().min(1, "Survey title is required").max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    status: z.enum(["draft", "active", "paused", "closed"]).optional(),
  })
  .strict();

export const answerSchema = z.object({
  questionId: z.string().min(1),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

export const responseInputSchema = z
  .object({
    surveyId: z.string().min(1),
    answers: z.array(answerSchema).min(1, "At least one answer is required"),
    isOffline: z.boolean().default(false),
    sessionId: z.string().optional(),
    deviceId: z.string().max(200).optional(),
  })
  .strict();

export const inviteSchema = z
  .object({
    email: z.string().email("Invalid email format"),
  })
  .strict();

export const sessionCreateSchema = z
  .object({
    surveyId: z.string().min(1, "surveyId is required"),
  })
  .strict();

export const sessionActionSchema = z
  .object({
    action: z.enum(["pause", "resume", "close", "submit", "count"]),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required").max(128),
  })
  .strict();

export const registerSchema = z
  .object({
    email: z.string().email("Invalid email format"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[0-9]/, "Password must contain a number"),
    name: z.string().max(100).optional(),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required").max(128),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(128, "New password must be at most 128 characters")
      .regex(/[A-Z]/, "New password must contain an uppercase letter")
      .regex(/[a-z]/, "New password must contain a lowercase letter")
      .regex(/[0-9]/, "New password must contain a number"),
  })
  .strict();

export const profileSchema = z
  .object({
    name: z.string().max(100).nullable().optional(),
    email: z.string().email("Invalid email format").optional(),
    bio: z.string().max(500).nullable().optional(),
    phone: z.string().max(20).nullable().optional(),
  })
  .strict();

export const draftSectionSchema = z.object({
  title: z.string().max(200),
  description: z.string().max(2000),
  order: z.number().int().min(0).optional(),
  questions: z
    .array(
      z.object({
        type: questionTypeSchema.optional(),
        text: z.string().max(2000),
        required: z.boolean().optional(),
        options: z.array(z.string()).max(500).nullable().optional(),
        order: z.number().int().min(0).optional(),
      })
    )
    .default([]),
});

export const accessRemoveSchema = z
  .object({
    userId: z.string().min(1, "userId is required"),
  })
  .strict();

export const syncItemSchema = z.object({
  id: z.string().min(1),
  entityType: z.string().min(1),
  payload: z.string(),
});

export const syncPushSchema = z
  .object({
    items: z.array(syncItemSchema).min(1, "No items to sync").max(100, "Too many items in one sync batch"),
  })
  .strict();

export const syncPullSchema = z
  .object({
    lastSyncAt: z.string().datetime({ offset: true }).optional(),
    surveyIds: z.array(z.string().min(1)).max(100).optional(),
  })
  .strict();

export const draftPayloadSchema = z.object({
  draftId: z.string().optional(),
  title: z.string().max(200),
  description: z.string().max(2000),
  sections: z.array(draftSectionSchema).default([]),
});

export type QuestionType = z.infer<typeof questionTypeSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
export type SurveyInput = z.infer<typeof surveyInputSchema>;
export type AnswerInput = z.infer<typeof answerSchema>;
export type ResponseInput = z.infer<typeof responseInputSchema>;

export function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message || "Invalid request";
}
