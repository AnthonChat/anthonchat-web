import { createClient } from "@/utils/supabase/server";
import { NextStripePricingTable } from "@/components/pricing/PricingTable";
import {getUserData} from "@/lib/queries/user";

export default async function PricingPage() {
	const supabase = await createClient();
  
	// Check if user is authenticated
	const {
    data: { user },
	} = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  const stripe_customer_id = (await getUserData(user.id)).stripe_customer_id;

	return (
		<div className="min-h-screen bg-primary">
			<div className="container mx-auto px-4 py-8">
				<div className="text-center mb-8">
					<h1 className="text-4xl text-background font-bold tracking-tight mb-4">
						Pricing Plans
					</h1>
					<p className="text-xl text-muded max-w-3xl mx-auto">
						Choose the perfect plan for your messaging automation
						needs. Start with our free trial and scale as you grow.
					</p>
				</div>

				<NextStripePricingTable
					pricingTableId="prctbl_1RlJNHQH21dH2pp37YW5c1Gi"
					publishableKey="pk_test_51RgVpKQH21dH2pp3NiZPd7t0JeaRTmjdDwaqEI47WMD1bCgBkweipsDbl1UTReNjBvYro2jnyWqkmqmwkq8TNwCo00o850zQq4"
					clientReferenceId={stripe_customer_id || undefined}
				/>
			</div>
		</div>
	);
}
