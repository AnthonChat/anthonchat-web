"use client";

import { useTranslations } from "next-intl";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Users, MessageSquare, Clock, TrendingUp } from "lucide-react";

interface StatItemProps {
  icon: React.ReactNode;
  value: number;
  suffix?: string;
  label: string;
  delay?: number;
}

function StatItem({
  icon,
  value,
  suffix = "",
  label,
  delay = 0,
}: StatItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      const duration = 2000;
      const startTime = Date.now();
      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.floor(easeOut * value));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      const timeout = setTimeout(() => {
        requestAnimationFrame(animate);
      }, delay);

      return () => clearTimeout(timeout);
    }
  }, [isInView, value, delay]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: delay / 1000 }}
      className="text-center"
    >
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-4">
        {icon}
      </div>
      <div className="text-4xl md:text-5xl font-extrabold text-foreground">
        {displayValue.toLocaleString()}
        {suffix}
      </div>
      <div className="mt-2 text-sm text-muted-foreground font-medium uppercase tracking-wider">
        {label}
      </div>
    </motion.div>
  );
}

export function Stats() {
  const t = useTranslations("marketing");

  const stats = [
    {
      icon: <Users className="w-7 h-7" />,
      value: 1000,
      suffix: "+",
      label: t("stats.activeUsers"),
      delay: 0,
    },
    {
      icon: <MessageSquare className="w-7 h-7" />,
      value: 50000,
      suffix: "+",
      label: t("stats.messagesSent"),
      delay: 100,
    },
    {
      icon: <Clock className="w-7 h-7" />,
      value: 24,
      suffix: "/7",
      label: t("stats.availability"),
      delay: 200,
    },
    {
      icon: <TrendingUp className="w-7 h-7" />,
      value: 98,
      suffix: "%",
      label: t("stats.satisfaction"),
      delay: 300,
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            {t("stats.title")}
          </h2>
          <p className="mt-3 text-muted-foreground text-lg">
            {t("stats.subtitle")}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, index) => (
            <StatItem key={index} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
