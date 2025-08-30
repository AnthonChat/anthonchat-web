"use client";
import { useTranslations } from "next-intl";
import { LocaleLink } from "@/components/ui/locale-link";

export default function PrivacyContent() {
  const t = useTranslations("legal.privacy");

  const safeT = (key: string) => {
    try {
      return t(key);
    } catch {
      return "";
    }
  };

  const section = (base: string) => ({
    title: t(`${base}.title`),
    p1: t(`${base}.p1`),
  });
  const sectionWithP2 = (base: string) => ({
    title: t(`${base}.title`),
    p1: t(`${base}.p1`),
    p2: safeT(`${base}.p2`),
  });

  const intro = sectionWithP2("sections.intro");
  const controller = section("sections.controller");
  const sharing = section("sections.sharing");
  const retention = section("sections.retention");
  const contact = section("sections.contact");
  const age = sectionWithP2("sections.age");

  const bullets = (base: string, count: number) =>
    Array.from({ length: count }, (_, i) => t(`${base}.bullets.${i + 1}`));

  const items = (base: string, count: number) =>
    Array.from({ length: count }, (_, i) => t(`${base}.${i + 1}`));
 
  const dataBullets = bullets("sections.data", 3);
  const limitationsBullets = bullets("sections.limitations", 4);
  const useBullets = bullets("sections.use", 5);
  const legalBullets = bullets("sections.legal", 4);
  const transfersBullets = bullets("sections.transfers", 3);
  const rightsBullets = bullets("sections.rights", 7);
  const marketingBullets = bullets("sections.marketing", 3);
  const securityBullets = bullets("sections.security", 5);
  const retentionBullets = items("sections.retention.items", 3);
  const aiBullets = bullets("sections.ai", 4);
  const aiNote = safeT("sections.ai.note");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-10 md:py-16">
        {/* Navigation back to homepage */}
        <div className="mb-8">
          <LocaleLink
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {t("backToHome")}
          </LocaleLink>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("lastUpdated")}</p>

        <section className="mt-8 prose prose-invert max-w-none">
          <p>{intro.p1}</p>
          {intro.p2 ? <p>{intro.p2}</p> : null}
        </section>

        <section className="mt-10">
          <h2 className="text-xl md:text-2xl font-semibold">{controller.title}</h2>
          <p className="mt-4 text-muted-foreground">{controller.p1}</p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl md:text-2xl font-semibold">{t("sections.data.title")}</h2>
          <ul className="mt-4 list-disc pl-5 space-y-2 text-muted-foreground">
            {dataBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl md:text-2xl font-semibold">{t("sections.limitations.title")}</h2>
          <ul className="mt-4 list-disc pl-5 space-y-2 text-muted-foreground">
            {limitationsBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl md:text-2xl font-semibold">{t("sections.use.title")}</h2>
          <ul className="mt-4 list-disc pl-5 space-y-2 text-muted-foreground">
            {useBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl md:text-2xl font-semibold">{t("sections.legal.title")}</h2>
          <ul className="mt-4 list-disc pl-5 space-y-2 text-muted-foreground">
            {legalBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl md:text-2xl font-semibold">{t("sections.ai.title")}</h2>
          <ul className="mt-4 list-disc pl-5 space-y-2 text-muted-foreground">
            {aiBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          {aiNote ? <p className="mt-4 text-muted-foreground">{aiNote}</p> : null}
        </section>

        <section className="mt-10">
          <h2 className="text-xl md:text-2xl font-semibold">{age.title}</h2>
          <p className="mt-4 text-muted-foreground">{age.p1}</p>
          {age.p2 ? <p className="mt-2 text-muted-foreground">{age.p2}</p> : null}
        </section>

        <section className="mt-10">
          <h2 className="text-xl md:text-2xl font-semibold">{sharing.title}</h2>
          <p className="mt-4 text-muted-foreground">{sharing.p1}</p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl md:text-2xl font-semibold">{t("sections.transfers.title")}</h2>
          <ul className="mt-4 list-disc pl-5 space-y-2 text-muted-foreground">
            {transfersBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl md:text-2xl font-semibold">{retention.title}</h2>
          <p className="mt-4 text-muted-foreground">{retention.p1}</p>
          <ul className="mt-4 list-disc pl-5 space-y-2 text-muted-foreground">
            {retentionBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl md:text-2xl font-semibold">{t("sections.marketing.title")}</h2>
          <ul className="mt-4 list-disc pl-5 space-y-2 text-muted-foreground">
            {marketingBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl md:text-2xl font-semibold">{t("sections.security.title")}</h2>
          <ul className="mt-4 list-disc pl-5 space-y-2 text-muted-foreground">
            {securityBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl md:text-2xl font-semibold">{t("sections.rights.title")}</h2>
          <ul className="mt-4 list-disc pl-5 space-y-2 text-muted-foreground">
            {rightsBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl md:text-2xl font-semibold">{t("sections.changes.title")}</h2>
          <p className="mt-4 text-muted-foreground">{t("sections.changes.p1")}</p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl md:text-2xl font-semibold">{contact.title}</h2>
          <p className="mt-4 text-muted-foreground">{contact.p1}</p>
        </section>
      </div>
    </main>
  );
}