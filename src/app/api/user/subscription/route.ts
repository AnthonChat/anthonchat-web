import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getUserSubscription } from '@/lib/queries/subscription'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get the authenticated user claims
    const { data: claims, error: authError } = await supabase.auth.getClaims()
    
    if (authError || !claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user subscription
    const subscription = await getUserSubscription(claims.claims.sub)
    
    return NextResponse.json({ subscription })
  } catch (error) {
    console.error('Error fetching user subscription:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}