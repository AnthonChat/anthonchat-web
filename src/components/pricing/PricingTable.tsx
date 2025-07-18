"use client"
import Script from "next/script";
import React, { FC } from "react";

declare global {
	interface HTMLElementTagNameMap {
		'stripe-pricing-table': {
			'pricing-table-id': string;
			'publishable-key': string;
			'client-reference-id'?: string;
		};
	}
}

export const NextStripePricingTable: FC<{
	pricingTableId?: string;
	publishableKey?: string;
	clientReferenceId?: string;
}> = ({ pricingTableId, publishableKey, clientReferenceId }) => {
	return (
		<>
			<Script
				async
				strategy="lazyOnload"
				src="https://js.stripe.com/v3/pricing-table.js"
				onLoad={() => {
					console.log("✅ [PricingTable Debug] Script loaded");
				}}
				onError={(error) => {
					console.error(
						"❌ [PricingTable Debug] Script failed to load:",
						error
					);
				}}
			/>

			<div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 rounded-3xl bg-[#faf9f5]">
				{React.createElement("stripe-pricing-table", {
					"pricing-table-id": pricingTableId,
					"publishable-key": publishableKey,
					"client-reference-id": clientReferenceId,
					style: {
						width: "100%",
						minHeight: "600px",
						border: "none",
						backgroundColor: "transparent",
					},
				})}
			</div>
		</>
	);
};
