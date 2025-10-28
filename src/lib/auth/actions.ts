"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/server";
import {
  createStripeCustomer,
  waitForCustomerSync,
  linkCustomerToUser,
  debugCheckCustomerExists,
  createSubscriptionWithTrial,
} from "@/lib/stripe";
import { updateUserData, linkChannelToUserSecure, validateChannelLinkNonce } from "@/lib/queries/user";
import { checkUserExists } from "@/lib/queries/user-existence";
import { ChannelLinkingService } from "@/lib/services/channel-linking";
import { buildLoginRedirectUrl, buildSignupCompleteRedirectUrl } from "@/lib/utils/redirect-helpers";
import {
  type FormState,
  type EnhancedSignupFormData,
  validateEnhancedSignupFormData,
  createErrorFormState,
  SIGNUP_CONFIG,
} from "./types";

/**
 * Prevents duplicate account creation by checking if user already exists
 * @param email - Email to check for existing account
 * @returns Promise<boolean> - True if account creation should be prevented
 */
async function preventDuplicateAccount(email: string): Promise<boolean> {
  try {
    const userExists = await checkUserExists(email);
    
    if (userExists) {
      console.warn("DUPLICATE_ACCOUNT_ATTEMPT:", {
        email: email.substring(0, 3) + "***", // Privacy-safe logging
        timestamp: new Date().toISOString(),
      });
      
      return true; // Prevent account creation
    }
    
    return false; // Allow account creation
  } catch (error) {
    console.error("PREVENT_DUPLICATE_ACCOUNT_ERROR:", {
      error: error instanceof Error ? error.message : "Unknown error",
      email: email.substring(0, 3) + "***", // Privacy-safe logging
    });
    
    // On error, allow account creation to avoid blocking legitimate users
    return false;
  }
}

/**
 * Handles existing user signup attempt by redirecting to login with preserved parameters
 * @param formData - Original form data with channel parameters
 * @param email - Email of existing user
 * @returns Never (redirects)
 */
async function handleExistingUserSignup(formData: FormData, email: string): Promise<never> {
  console.info("EXISTING_USER_SIGNUP_REDIRECT:", {
    email: email.substring(0, 3) + "***", // Privacy-safe logging
    timestamp: new Date().toISOString(),
  });

  // Extract channel parameters to preserve them
  const channel = formData.get("channel")?.toString();
  const link = formData.get("link")?.toString();
  
  // Extract locale from form data or use default
  const locale = formData.get("locale")?.toString() || "en";
  
  // Build login redirect URL with preserved parameters and user message
  const redirectUrl = buildLoginRedirectUrl({
    channel,
    link,
    message: "account_exists", // Message to show on login page
  }, locale);

  console.info("Redirecting existing user to login", {
    hasChannelParams: Boolean(channel && link),
    locale,
  });

  // Use redirect - this will throw a special exception that Next.js handles
  // Don't wrap in try-catch as it will interfere with the redirect mechanism
  redirect(redirectUrl);
}

/**
 * Determines the post-signup flow based on channel linking results
 * @param hasChannelParams - Whether channel parameters were provided
 * @param channelLinkingResult - Result of channel linking attempt
 * @param userId - ID of newly created user
 * @returns Object with redirect path and onboarding decision
 */
function determinePostSignupFlow(
  hasChannelParams: boolean,
  channelLinkingResult: { success: boolean; error?: string } | null,
  userId: string
): { redirectPath: string; skipOnboarding: boolean; preserveParams: boolean } {
  const channelLinkingService = ChannelLinkingService.getInstance();
  
  // Use the service to determine the optimal strategy
  const strategy = channelLinkingService.determineLinkingStrategy(
    'new_user',
    hasChannelParams,
    channelLinkingResult ? {
      success: channelLinkingResult.success,
      error: channelLinkingResult.error,
      isAlreadyLinked: false,
      requiresManualSetup: !channelLinkingResult.success,
    } : undefined
  );

  console.info("POST_SIGNUP_FLOW_DETERMINED:", {
    userId,
    hasChannelParams,
    channelLinkingSuccess: channelLinkingResult?.success,
    strategy: {
      skipOnboarding: strategy.skipOnboarding,
      redirectPath: strategy.redirectPath,
    },
  });

  return {
    redirectPath: strategy.redirectPath,
    skipOnboarding: strategy.skipOnboarding,
    preserveParams: true, // Always preserve params for error handling
  };
}



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
 * @param _prevState - Stato precedente del form (non utilizzato ma richiesto da useFormState)
 * @param formData - Dati del form di signup
 * @returns Promise<FormState> - Stato aggiornato del form o redirect su successo
 */
