"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/server";
import type { FormState } from "@/lib/auth/types";
import { getPathWithLocale, type Locale, defaultLocale } from "@/i18n/routing";
import { headers } from "next/headers";

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
 * Server Action originale per il login (manteniamo per compatibilità)
 */
export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();
  const locale = await getCurrentLocale();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return redirect(getPathWithLocale("/login?message=Could not authenticate user", locale));
  }

  return redirect(getPathWithLocale("/dashboard", locale));
}

/**
 * Server Action migliorata per il login con FormState
 * Compatibile con useActionState e sistema di toast
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
    console.info("Starting login process", {
      timestamp: new Date().toISOString(),
    });

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

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

    console.info("Form validation passed", {
      email,
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

    // Redirect su successo - questo terminerà l'esecuzione
    const locale = await getCurrentLocale();
    redirect(getPathWithLocale("/dashboard", locale));

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
