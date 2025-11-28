"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { X, Check, Zap } from "lucide-react";

export function ProblemSolution() {
  const t = useTranslations("marketing");

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        {/* Big Claim */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight whitespace-pre-line">
            {t("claims.2")}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Problem */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 md:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-destructive/20 text-destructive flex items-center justify-center">
                <X className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-destructive uppercase">
                {t("autosabotage.title")}
              </h3>
            </div>

            <ul className="space-y-4">
              {["1", "2", "3", "4"].map((num) => (
                <motion.li
                  key={num}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: parseInt(num) * 0.1 }}
                  className="flex items-start gap-3 text-foreground/80"
                >
                  <X className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <span>
                    {t(`autosabotage.bullets.${num}`).replace("✗ ", "")}
                  </span>
                </motion.li>
              ))}
            </ul>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="mt-6 p-4 rounded-lg bg-destructive/10 border-l-4 border-destructive"
            >
              <p className="font-semibold text-foreground">
                👉 {t("autosabotage.conclusion")}
              </p>
            </motion.div>
          </motion.div>

          {/* Solution */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl border border-primary/30 bg-primary/5 p-6 md:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-primary uppercase">
                {t("realtime.title")}
              </h3>
            </div>

            <p className="text-muted-foreground mb-6">
              {t("realtime.subtitle")}
            </p>

            <ul className="space-y-4">
              {["1", "2", "3", "4"].map((num) => (
                <motion.li
                  key={num}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + parseInt(num) * 0.1 }}
                  className="flex items-start gap-3 text-foreground/80"
                >
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>{t(`realtime.bullets.${num}`)}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Big Claim 3 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mt-20"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight whitespace-pre-line text-primary">
            {t("claims.3")}
          </h2>
        </motion.div>
      </div>
    </section>
  );
}
