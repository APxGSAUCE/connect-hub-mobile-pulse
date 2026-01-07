import { z } from 'zod';

// Message validation
export const messageSchema = z.object({
  content: z.string()
    .trim()
    .min(1, { message: "Message cannot be empty" })
    .max(2000, { message: "Message must be less than 2000 characters" })
});

// Event validation
export const eventSchema = z.object({
  title: z.string()
    .trim()
    .min(1, { message: "Title is required" })
    .max(200, { message: "Title must be less than 200 characters" }),
  description: z.string()
    .trim()
    .max(2000, { message: "Description must be less than 2000 characters" })
    .optional()
    .nullable(),
  location: z.string()
    .trim()
    .max(300, { message: "Location must be less than 300 characters" })
    .optional()
    .nullable(),
  start_date: z.string().min(1, { message: "Start date is required" }),
  end_date: z.string().min(1, { message: "End date is required" }),
  event_type: z.string().min(1, { message: "Event type is required" }),
  image_url: z.string().url().optional().nullable().or(z.literal(''))
});

// Chat group validation
export const chatGroupSchema = z.object({
  name: z.string()
    .trim()
    .min(1, { message: "Group name is required" })
    .max(100, { message: "Group name must be less than 100 characters" }),
  description: z.string()
    .trim()
    .max(500, { message: "Description must be less than 500 characters" })
    .optional()
    .nullable()
});

// Type exports for validated data
export type ValidatedMessage = z.infer<typeof messageSchema>;
export type ValidatedEvent = z.infer<typeof eventSchema>;
export type ValidatedChatGroup = z.infer<typeof chatGroupSchema>;

// Helper function to validate and get result
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const firstError = result.error.errors[0];
  return { success: false, error: firstError?.message || "Validation failed" };
}

// Simpler helper that throws on error (for use in try-catch blocks)
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(result.error.errors[0]?.message || "Validation failed");
  }
  return result.data;
}
