import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { apiLogger } from "@/lib/utils/loggers";
import { createStripeCustomer, waitForCustomerSync, linkCustomerToUser, debugCheckCustomerExists } from "@/lib/stripe";
import { updateUserData } from "@/lib/queries/user";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
      },
    });

    if (authError) {
      apiLogger.error("AUTH_SIGNUP_ERROR", "AUTH", { authError, email });
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    const user = authData.user;

    if (!user) {
      return NextResponse.json(
        { error: "User not created after signup" },
        { status: 500 }
      );
    }

    // Step 2: Create Stripe customer
    try {
      const stripeCustomer = await createStripeCustomer(email);
      
      apiLogger.info("Stripe customer created", "STRIPE_CUSTOMER_CREATE", { 
        userId: user.id, 
        customerId: stripeCustomer.id,
        email 
      });
      
      // Step 3: Wait for webhook sync (with longer timeout for better UX)
      const customerSynced = await waitForCustomerSync(stripeCustomer.id, 20000); // 20 seconds
      
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
        // Customer wasn't synced in time, try fallback
        apiLogger.warn("Stripe customer sync timeout, attempting fallback linking", "STRIPE_CUSTOMER_SYNC_TIMEOUT", { 
          userId: user.id, 
          customerId: stripeCustomer.id,
          email 
        });
        
        const customerData = await debugCheckCustomerExists(stripeCustomer.id);
        
        if (customerData) {
          const linked = await linkCustomerToUser(user.id, stripeCustomer.id);
          if (linked) {
            apiLogger.info("Successfully linked customer after timeout", "STRIPE_CUSTOMER_FALLBACK_SUCCESS", { 
              userId: user.id, 
              customerId: stripeCustomer.id 
            });
          } else {
            apiLogger.error("Failed to link existing customer", "STRIPE_CUSTOMER_FALLBACK_FAILED", { 
              userId: user.id, 
              customerId: stripeCustomer.id 
            });
          }
        } else {
          apiLogger.warn("Customer not found in database, will need manual linking later", "STRIPE_CUSTOMER_NOT_SYNCED", { 
            userId: user.id, 
            customerId: stripeCustomer.id,
            email 
          });
        }
      }
    } catch (error) {
      // Log the error but don't block the signup process
      apiLogger.error("Failed to create Stripe customer", "STRIPE_CUSTOMER_CREATE_ERROR", { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: user.id,
        email 
      });
    }

    return NextResponse.json(
      { 
        success: true, 
        message: "Account created successfully",
        userId: user.id 
      },
      { status: 200 }
    );

  } catch (error) {
    apiLogger.error("Signup API error", "SIGNUP_API_ERROR", { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { error: "An unexpected error occurred during signup" },
      { status: 500 }
    );
  }
}