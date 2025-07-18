import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Fetch available tiers/plans from the database
    const { data: tiers, error } = await supabase
      .from('tiers')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly')
    
    if (error) {
      console.error('Error fetching tiers:', error)
      return NextResponse.json(
        { error: 'Failed to fetch plans' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ plans: tiers || [] })
  } catch (error) {
    console.error('Plans API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}