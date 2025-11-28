"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Check, Trophy, TrendingUp } from "lucide-react";

export function WhyItWorks() {
  const t = useTranslations("marketing");

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl border border-border bg-card p-8 md:p-12"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Trophy className="w-6 h-6" />
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-primary uppercase tracking-tight">
                {t("why.title")}
              </h2>
            </div>

            {/* Subtitle */}
            <p className="text-lg text-muted-foreground mb-8">
              {t("why.subtitle")}
            </p>

            {/* Bullets */}
            <ul className="space-y-4 mb-8">
              {["1", "2", "3"].map((num, idx) => (
                <motion.li
                  key={num}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-foreground/90 leading-relaxed">
                    {t(`why.bullets.${num}`)}
                  </span>
                </motion.li>
              ))}
            </ul>

            {/* Conclusion */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="rounded-xl bg-primary/10 p-6 border border-primary/20"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-primary shrink-0" />
                <p className="font-semibold text-foreground">
                  {t("why.conclusion")}
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
