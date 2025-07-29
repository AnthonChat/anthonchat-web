"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { apiLogger } from "@/lib/logging/loggers";
import { createStripeCustomer, waitForCustomerSync, linkCustomerToUser, debugCheckCustomerExists } from "@/lib/stripe";
import { updateUserData } from "@/lib/queries";

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return redirect("/login?message=Could not authenticate user");
  }

  return redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
    },
  });

  if (authError) {
    apiLogger.error("AUTH_SIGNUP_ERROR", new Error("AUTH"), { authError, email });
    return redirect(`/signup?message=${authError.message}`);
  }

  const user = authData.user;

  if (!user) {
    return redirect("/signup?message=User not created after signup");
  }

  // Create Stripe customer for the new user
  try {
    const stripeCustomer = await createStripeCustomer(email);
    
    apiLogger.info("Stripe customer created", "STRIPE_CUSTOMER_CREATE", { 
      userId: user.id, 
      customerId: stripeCustomer.id,
      email 
    });
    
    // Wait for the webhook to sync the customer to the local database
    const customerSynced = await waitForCustomerSync(stripeCustomer.id, 15000); // Wait up to 15 seconds
    
    if (customerSynced) {
      // Update the user record with the Stripe customer ID
      await updateUserData(user.id, {
        stripe_customer_id: stripeCustomer.id
      });
      
      apiLogger.info("User updated with Stripe customer ID", "USER_STRIPE_UPDATE", { 
        userId: user.id, 
        customerId: stripeCustomer.id 
      });
    } else {
      // Customer wasn't synced in time, try to check if it exists and link it anyway
      apiLogger.warn("Stripe customer sync timeout, attempting fallback linking", "STRIPE_CUSTOMER_SYNC_TIMEOUT", { 
        userId: user.id, 
        customerId: stripeCustomer.id,
        email 
      });
      
      // Debug: Check if customer actually exists in database
      const customerData = await debugCheckCustomerExists(stripeCustomer.id);
      
      if (customerData) {
        // Customer exists, try to link it
        const linked = await linkCustomerToUser(user.id, stripeCustomer.id);
        if (linked) {
          apiLogger.info("Successfully linked customer after timeout", "STRIPE_CUSTOMER_FALLBACK_SUCCESS", { 
            userId: user.id, 
            customerId: stripeCustomer.id 
          });
        } else {
          apiLogger.error("Failed to link existing customer", new Error("STRIPE_CUSTOMER_FALLBACK_FAILED"), { 
            userId: user.id, 
            customerId: stripeCustomer.id 
          });
        }
      } else {
        // Customer really doesn't exist yet
        apiLogger.warn("Customer not found in database, will need manual linking later", "STRIPE_CUSTOMER_NOT_SYNCED", { 
          userId: user.id, 
          customerId: stripeCustomer.id,
          email 
        });
      }
    }
  } catch (error) {
    // Log the error but don't block the signup process
    apiLogger.error("Failed to create Stripe customer", new Error("STRIPE_CUSTOMER_CREATE_ERROR"), { 
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: user.id,
      email 
    });
  }

  // Basic user record is created by the database trigger
  // Redirect to completion page for profile and channel setup
  return redirect("/signup/complete");
}
