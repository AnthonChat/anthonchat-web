"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/server";
import type { FormState } from "@/lib/auth/types";
import { getPathWithLocale, type Locale, defaultLocale } from "@/i18n/routing";
import { headers } from "next/headers";
import { validateChannelLinkingParams } from "@/lib/utils/url-params";
import { buildDashboardRedirectUrl, buildRedirectUrl } from "@/lib/utils/redirect-helpers";
import { ChannelLinkingService } from "@/lib/services/channel-linking";

/**
 * Get current locale from request headers
 */
async function getCurrentLocale(): Promise<Locale> {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  
  // Extract locale from pathname like /en/login or /it/signup
  const localeMatch = pathname.match(/^\/([a-z]{2})\//);
  if (localeMatch && (localeMatch[1] === 'en' || localeMatch[1] === 'it')) {
    return localeMatch[1] as Locale;
  }
  
  return defaultLocale;
}

/**
 * Compute absolute site base URL for redirects (protocol + host).
 * Prefer the domain the user is currently on (handles custom domains and previews).
 * Priority:
 *   1) Referer/Origin headers (most accurate for the current navigation)
 *   2) x-forwarded-host / host + x-forwarded-proto
 *   3) VERCEL_URL (deployment url)
 *   4) NEXT_PUBLIC_SITE_URL (static fallback)
 */
async function getSiteBaseUrl(): Promise<string> {
  const h = await headers();

  // 1) Prefer Referer (full URL of the page that submitted the action)
  const referer = h.get("referer") || h.get("referrer");
  if (referer && /^https?:\/\//i.test(referer)) {
    try {
      const u = new URL(referer);
      return `${u.protocol}//${u.host}`;
    } catch {
      // ignore parse errors, continue to other fallbacks
    }
  }

  // Also consider Origin if present
  const origin = h.get("origin");
  if (origin && /^https?:\/\//i.test(origin)) {
    try {
      const u = new URL(origin);
      return `${u.protocol}//${u.host}`;
    } catch {
      // ignore parse errors
    }
  }

  // 2) Forwarded host/standard host (handle potential comma-separated list)
  const forwardedHostHeader = h.get("x-forwarded-host") || "";
  const forwardedHost = forwardedHostHeader.split(",")[0]?.trim();
  const hostHeader = h.get("host") || "";
  const host = (forwardedHost || hostHeader).trim();

  if (host) {
    const proto =
      h.get("x-forwarded-proto") ||
      // Some platforms set this alternative header
      h.get("x-forwarded-protocol") ||
      "https";
    return `${proto}://${host}`;
  }

  // 3) Vercel deployment URL (when headers are unavailable)
  const vercelHeader = h.get("x-vercel-deployment-url") || h.get("x-vercel-id");
  const vercelUrl = process.env.VERCEL_URL || vercelHeader || "";
  if (vercelUrl) {
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    // Strip any accidental protocol if header already has it
    const cleaned = vercelUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `${protocol}://${cleaned}`;
  }

  // 4) Configured site URL
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.replace(/\/$/, "");
  }

  // Local fallback
  return "http://localhost:3000";
}

/**
 * Handle channel parameters in login flow
 * Detects and validates channel linking parameters from form data
 * 
 * @param formData - Form data containing potential channel parameters
 * @returns Object with channel parameters and validation status
 */
function handleChannelParamsInLogin(formData: FormData): {
  hasChannelParams: boolean;
  channelParams: {
    channel?: string;
    link?: string;
  };
  isValid: boolean;
  errors: string[];
} {
  const channel = formData.get("channel")?.toString()?.trim();
  const link = formData.get("link")?.toString()?.trim();
  
  const hasChannelParams = Boolean(channel || link);
  
  if (!hasChannelParams) {
    return {
      hasChannelParams: false,
      channelParams: {},
      isValid: true,
      errors: [],
    };
  }

  // Validate channel linking parameters
  const validation = validateChannelLinkingParams({
    channel,
    link,
  });

  return {
    hasChannelParams: true,
    channelParams: {
      channel: validation.validParams.channel,
      link: validation.validParams.link,
    },
    isValid: validation.isValid,
    errors: validation.errors,
  };
}



/**
 * Link channel after successful login
 * Attempts automatic channel linking for authenticated users
 * 
 * @param userId - The authenticated user ID
 * @param userEmail - The user's email address
 * @param channelParams - Channel linking parameters
 * @returns Promise with linking result
 */
