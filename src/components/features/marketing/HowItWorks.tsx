"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  MousePointer,
  Upload,
  MessageSquare,
  BarChart3,
  LucideIcon,
} from "lucide-react";

const stepIcons: LucideIcon[] = [
  MousePointer,
  Upload,
  MessageSquare,
  BarChart3,
];

export function HowItWorks() {
  const t = useTranslations("marketing");

  return (
    <section
      id="how-it-works"
      className="py-16 md:py-24 bg-muted/30 scroll-mt-20"
    >
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight">
            <span className="text-primary">📲 </span>
            {t("how.title")}
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            {t("howSteps.subtitle")}
          </p>
        </motion.div>

        {/* Steps */}
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Connecting Line */}
            <div className="absolute left-[27px] md:left-1/2 top-0 bottom-0 w-0.5 bg-border md:-translate-x-0.5 hidden sm:block" />

            {["1", "2", "3", "4"].map((num, idx) => (
              <motion.div
                key={num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className={`relative flex items-start gap-6 mb-8 last:mb-0 ${
                  idx % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Step Number & Icon */}
                {(() => {
                  const Icon = stepIcons[idx];
                  return (
                    <div className="relative z-10 shrink-0">
                      <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background border-2 border-primary text-primary text-xs font-bold flex items-center justify-center">
                        {num}
                      </div>
                    </div>
                  );
                })()}

                {/* Content Card */}
                <div
                  className={`flex-1 rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow ${
                    idx % 2 === 1 ? "md:text-right" : ""
                  }`}
                >
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {t("howSteps.step", { num })}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t(`how.steps.${num}`)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
