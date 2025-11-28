"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQ() {
  const t = useTranslations("marketing");

  const faqs = [
    {
      id: "1",
      question: t("faq.items.1.question"),
      answer: t("faq.items.1.answer"),
    },
    {
      id: "2",
      question: t("faq.items.2.question"),
      answer: t("faq.items.2.answer"),
    },
    {
      id: "3",
      question: t("faq.items.3.question"),
      answer: t("faq.items.3.answer"),
    },
    {
      id: "4",
      question: t("faq.items.4.question"),
      answer: t("faq.items.4.answer"),
    },
    {
      id: "5",
      question: t("faq.items.5.question"),
      answer: t("faq.items.5.answer"),
    },
    {
      id: "6",
      question: t("faq.items.6.question"),
      answer: t("faq.items.6.answer"),
    },
  ];

  return (
    <section id="faq" className="py-16 md:py-24 scroll-mt-20">
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
            {t("faq.title")}
          </h2>
          <p className="mt-3 text-muted-foreground text-lg">
            {t("faq.subtitle")}
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, idx) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
              >
                <AccordionItem
                  value={faq.id}
                  className="border border-border rounded-xl px-6 bg-card data-[state=open]:border-primary/30 data-[state=open]:bg-primary/5 transition-colors"
                >
                  <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