async function linkChannelAfterLogin(
  userId: string,
  userEmail: string,
  channelParams: {
    channel?: string;
    link?: string;
  }
): Promise<{
  success: boolean;
  error?: string;
  requiresManualSetup?: boolean;
}> {
  if (!channelParams.channel || !channelParams.link) {
    return {
      success: false,
      error: 'Missing channel linking parameters',
      requiresManualSetup: true,
    };
  }

  try {
    console.info('Attempting channel linking after login', {
      userId,
      email: userEmail,
      channel: channelParams.channel,
      nonce: channelParams.link.substring(0, 8) + '...',
    });

    const channelLinkingService = ChannelLinkingService.getInstance();
    const result = await channelLinkingService.validateAndLinkChannel(
      userId,
      channelParams.link,
      channelParams.channel,
      userEmail
    );

    if (result.success) {
      console.info('Channel linking successful after login', {
        userId,
        channel: channelParams.channel,
      });
    } else {
      console.warn('Channel linking failed after login', {
        userId,
        channel: channelParams.channel,
        error: result.error,
      });
    }

    return {
      success: result.success,
      error: result.error,
      requiresManualSetup: result.requiresManualSetup,
    };

  } catch (error) {
    console.error('Error during post-login channel linking', {
      userId,
      channel: channelParams.channel,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error: 'Failed to link channel after login',
      requiresManualSetup: true,
    };
  }
}

/**
 * Handle post-login redirect with smart routing
 * Determines the appropriate redirect path based on channel linking results
 * 
 * @param locale - Current locale
 * @param channelParams - Channel linking parameters
 * @param linkingResult - Result of channel linking attempt
 * @returns Redirect URL
 */
function handlePostLoginRedirect(
  locale: Locale,
  channelParams: {
    channel?: string;
    link?: string;
  },
  linkingResult?: {
    success: boolean;
    error?: string;
    requiresManualSetup?: boolean;
  }
): string {
  const hasChannelParams = Boolean(channelParams.channel || channelParams.link);
  
  if (!hasChannelParams) {
    // Standard login - redirect to dashboard
    return getPathWithLocale("/dashboard", locale);
  }

  // Channel linking was attempted
  if (linkingResult?.success) {
    // Successful channel linking - redirect to dashboard with success context
    return buildDashboardRedirectUrl(
      channelParams,
      {
        channelLinked: true,
        success: 'Channel connected successfully',
      },
      locale
    );
  } else {
    // Failed channel linking - redirect to dashboard with error context
    return buildDashboardRedirectUrl(
      channelParams,
      {
        error: linkingResult?.error || 'Failed to connect channel',
      },
      locale
    );
  }
}

/**
 * Server Action to request a password reset email.
 * Uses Supabase Auth reset flow with a locale-aware absolute redirect URL.
 */
export async function requestPasswordReset(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    const rawEmail = formData.get("email")?.toString()?.trim() || "";
    if (!rawEmail) {
      return {
        message: "L'email è richiesta",
        errors: [{ field: "email", message: "L'email è richiesta" }],
        success: false,
      };
    }
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return {
        message: "Formato email non valido",
        errors: [{ field: "email", message: "Inserisci un indirizzo email valido" }],
        success: false,
      };
    }

    const locale = await getCurrentLocale();
    const baseUrl = await getSiteBaseUrl();
    const redirectTo = buildRedirectUrl(
      "/reset-password",
      {},
      { baseUrl, locale }
    );

    // Diagnostics to confirm the exact redirect URL passed to Supabase
    console.info("PASSWORD_RESET_REDIRECT_TO", { baseUrl, locale, redirectTo });

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(rawEmail, { redirectTo });

    if (error) {
      console.error("PASSWORD_RESET_EMAIL_ERROR", {
        emailPrefix: rawEmail.substring(0, 3) + "***",
        error: error.message,
      });
      // Do not reveal whether email exists
      return {
        message: "Se esiste un account, riceverai un'email con le istruzioni per reimpostare la password.",
        success: true,
      };
    }

    return {
      message: "Se esiste un account, riceverai un'email con le istruzioni per reimpostare la password.",
      success: true,
    };
  } catch (err) {
    console.error("PASSWORD_RESET_EMAIL_EXCEPTION", {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      message: "Si è verificato un errore durante la richiesta. Riprova più tardi.",
      errors: [{ field: "server", message: "Errore del server" }],
      success: false,
    };
  }
}




