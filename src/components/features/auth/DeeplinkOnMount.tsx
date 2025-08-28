"use client";

import { useEffect } from "react";

/**
 * DeeplinkOnMount
 * Small client-only helper that runs on the signup completion page to immediately
 * attempt a channel deeplink if the URL includes the channel parameter.
 *
 * Behavior:
 * - Handles 'telegram' and 'whatsapp' channels.
 * - For Telegram, attempts to open tg://resolve and falls back to https://t.me.
 * - For WhatsApp, opens wa.me link directly.
 * - Logs a debug line in the browser console.
 */
export default function DeeplinkOnMount() {
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      const channelParam = params.get("channel")?.toLowerCase();
      const nonce = params.get("link"); // The registration nonce

      if (!channelParam || !nonce) return;

      if (channelParam === "telegram") {
        const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
        if (botUsername) {
          const primary = `https://t.me/${encodeURIComponent(botUsername)}`;
          const fallback = `tg://resolve?domain=${encodeURIComponent(
            botUsername
          )}`;
          
          window.location.assign(primary);

          setTimeout(() => {
            try {
              window.location.replace(fallback);
            } catch {
              // ignore
            }
          }, 3000);
        }
      } else if (channelParam === "whatsapp") {
        const whatsAppNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
        if (whatsAppNumber) {
          const whatsAppUrl = `https://wa.me/${whatsAppNumber}`;
          window.location.assign(whatsAppUrl);
          try {
            window.location.replace(whatsAppUrl)
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      console.error("DEEPLINK_MOUNT_HELPER_ERROR", err);
    }
  }, []);

  // Helper does not render any visible UI
  return null;
}
