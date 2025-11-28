"use client";

import { useTranslations } from "next-intl";
import { LocaleLink } from "@/components/ui/locale-link";
import { Mail, MessageCircle } from "lucide-react";

export function Footer() {
  const t = useTranslations("marketing");

  const footerLinks = {
    product: [
      { label: t("footer.links.features"), href: "#features" },
      { label: t("footer.links.pricing"), href: "/pricing" },
      { label: t("footer.links.howItWorks"), href: "#how-it-works" },
    ],
    company: [{ label: t("footer.links.privacy"), href: "/privacy" }],
    support: [
      {
        label: t("footer.links.helpCenter"),
        href: "mailto:info@tryanthon.com",
      },
      { label: t("footer.links.contact"), href: "mailto:info@tryanthon.com" },
    ],
  };

  return (
    <footer className="border-t border-border bg-card/40">
      <div className="container mx-auto px-4 py-12 md:py-16">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <LocaleLink href="/" className="inline-block">
              <span className="text-2xl font-extrabold text-primary tracking-tight">
                ANTHON
              </span>
            </LocaleLink>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              {t("footer.description")}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a
                href="mailto:info@tryanthon.com"
                className="w-10 h-10 rounded-lg bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary flex items-center justify-center transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
              <LocaleLink
                href="/signup"
                className="w-10 h-10 rounded-lg bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary flex items-center justify-center transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
              </LocaleLink>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">
              {t("footer.sections.product")}
            </h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <LocaleLink
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </LocaleLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">
              {t("footer.sections.company")}
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <LocaleLink
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </LocaleLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">
              {t("footer.sections.support")}
            </h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("footer.madeWith")}
          </p>
        </div>
      </div>
    </footer>
  );
}
