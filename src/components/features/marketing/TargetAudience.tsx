"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Users, Target, Building2, Lightbulb, LucideIcon } from "lucide-react";

const targetIcons: LucideIcon[] = [Target, Users, Building2, Lightbulb];

export function TargetAudience() {
  const t = useTranslations("marketing");

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto rounded-3xl border border-border bg-card p-8 md:p-12"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-primary uppercase tracking-tight">
              {t("target.title")}
            </h2>
          </div>

          {/* Audience Cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            {["1", "2", "3", "4"].map((num, idx) => (
              <motion.div
                key={num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-background border border-border hover:border-primary/30 transition-colors"
              >
                {(() => {
                  const Icon = targetIcons[idx];
                  return (
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                  );
                })()}
                <p className="text-foreground/90 leading-relaxed">
                  {t(`target.bullets.${num}`)}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
