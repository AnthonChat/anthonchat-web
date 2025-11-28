"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { LocaleLink } from "@/components/ui/locale-link";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowRight } from "lucide-react";

export function ChatDemo() {
  const t = useTranslations("marketing");

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-6 sm:p-8 md:p-12"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Chat Mockup */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="rounded-2xl border border-border bg-background shadow-xl overflow-hidden">
                {/* Chat Header */}
                <div className="bg-primary text-primary-foreground px-5 py-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold">ANTHON — Coach AI</div>
                    <div className="text-xs text-primary-foreground/70">
                      Online • Responds instantly
                    </div>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="p-5 space-y-4 min-h-[280px]">
                  {/* User Message */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="flex justify-end"
                  >
                    <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-3 shadow-sm">
                      <div className="text-xs text-primary-foreground/70 mb-1">
                        {t("chat.demo.username")}
                      </div>
                      <p className="text-sm">{t("chat.demo.message")}</p>
                    </div>
                  </motion.div>

                  {/* Bot Response */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 }}
                    className="flex justify-start"
                  >
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3 shadow-sm">
                      <div className="text-xs text-muted-foreground mb-1">
                        Anthon
                      </div>
                      <p className="text-sm whitespace-pre-line text-foreground">
                        {t("chat.demo.reply")}
                      </p>
                    </div>
                  </motion.div>
                </div>

                {/* Input Area */}
                <div className="border-t border-border px-4 py-3">
                  <div className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      Type a message...
                    </span>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-primary/10 rounded-full blur-2xl -z-10" />
            </motion.div>

            {/* Info Panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center lg:text-left"
            >
              <h3 className="text-3xl md:text-4xl font-extrabold text-foreground">
                {t("chat.info.title")}
              </h3>
              <p className="mt-3 text-lg font-semibold text-primary uppercase tracking-wide">
                {t("chat.info.subtitle")}
              </p>

              <ul className="mt-6 space-y-3">
                {["1", "2", "3"].map((num, i) => (
                  <motion.li
                    key={num}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex items-start gap-3 text-muted-foreground"
                  >
                    <svg
                      className="w-5 h-5 text-primary mt-0.5 shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>
                      {t(`chat.info.bullets.${num}`).replace("• ", "")}
                    </span>
                  </motion.li>
                ))}
              </ul>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.7 }}
                className="mt-8"
              >
                <LocaleLink href="/signup">
                  <Button size="lg" className="hover-lift text-lg px-8 group">
                    {t("cta.button")}
                    <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </LocaleLink>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