export async function signUp(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    // Step 1: Enhanced validation with channel linking parameters
    console.info("Starting enhanced signup process", {
      timestamp: new Date().toISOString(),
    });

    const validation = validateEnhancedSignupFormData(formData);
    
    if (!validation.isValid) {
      console.warn("Enhanced signup validation failed", {
        errors: validation.errors,
      });
      
      return createErrorFormState(
        "Dati del form non validi",
        validation.errors
      );
    }

    const { email, password, channel, link, userExistsOverride }: EnhancedSignupFormData = validation.data!;

    // Step 2: Check for existing user (unless override is set)
    if (!userExistsOverride) {
      const shouldPreventDuplicate = await preventDuplicateAccount(email);
      
      if (shouldPreventDuplicate) {
        // Redirect to login with preserved parameters instead of returning error
        await handleExistingUserSignup(formData, email);
        // This function never returns (redirects), but TypeScript needs this
        return createErrorFormState("Redirecting to login...");
      }
    }

    console.info("Form validation passed", {
      email,
    });

    // Step 2: Creazione utente Supabase con supabase.auth.signUp()
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
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

    // Persist attribution for analytics (chat vs website)
    // Use service-role client to avoid RLS/session timing issues right after signUp
    try {
      const signupSource = channel && link ? 'chat' : 'website'
      const { createServiceRoleClient } = await import('@/lib/db/server')
      const svc = createServiceRoleClient()
      const { error: srcErr } = await svc
        .from('users')
        .update({ signup_source: signupSource })
        .eq('id', user.id)

      if (srcErr) {
        console.warn('Failed to set signup_source (service role)', {
          userId: user.id,
          signupSource,
          error: typeof srcErr === 'object' && srcErr && 'message' in srcErr ? srcErr.message : String(srcErr),
        })
      } else {
        console.info('User signup_source set', { userId: user.id, signupSource })
      }
    } catch (e) {
      console.warn('Failed to set signup_source (exception)', { error: e instanceof Error ? e.message : e })
    }

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

        // Automatically create a Stripe subscription to activate trial (if configured)
        const trialPriceId = process.env.DEFAULT_TRIAL_PRICE_ID;
        const trialDays = process.env.DEFAULT_TRIAL_DAYS
          ? parseInt(process.env.DEFAULT_TRIAL_DAYS, 10)
          : undefined;

        if (trialPriceId) {
          try {
            const idempotencyKey = `signup-sub-${user.id}-${Date.now()}`;
            const subscription = await createSubscriptionWithTrial({
              customerId: stripeCustomer.id,
              priceId: trialPriceId,
              userId: user.id,
              trialPeriodDays: trialDays,
              idempotencyKey,
            });
            console.info("Created Stripe subscription for trial during signup", {
              userId: user.id,
              subscriptionId: subscription.id,
            });
          } catch (err) {
            console.error("Failed to create Stripe subscription during signup", {
              error: err instanceof Error ? err.message : err,
              userId: user.id,
            });
            // don't block signup; webhook or reconciliation can handle later
          }
        } else {
          console.info("DEFAULT_TRIAL_PRICE_ID not set; skipping automatic subscription creation");
        }
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
 
    // Step 8: Enhanced channel linking with post-signup flow determination
    let channelLinkingResult: { success: boolean; error?: string } | null = null;
    const hasChannelParams = !!(channel && link);
    
    if (hasChannelParams) {
      try {
        // Validate channel link nonce
        const { isValid } = await validateChannelLinkNonce(link, channel);
        
        if (!isValid) {
          console.warn("INVALID_CHANNEL_LINK_ATTEMPT:", {
            userId: user.id,
            channel: channel.substring(0, 8) + "...",
            nonce: link.substring(0, 8) + "...",
          });
          
          channelLinkingResult = {
            success: false,
            error: "Invalid or expired channel link"
          };
        } else {
          // Attempt secure channel linking
          await linkChannelToUserSecure(user.id, channel, link);
          console.info("Channel linked successfully during signup", {
            userId: user.id,
            channel: channel.substring(0, 8) + "...",
          });
          
          channelLinkingResult = { success: true };
        }
      } catch (error) {
        console.error("CHANNEL_LINK_ERROR_DURING_SIGNUP:", {
          error: error instanceof Error ? error.message : error,
          userId: user.id,
          channel: channel?.substring(0, 8) + "...",
        });
        
        channelLinkingResult = {
          success: false,
          error: error instanceof Error ? error.message : "Channel linking failed"
        };
      }
    }

    // Step 9: Determine post-signup flow based on channel linking results
    const postSignupFlow = determinePostSignupFlow(hasChannelParams, channelLinkingResult, user.id);
    
    console.info("Enhanced signup process completed successfully", {
      userId: user.id,
      email,
      hasChannelParams,
      channelLinkingSuccess: channelLinkingResult?.success,
      skipOnboarding: postSignupFlow.skipOnboarding,
      redirectPath: postSignupFlow.redirectPath,
      timestamp: new Date().toISOString(),
    });

    // Build appropriate redirect URL based on flow determination
    let finalRedirectUrl: string;
    
    if (postSignupFlow.redirectPath === '/dashboard') {
      // Skip onboarding - redirect to dashboard with success message
      finalRedirectUrl = buildSignupCompleteRedirectUrl({
        channel,
        link,
        skipOnboarding: 'true',
        channelLinked: channelLinkingResult?.success ? 'true' : 'false',
      }, {
        skipOnboarding: true,
        channelLinkingError: !channelLinkingResult?.success,
        fallbackOptions: !!channelLinkingResult?.error,
      });
    } else {
      // Normal onboarding flow - redirect to signup complete
      finalRedirectUrl = buildSignupCompleteRedirectUrl({
        channel,
        link,
        channelLinked: channelLinkingResult?.success ? 'true' : 'false',
      }, {
        skipOnboarding: false,
        channelLinkingError: !channelLinkingResult?.success,
        fallbackOptions: !!channelLinkingResult?.error,
      });
    }

    console.info("Redirecting to post-signup flow", {
      userId: user.id,
      redirectUrl: finalRedirectUrl.replace(/[?&](link|channel)=[^&]*/g, '[PARAM_HIDDEN]'), // Hide sensitive params in logs
    });

    // Redirect to determined path - this will throw and prevent return
    redirect(finalRedirectUrl);

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
