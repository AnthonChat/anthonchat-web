"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Header,
  Hero,
  ChatDemo,
  Stats,
  Features,
  ProblemSolution,
  HowItWorks,
  WhyItWorks,
  TargetAudience,
  Testimonials,
  FAQ,
  CTA,
  Footer,
} from "@/components/features/marketing";

export default function Home() {
  const t = useTranslations("marketing");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted text-foreground">
      {/* Sticky Header */}
      <Header />

      {/* Hero Section */}
      <Hero />

      {/* Chat Demo */}
      <ChatDemo />

      {/* Big Claim 1 */}
      <section className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="py-12 md:py-20 text-center"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight whitespace-pre-line">
            {t("claims.1")}
          </h2>
        </motion.div>
      </section>

      {/* Stats Section */}
      <Stats />

      {/* Features Section */}
      <Features />

      {/* Problem/Solution Section */}
      <ProblemSolution />

      {/* Target Audience */}
      <TargetAudience />

      {/* How It Works */}
      <HowItWorks />

      {/* Why It Works */}
      <WhyItWorks />

      {/* Testimonials */}
      <Testimonials />

      {/* FAQ */}
      <FAQ />

      {/* Final CTA */}
      <CTA />

      {/* Footer */}
      <Footer />
    </div>
  );
}
