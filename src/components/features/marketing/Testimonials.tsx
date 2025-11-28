"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";

export function Testimonials() {
  const t = useTranslations("marketing");

  const testimonials = [
    { id: "1", key: "testimonials.1" },
    { id: "2", key: "testimonials.2" },
  ];

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            {t("testimonialsSection.title")}
          </h2>
          <p className="mt-3 text-muted-foreground text-lg">
            {t("testimonialsSection.subtitle")}
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {testimonials.map((testimonial, idx) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              className="relative rounded-2xl border border-border bg-card p-6 md:p-8"
            >
              {/* Quote Icon */}
              <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Quote className="w-5 h-5" />
              </div>

              {/* Content */}
              <div className="pr-12">
                <p className="text-lg text-foreground/90 italic leading-relaxed mb-4">
                  &ldquo;{t(`${testimonial.key}.text`)}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {t(`${testimonial.key}.author`).charAt(2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-primary">
                      {t(`${testimonial.key}.author`)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative border */}
              <div className="absolute left-0 top-6 bottom-6 w-1 bg-primary rounded-r" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
