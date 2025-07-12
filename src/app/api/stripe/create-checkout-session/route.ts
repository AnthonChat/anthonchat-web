import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createCheckoutSession } from '@/lib/stripe/subscriptions'

export async function POST(request: NextRequest) {
  try {
    const { tierSlug } = await request.json()
    
    if (!tierSlug) {
      return NextResponse.json(
        { error: 'Tier slug is required' },
        { status: 400 }
      )
    }
    
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Create checkout session
    const session = await createCheckoutSession({
      userId: user.id,
      tierSlug,
      successUrl: `${request.nextUrl.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${request.nextUrl.origin}/dashboard?canceled=true`,
    })
    
    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}