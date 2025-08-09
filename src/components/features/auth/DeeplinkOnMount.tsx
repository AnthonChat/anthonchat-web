"use client";

import { useEffect } from "react";

/**
 * DeeplinkOnMount
 * Small client-only helper that runs on the signup completion page to immediately
 * attempt a Telegram deeplink if the URL includes channel=telegram (and optional link nonce).
 *
 * Behavior:
 * - Reads NEXT_PUBLIC_TELEGRAM_BOT_USERNAME from client env
 * - If channel=telegram, opens tg://resolve?domain=<BOT>[&start=<nonce>]
 * - Fallback after 1200ms to https://t.me/<BOT>[?start=<nonce>]
 * - Logs a debug line in the browser console: "DEEPLINK_MOUNT_HELPER"
 */
export default function DeeplinkOnMount() {
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      const channelParam = params.get("channel");
      const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

      if (channelParam?.toLowerCase() === "telegram" && botUsername) {
        const primary = `https://t.me/${encodeURIComponent(botUsername)}`;

        const fallback = `tg://resolve?domain=${encodeURIComponent(
          botUsername
        )}`;

        // Try native Telegram deeplink first
        window.location.assign(primary);

        // Fallback to the web chat after a short delay if no native handler
        setTimeout(() => {
          try {
            window.location.replace(fallback);
          } catch {
            // ignore
          }
        }, 3000);
      }
    } catch (err) {
      console.error("DEEPLINK_MOUNT_HELPER_ERROR", err);
    }
  }, []);

  // Helper does not render any visible UI
  return null;
}
