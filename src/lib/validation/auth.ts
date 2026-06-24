import { z } from "zod";

/**
 * This is the ONE place that defines what a valid registration looks like.
 * The frontend form uses this (via react-hook-form + @hookform/resolvers)
 * to show inline errors instantly. The API route uses this same schema
 * to reject bad data before it ever touches MongoDB.
 *
 * One rule, two places it's enforced, zero duplication.
 */
export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "الاسم يجب أن يكون حرفين على الأقل")
    .max(100, "الاسم طويل جداً"),
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z
    .string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .regex(/[A-Z]/, "يجب أن تحتوي على حرف كبير واحد على الأقل")
    .regex(/[0-9]/, "يجب أن تحتوي على رقم واحد على الأقل"),
  turnstileToken: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
  turnstileToken: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
