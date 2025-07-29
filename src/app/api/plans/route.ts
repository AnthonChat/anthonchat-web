import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { apiLogger } from '@/lib/logging/loggers'

interface Product {
  id: string;
  active: boolean;
  name: string | null;
  description: string | null;
  metadata: Record<string, string> | null;
}

interface Price {
  id: string;
  product_id: string;
  active: boolean;
  unit_amount: number | null;
  currency: string | null;
  type: 'one_time' | 'recurring';
  recurring: {
    interval: 'day' | 'week' | 'month' | 'year';
    interval_count: number;
  } | null;
  trial_period_days: number | null;
  metadata: Record<string, string> | null;
}

type SubscriptionPlan = Product & {
  prices: Price[];
};

async function getAvailablePlansServer(): Promise<SubscriptionPlan[]> {
  const supabase = await createClient();

  // 1. Fetch all active, recurring prices
  const { data: prices, error: pricesError } = await supabase
    .schema('stripe')
    .from('prices')
    .select('*')
    .eq('active', true)
    .eq('type', 'recurring');

  if (pricesError) {
    apiLogger.error('PRICES_FETCH_ERROR', new Error('API_PLANS'), { error: pricesError });
    return [];
  }

  if (!prices || prices.length === 0) {
    return [];
  }

  // 2. Collect all unique product IDs from the prices
  const productIds = [...new Set(prices.map(price => price.product).filter(Boolean))];

  if (productIds.length === 0) {
    return [];
  }

  // 3. Fetch all active products associated with those prices
  const { data: products, error: productsError } = await supabase
    .schema('stripe')
    .from('products')
    .select('*')
    .in('id', productIds as string[])
    .eq('active', true)
    .order('metadata->>order', { ascending: true });

  if (productsError) {
    apiLogger.error('PRODUCTS_FETCH_ERROR', new Error('API_PLANS'), { error: productsError });
    return [];
  }

  if (!products) {
    return [];
  }

  // 4. Map products and prices together
  const plans: SubscriptionPlan[] = products.map(product => {
    const productPrices = prices.filter(price => price.product === product.id);
    return {
      ...product,
      prices: productPrices,
    };
  });

  return plans;
}

export async function GET() {
  try {
    const plans = await getAvailablePlansServer()
    return NextResponse.json(plans)
  } catch (error) {
    apiLogger.error('PLANS_API_ERROR', new Error('API_PLANS'), { error })
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    )
  }
}