import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createBillingPortalSession } from '@/lib/stripe'
import { apiLogger } from '@/lib/utils/loggers'
import type { User } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  let userId: string | null = null
  
  try {
    const supabase = await createClient()
    
    // Get authenticated user claims
    const { data: claims, error: authError } = await supabase.auth.getClaims()
    userId = claims?.claims.sub || null
    
    if (authError || !claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with Stripe customer ID
    const { data: userProfile } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (!userProfile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found' },
        { status: 400 }
      )
    }

    // Create billing portal session
    const session = await createBillingPortalSession({
      customerId: userProfile.stripe_customer_id,
      returnUrl: `${request.nextUrl.origin}/dashboard/subscription`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    apiLogger.error('Billing Portal Error', 'BILLING_PORTAL_ERROR', { error, userId })
    
    // Check if it's a configuration error
    if (error instanceof Error && error.message.includes('No configuration provided')) {
      return NextResponse.json(
        { 
          error: 'Billing portal not configured',
          message: 'The billing portal needs to be configured in your Stripe dashboard. Please visit https://dashboard.stripe.com/test/settings/billing/portal to set it up.',
          configurationRequired: true
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    )
  }
}