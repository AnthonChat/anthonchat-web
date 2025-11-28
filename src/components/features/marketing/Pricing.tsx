"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Pricing = () => {
	const t = useTranslations("marketing.cost");
	const [isYearly, setIsYearly] = useState(false);

	const plans = [
		{
			key: "basic",
			popular: true,
			active: true,
		},
		{
			key: "pro",
			popular: false,
			active: false,
		},
		{
			key: "team",
			popular: false,
			active: false,
		},
	];

	return (
		<section className="py-24 bg-background relative overflow-hidden">
			<div className="container px-4 md:px-6 mx-auto relative z-10">
				<div className="text-center max-w-3xl mx-auto mb-12">
					<motion.h2
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">
						{t("title")}
					</motion.h2>
					<motion.p
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ delay: 0.1 }}
						className="text-xl text-muted-foreground mb-8">
						{t("subtitle")}
					</motion.p>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ delay: 0.15 }}
						className="flex items-center justify-center space-x-4 mb-8">
						<Label
							htmlFor="billing-mode"
							className={`text-sm font-medium cursor-pointer ${
								!isYearly
									? "text-foreground"
									: "text-muted-foreground"
							}`}>
							{t("toggle.monthly")}
						</Label>
						<Switch
							id="billing-mode"
							checked={isYearly}
							onCheckedChange={setIsYearly}
						/>
						<Label
							htmlFor="billing-mode"
							className={`text-sm font-medium cursor-pointer ${
								isYearly
									? "text-foreground"
									: "text-muted-foreground"
							}`}>
							{t("toggle.yearly")}
							<span className="ml-2 inline-block bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
								{t("toggle.save")}
							</span>
						</Label>
					</motion.div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
					{plans.map((plan, index) => (
						<motion.div
							key={plan.key}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: index * 0.1 + 0.3 }}>
							<Card
								className={`relative h-full flex flex-col ${
									plan.popular
										? "border-primary shadow-lg scale-105 z-10"
										: "border-border"
								} ${!plan.active ? "opacity-80" : ""}`}>
								{plan.popular && (
									<div className="absolute -top-4 left-0 right-0 flex justify-center">
										<Badge className="bg-primary text-primary-foreground hover:bg-primary">
											Most Popular
										</Badge>
									</div>
								)}
								{!plan.active && (
									<div className="absolute top-4 right-4">
										<Badge variant="secondary">
											{t(`plans.${plan.key}.badge`)}
										</Badge>
									</div>
								)}

								<CardHeader>
									<CardTitle className="text-2xl">
										{t(`plans.${plan.key}.name`)}
									</CardTitle>
									<div className="mt-4 flex items-baseline text-5xl font-extrabold tracking-tight">
										{plan.active ? (
											<>
												{t(
													`plans.${plan.key}.price.${
														isYearly
															? "yearly"
															: "monthly"
													}`
												)}
												<span className="ml-1 text-xl font-medium text-muted-foreground tracking-normal">
													{t(
														`plans.${
															plan.key
														}.period.${
															isYearly
																? "yearly"
																: "monthly"
														}`
													)}
												</span>
											</>
										) : (
											<span className="text-3xl text-muted-foreground">
												{t(`plans.${plan.key}.badge`)}
											</span>
										)}
									</div>
									<CardDescription className="mt-4 text-base">
										{t(`plans.${plan.key}.description`)}
									</CardDescription>
								</CardHeader>

								<CardContent className="flex-1">
									<ul className="space-y-4">
										{[1, 2, 3, 4, 5].map((featureIndex) => {
											const featureKey = `plans.${plan.key}.features.${featureIndex}`;

											let count = 5;
											if (plan.key === "basic") count = 4;

											if (featureIndex > count)
												return null;

											return (
												<li
													key={featureIndex}
													className="flex items-start">
													<Check className="h-5 w-5 text-primary shrink-0 mr-2" />
													<span className="text-muted-foreground text-sm">
														{t(featureKey)}
													</span>
												</li>
											);
										})}
									</ul>
								</CardContent>

								<CardFooter>
									<Button
										className="w-full"
										variant={
											plan.active ? "default" : "outline"
										}
										disabled={!plan.active}
										asChild={plan.active}>
										{plan.active ? (
											<Link href="/auth/signup">
												{t(`plans.${plan.key}.cta`)}
											</Link>
										) : (
											<span>
												{t(`plans.${plan.key}.cta`)}
											</span>
										)}
									</Button>
								</CardFooter>
							</Card>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
};
