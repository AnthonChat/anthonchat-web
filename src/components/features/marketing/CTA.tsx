"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { LocaleLink } from "@/components/ui/locale-link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTA() {
	const t = useTranslations("marketing");

	return (
		<section className="py-16 md:py-24">
			<div className="container mx-auto px-4">
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					whileInView={{ opacity: 1, scale: 1 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="relative overflow-hidden rounded-3xl bg-primary p-8 md:p-16 text-center">
					{/* Background decorations */}
					<div className="absolute inset-0 -z-0">
						<div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
						<div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
					</div>

					<div className="relative z-10">
						{/* Urgency Badge */}

						<h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-primary-foreground uppercase tracking-tight">
							{t("cta.title")}
						</h2>

						<p className="mt-4 text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
							{t("cta.subtitle")}
						</p>

						<motion.div
							initial={{ opacity: 0, y: 10 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: 0.3 }}
							className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
							<LocaleLink href="/signup">
								<Button
									size="lg"
									variant="secondary"
									className="hover-lift text-lg px-8 py-6 group">
									🚀 {t("cta.button")}
									<ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
								</Button>
							</LocaleLink>
							<LocaleLink href="/pricing">
								<Button
									size="lg"
									variant="outline"
									className="text-lg px-8 py-6 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
									{t("cta.viewPricing")}
								</Button>
							</LocaleLink>
						</motion.div>

						{/* Trust indicators */}
						<div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-primary-foreground/70">
							<div className="flex items-center gap-2">
								<svg
									className="w-4 h-4"
									fill="currentColor"
									viewBox="0 0 20 20">
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clipRule="evenodd"
									/>
								</svg>
								<span>{t("hero.trust.freeTrial")}</span>
							</div>
							<div className="flex items-center gap-2">
								<svg
									className="w-4 h-4"
									fill="currentColor"
									viewBox="0 0 20 20">
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clipRule="evenodd"
									/>
								</svg>
								<span>{t("hero.trust.noCard")}</span>
							</div>
							<div className="flex items-center gap-2">
								<svg
									className="w-4 h-4"
									fill="currentColor"
									viewBox="0 0 20 20">
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clipRule="evenodd"
									/>
								</svg>
								<span>{t("hero.trust.cancelAnytime")}</span>
							</div>
						</div>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