/**
 * Server Action migliorata per il login con FormState
 * Compatibile con useActionState e sistema di toast
 * Enhanced to handle channel linking parameters
 *
 * @param _prevState - Stato precedente del form
 * @param formData - Dati del form di login
 * @returns Promise<FormState> - Stato aggiornato del form o redirect su successo
 */
export async function signInWithState(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    console.info("Starting enhanced login process", {
      timestamp: new Date().toISOString(),
    });

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // Handle channel parameters in login flow
    const channelParamResult = handleChannelParamsInLogin(formData);
    
    console.info("Channel parameters detected in login", {
      hasChannelParams: channelParamResult.hasChannelParams,
      isValid: channelParamResult.isValid,
      channel: channelParamResult.channelParams.channel,
      hasLink: Boolean(channelParamResult.channelParams.link),
    });

    // Validazione base
    if (!email || !password) {
      console.warn("Login validation failed", {
        missingEmail: !email,
        missingPassword: !password,
      });
      
      const errors = [];
      if (!email) {
        errors.push({ field: "email", message: "L'email è richiesta" });
      }
      if (!password) {
        errors.push({ field: "password", message: "La password è richiesta" });
      }
      
      return {
        message: "Email e password sono richiesti",
        errors,
        success: false,
      };
    }

    if (!email.includes("@")) {
      return {
        message: "Formato email non valido",
        errors: [
          { field: "email", message: "Inserisci un indirizzo email valido" }
        ],
        success: false,
      };
    }

    // Validate channel parameters if present
    if (channelParamResult.hasChannelParams && !channelParamResult.isValid) {
      console.warn("Channel parameter validation failed", {
        errors: channelParamResult.errors,
      });
      
      return {
        message: "Invalid channel linking parameters",
        errors: channelParamResult.errors.map(error => ({
          field: "channel",
          message: error,
        })),
        success: false,
      };
    }

    console.info("Form validation passed", {
      email,
      hasChannelParams: channelParamResult.hasChannelParams,
    });

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("AUTH_LOGIN_ERROR", {
        authError: error.message,
        email
      });
      
      let message = "Credenziali non valide";
      if (error.message.includes("Invalid login credentials")) {
        message = "Email o password non corretti";
      } else if (error.message.includes("Email not confirmed")) {
        message = "Verifica la tua email prima di accedere";
      } else if (error.message.includes("Too many requests")) {
        message = "Troppi tentativi di accesso. Riprova tra qualche minuto";
      }
      
      return {
        message,
        errors: [{ field: "auth", message }],
        success: false,
      };
    }

    if (!data.user) {
      console.error("User not found after login", { email });
      
      return {
        message: "Errore interno durante l'accesso",
        errors: [{ field: "server", message: "Riprova o contatta il supporto" }],
        success: false,
      };
    }

    console.info("Login successful", {
      userId: data.user.id,
      email,
      timestamp: new Date().toISOString(),
    });

    const locale = await getCurrentLocale();

    // Handle post-login channel linking if parameters are present
    let linkingResult;
    if (channelParamResult.hasChannelParams && channelParamResult.isValid) {
      console.info("Attempting post-login channel linking", {
        userId: data.user.id,
        channel: channelParamResult.channelParams.channel,
      });

      try {
        linkingResult = await linkChannelAfterLogin(
          data.user.id,
          email,
          channelParamResult.channelParams
        );

        // Log the result for monitoring
        console.info("Post-login channel linking completed", {
          userId: data.user.id,
          success: linkingResult.success,
          error: linkingResult.error,
          requiresManualSetup: linkingResult.requiresManualSetup,
        });

      } catch (error) {
        console.error("Post-login channel linking failed with exception", {
          userId: data.user.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Create a fallback result
        linkingResult = {
          success: false,
          error: 'Channel linking failed due to system error',
          requiresManualSetup: true,
        };
      }
    }

    // Determine redirect path based on channel linking results
    const redirectUrl = handlePostLoginRedirect(
      locale,
      channelParamResult.channelParams,
      linkingResult
    );

    console.info("Redirecting after login", {
      userId: data.user.id,
      redirectUrl,
      channelLinkingAttempted: channelParamResult.hasChannelParams,
      channelLinkingSuccess: linkingResult?.success,
    });

    // Redirect su successo - questo terminerà l'esecuzione
    redirect(redirectUrl);

  } catch (error) {
    // Se l'errore è un redirect, lascialo propagare
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }

    console.error("Login process error", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });

    return {
      message: "Si è verificato un errore inaspettato durante l'accesso. Riprova.",
      errors: [{ field: "server", message: "Errore del server" }],
      success: false,
    };
  }
}
