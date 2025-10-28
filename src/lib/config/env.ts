import "server-only";
import { z } from "zod";

/**
 * Runtime environment schema and getter for server-side secrets and config.
 *
 * Validated vars:
 * - WHATSAPP_TOKEN
 * - WHATSAPP_PHONE_NUMBER_ID
 * - NEXT_PUBLIC_SITE_URL (optional)
 * - ALLOW_AUTH_USERS_FALLBACK ("true" | "false", default "false")
 *
 * Security:
 * - This module is server-only; importing it in a Client Component will error.
 * - WHATSAPP_* are server-only secrets and must never be exposed in client bundles.
 *
 * Docs: see Admin Broadcast (WhatsApp) setup at docs/broadcast.md
 */
const rawEnvSchema = z.object({
  WHATSAPP_TOKEN: z.string().min(1, "WHATSAPP_TOKEN is required"),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1, "WHATSAPP_PHONE_NUMBER_ID is required"),
  NEXT_PUBLIC_SITE_URL: z.string().min(1).optional(),
  ALLOW_AUTH_USERS_FALLBACK: z.enum(["true", "false"]).default("false"),
});

const envSchema = rawEnvSchema.transform((v) => ({
  WHATSAPP_TOKEN: v.WHATSAPP_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID: v.WHATSAPP_PHONE_NUMBER_ID,
  NEXT_PUBLIC_SITE_URL: v.NEXT_PUBLIC_SITE_URL,
  ALLOW_AUTH_USERS_FALLBACK: v.ALLOW_AUTH_USERS_FALLBACK === "true",
}));

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * Parse and cache environment configuration on first call.
 * Throws descriptive errors if required variables are missing.
 */
export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}