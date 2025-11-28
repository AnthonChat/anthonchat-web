"use client";

import { Header, Pricing, Footer } from "@/components/features/marketing";

export default function PricingPage() {
	return (
		<div className="min-h-screen bg-background">
			<Header />
			<main className="pt-20">
				<Pricing />
			</main>
			<Footer />
		</div>
	);
}
