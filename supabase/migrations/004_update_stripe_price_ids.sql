-- Update tiers with real Stripe price IDs
-- Generated from setup-stripe-products.js script

UPDATE public.tiers SET stripe_price_id = 'price_1Rk7GGQH21dH2pp3kspgNYXS' WHERE slug = 'basic';
UPDATE public.tiers SET stripe_price_id = 'price_1Rk7GHQH21dH2pp32TV497AR' WHERE slug = 'standard';
UPDATE public.tiers SET stripe_price_id = 'price_1Rk7GIQH21dH2pp3tWUoyu6Q' WHERE slug = 'pro';

-- Verify the updates
SELECT slug, name, stripe_price_id FROM public.tiers WHERE slug IN ('basic', 'standard', 'pro');