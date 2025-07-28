import { runMigrations } from "@supabase/stripe-sync-engine";
(async () => {
	await runMigrations({
		databaseUrl:
			"postgresql://postgres.vyzvdvghlhztxpvysbor:fux5WKzLvulAKoul@aws-0-eu-central-1.pooler.supabase.com:5432/postgres",
		schema: "stripe",
		logger: console,
	});
})();