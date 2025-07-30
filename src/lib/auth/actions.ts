"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/server";
import {
  createStripeCustomer,
  waitForCustomerSync,
  linkCustomerToUser,
  debugCheckCustomerExists,
} from "@/lib/stripe";
import { updateUserData } from "@/lib/queries/user";
import {
  type FormState,
  type SignupFormData,
  validateSignupFormData,
  createErrorFormState,
  SIGNUP_CONFIG,
} from "./types";

/**
 * Server Action consolidata per il processo di signup utente
 * 
 * Implementa l'intero flusso di registrazione:
 * 1. Validazione dati form
 * 2. Creazione utente Supabase Auth
 * 3. Creazione customer Stripe
 * 4. Sincronizzazione database via webhooks
 * 5. Fallback linking se sync fallisce
 * 6. Update user data con Stripe customer ID
 * 
 * @param prevState - Stato precedente del form (non utilizzato ma richiesto da useFormState)
 * @param formData - Dati del form di signup
 * @returns Promise<FormState> - Stato aggiornato del form o redirect su successo
 */
export async function signUp(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    // Step 1: Validazione FormData con tipi TypeScript
    console.info("Starting signup process", {
      timestamp: new Date().toISOString(),
    });

    const validation = validateSignupFormData(formData);
    
    if (!validation.isValid) {
      console.warn("Signup validation failed", {
        errors: validation.errors,
      });
      
      return createErrorFormState(
        "Dati del form non validi",
        validation.errors
      );
    }

    const { email, password }: SignupFormData = validation.data!;

    console.info("Form validation passed", {
      email,
    });

    // Step 2: Creazione utente Supabase con supabase.auth.signUp()
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: SIGNUP_CONFIG.EMAIL_REDIRECT,
      },
    });
      
    if (authError) {
      console.error("AUTH_SIGNUP_ERROR", {
        authError: authError.message,
        email
      });
      
      return createErrorFormState(
        authError.message || "Errore durante la creazione dell'account"
      );
    }

    const user = authData.user;

    if (!user) {
      console.error("User not created after signup", { email });
      
      return createErrorFormState(
        "Errore interno: utente non creato"
      );
    }

    console.info("Supabase user created successfully", {
      userId: user.id,
      email,
    });

    // Step 3: Creazione customer Stripe con createStripeCustomer()
    try {
      const stripeCustomer = await createStripeCustomer(email);

      console.info("Stripe customer created", {
        userId: user.id,
        customerId: stripeCustomer.id,
        email,
      });

      // Step 4: Sincronizzazione database con waitForCustomerSync()
      const customerSynced = await waitForCustomerSync(
        stripeCustomer.id,
        SIGNUP_CONFIG.STRIPE_SYNC_TIMEOUT
      );

      if (customerSynced) {
        // Step 5: Update user data con updateUserData()
        await updateUserData(user.id, {
          stripe_customer_id: stripeCustomer.id,
        });

        console.info(
          "User updated with Stripe customer ID",
          {
            userId: user.id,
            customerId: stripeCustomer.id,
          }
        );
      } else {
        // Step 6: Linking fallback con linkCustomerToUser() se sync fallisce
        console.warn(
          "Stripe customer sync timeout, attempting fallback linking",
          {
            userId: user.id,
            customerId: stripeCustomer.id,
            email,
          }
        );

        const customerData = await debugCheckCustomerExists(stripeCustomer.id);

        if (customerData) {
          const linked = await linkCustomerToUser(user.id, stripeCustomer.id);
          
          if (linked) {
            console.info(
              "Successfully linked customer after timeout",
              {
                userId: user.id,
                customerId: stripeCustomer.id,
              }
            );
          } else {
            console.error(
              "Failed to link existing customer",
              {
                userId: user.id,
                customerId: stripeCustomer.id,
              }
            );
          }
        } else {
          console.warn(
            "Customer not found in database, will need manual linking later",
            {
              userId: user.id,
              customerId: stripeCustomer.id,
              email,
            }
          );
        }
      }
    } catch (stripeError) {
      // Step 7: Logging strutturato
      // Log the error but don't block the signup process
      console.error(
        "Failed to create Stripe customer",
        {
          error: stripeError instanceof Error ? stripeError.message : "Unknown error",
          userId: user.id,
          email,
        }
      );
    }
 
    // Step 8: Su success finale, chiamare redirect('/signup/complete')
    console.info("Signup process completed successfully", {
      userId: user.id,
      email,
      timestamp: new Date().toISOString(),
    });

    // Redirect to completion page - this will throw and prevent return
    redirect(SIGNUP_CONFIG.COMPLETION_REDIRECT);

  } catch (error) {
    // Step 9: Gestione errori robusta che ritorna FormState (non throws)
    
    // Se l'errore è un redirect, lascialo propagare
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }

    console.error("Signup process error", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });

    return createErrorFormState(
      "Si è verificato un errore inaspettato durante la registrazione. Riprova."
    );
  }
}
