import { StripeSync } from "@supabase/stripe-sync-engine";

const sync = new StripeSync({
	databaseUrl:
		"postgresql://postgres.vyzvdvghlhztxpvysbor:fux5WKzLvulAKoul@aws-0-eu-central-1.pooler.supabase.com:5432/postgres",
	stripeSecretKey:
		"sk_test_51RgVpKQH21dH2pp3ENw5w6YbiYirqKi7EoP7voyDDdJ4aUqd7Gc5uzVFMc6QlKFavxXVQbqBU0Fwb9t1Sl1woYh100iEcOGfAI",
	stripeWebhookSecret:
		"whsec_341eb1b603fb1da3e3b5572890f5a73cb8d7ba19d0e38ab1b6ef00e282747444",
	logger: console,
	backfillRelatedEntities: true,
	revalidateEntityViaStripeApi: true,
	autoExpandLists: true,
	schema: "stripe",
	stripeApiVersion: "2025-06-30.basil",
});

// await sync.syncBackfill({
// 	object: "product",
// });

// await sync.syncBackfill({
// 	object: "customer",
// });


// await sync.syncBackfill({
// 	object: "price",
// });


// await sync.syncBackfill({
// 	object: "subscription",
// });

await sync.syncBackfill({
	object: "all",
});