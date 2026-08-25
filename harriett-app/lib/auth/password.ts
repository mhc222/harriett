import { z } from "zod";

export const accountEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

export const accountPasswordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Password must be 128 characters or fewer.");

export const inviteSignupSchema = z.object({
  email: accountEmailSchema,
  password: accountPasswordSchema,
  token: z.string().min(32).max(512),
});
