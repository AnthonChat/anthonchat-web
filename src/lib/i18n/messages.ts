import type { Locale } from "@/i18n/routing";
import fs from "node:fs/promises";
import path from "node:path";

export type Messages = Record<string, unknown>;

const MESSAGES_DIR = path.join(process.cwd(), "public", "locales");
const DEFAULT_LOCALE: Locale = "en";

async function readLocaleFile(locale: string): Promise<Messages | null> {
  try {
    const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as Messages;
  } catch {
    return null;
  }
}

export async function loadMessages(locale: Locale): Promise<Messages> {
  // Try requested locale
  const primary = await readLocaleFile(locale);
  if (primary) return primary;

  // Fallback to default
  const fallback = await readLocaleFile(DEFAULT_LOCALE);
  if (fallback) return fallback;

  // Final fallback
  return {};
}