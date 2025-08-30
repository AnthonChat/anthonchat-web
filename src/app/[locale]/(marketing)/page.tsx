"use client";

import { useTranslations } from "next-intl";
import { LocaleLink } from "@/components/ui/locale-link";

export default function Home() {
  const t = useTranslations("marketing");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted text-foreground">
      {/* HERO con copy originale adattato */}
      <section className="relative overflow-hidden">
        <div className="relative container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
            {t("hero.title")}
          </h1>
          <div className="mt-2 text-lg sm:text-xl md:text-2xl font-semibold text-primary">
            {t("hero.subtitle")}
          </div>
          <p className="mt-6 max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-muted-foreground">
            {t("hero.description")}
          </p>

          {/* CTA TOP */}
          <div className="mt-10">
            <LocaleLink
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base md:text-lg font-semibold text-primary-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              {t("cta.button")}
            </LocaleLink>
          </div>
        </div>
      </section>

      {/* CHAT DEMO + CTA demo (aderente al tono originale, ma omnicanale) */}
      <section className="container mx-auto px-4 py-12">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
            {/* Mockup chat: focus visivo + responsive */}
            <div className="rounded-2xl border border-border bg-background shadow-sm max-w-2xl mx-auto">
              <div className="rounded-t-2xl bg-primary text-primary-foreground font-semibold px-4 py-3 flex items-center gap-2">
                💬 ANTHON — Coach AI
              </div>
              <div className="p-4 sm:p-5 min-h-[260px]">
                <div className="mb-3 ml-auto max-w-[82%] rounded-2xl bg-muted px-4 py-3 text-sm sm:text-base text-foreground shadow">
                  <strong>{t("chat.demo.username")}:</strong>
                  <br />
                  {t("chat.demo.message")}
                </div>
                <div className="mb-3 mr-auto max-w-[88%] rounded-2xl border border-border bg-card px-4 py-3 text-sm sm:text-base text-foreground shadow-sm">
                  <strong>Anthon:</strong>
                  <br />
                  <div className="whitespace-pre-line">
                    {t("chat.demo.reply")}
                  </div>
                </div>
              </div>
            </div>

            {/* CTA demo + punti sintetici */}
            <div className="text-center lg:text-left">
              <h3 className="text-2xl font-extrabold text-card-foreground">
                {t("chat.info.title")}
              </h3>
              <p className="mt-2 font-semibold text-muted-foreground">
                {t("chat.info.subtitle")}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>{t("chat.info.bullets.1")}</li>
                <li>{t("chat.info.bullets.2")}</li>
                <li>{t("chat.info.bullets.3")}</li>
              </ul>
              <div className="mt-6">
                <LocaleLink
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-4 text-base md:text-lg font-semibold text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  {t("cta.button")}
                </LocaleLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BIG CLAIM */}
      <section className="container mx-auto px-4">
        <div className="my-10 text-center text-3xl sm:text-4xl md:text-5xl font-extrabold uppercase tracking-tight whitespace-pre-line">
          {t("claims.1")}
        </div>
      </section>

      {/* SEZIONE: Unico coach AI clone ... (adattata a piattaforma) */}
      <section className="container mx-auto px-4">
        <div className="relative rounded-2xl border border-border bg-card p-5 sm:p-6 md:p-8">
          <h2 className="text-primary font-extrabold uppercase text-2xl">
            🔥 {t("features.title")}
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            {t("features.description")}
          </p>

          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {["1", "2", "3", "4"].map((f, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-background text-center p-5"
              >
                <div className="text-2xl mb-2">✅</div>
                <div className="font-semibold text-card-foreground">
                  {t(`features.features.${f}.title`)}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {t(`features.features.${f}.description`)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BIG CLAIM 2 */}
      <section className="container mx-auto px-4">
        <div className="my-12 text-center text-3xl sm:text-4xl md:text-5xl font-extrabold uppercase tracking-tight whitespace-pre-line">
          {t("claims.2")}
        </div>
      </section>

      {/* AUTOSABOTAGGIO -> adattato a contesto aziendale/squadre */}
      <section className="container mx-auto px-4">
        <div className="relative rounded-2xl border border-border bg-card p-5 sm:p-6 md:p-8">
          <h2 className="text-primary font-extrabold uppercase text-2xl">
            ❌ {t("autosabotage.title")}
          </h2>
          <div className="mt-4 text-foreground/90 space-y-2">
            <p>{t("autosabotage.bullets.1")}</p>
            <p>{t("autosabotage.bullets.2")}</p>
            <p>{t("autosabotage.bullets.3")}</p>
            <p>{t("autosabotage.bullets.4")}</p>
          </div>
          <div className="mt-5 rounded-lg border-l-4 border-destructive bg-destructive/10 p-4 text-foreground">
            <strong>👉 {t("autosabotage.conclusion")}</strong>
          </div>
        </div>
      </section>

      {/* BIG CLAIM 3 */}
      <section className="container mx-auto px-4">
        <div className="my-12 text-center text-3xl sm:text-4xl md:text-5xl font-extrabold uppercase tracking-tight whitespace-pre-line">
          {t("claims.3")}
        </div>
      </section>

      {/* SEZIONE RISPOSTE IN TEMPO REALE */}
      <section className="container mx-auto px-4">
        <div className="relative rounded-2xl border border-border bg-card p-5 sm:p-6 md:p-8 text-center">
          <h2 className="text-primary font-extrabold uppercase text-2xl">
            🚀 {t("realtime.title")}
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            {t("realtime.subtitle")}
          </p>
          <div className="mt-6 space-y-2 text-foreground/90">
            <div>✅ {t("realtime.bullets.1")}</div>
            <div>✅ {t("realtime.bullets.2")}</div>
            <div>✅ {t("realtime.bullets.3")}</div>
            <div>✅ {t("realtime.bullets.4")}</div>
          </div>
        </div>
      </section>

      {/* CTA MIDDLE: identico tono “provalo gratis” */}
      <section className="container mx-auto px-4">
        <div className="my-10 rounded-2xl border border-border bg-accent/30 p-8 sm:p-10 text-center">
          <h2 className="text-3xl font-extrabold uppercase">
            {t("cta.subtitle")}
          </h2>
          <p className="mt-2 text-lg font-semibold text-muted-foreground">
            {t("chat.info.subtitle")}
          </p>
          <div className="mt-6">
            <LocaleLink
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-8 sm:px-10 py-3 sm:py-4 text-sm sm:text-base md:text-lg font-semibold text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              🚀 {t("cta.button")}
            </LocaleLink>
          </div>
        </div>
      </section>

      {/* È PER TE SE (adattato) */}
      <section className="container mx-auto px-4 my-12 md:my-20">
        <div className="relative rounded-2xl border border-border bg-card p-6 sm:p-8 md:p-12">
          <h2 className="text-primary font-extrabold uppercase text-2xl tracking-tight">
            ⚽ {t("target.title")}
          </h2>
          <ul className="mt-8 space-y-3 md:space-y-4 text-foreground/90 text-base md:text-lg leading-relaxed md:leading-7 list-none pl-0">
            <li className="flex gap-3">
              <span aria-hidden="true">•</span>
              <span>{t("target.bullets.1")}</span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true">•</span>
              <span>{t("target.bullets.2")}</span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true">•</span>
              <span>{t("target.bullets.3")}</span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true">•</span>
              <span>{t("target.bullets.4")}</span>
            </li>
          </ul>
        </div>
      </section>

      {/* COME FUNZIONA (aderente ai 4 passi) */}
      <section className="container mx-auto px-4 my-12 md:my-20">
        <div className="relative rounded-2xl border border-border bg-card p-6 sm:p-8 md:p-12">
          <h2 className="text-primary font-extrabold uppercase text-2xl tracking-tight">
            📲 {t("how.title")}
          </h2>
          <ol className="mt-8 text-foreground/90 text-base md:text-lg space-y-3 md:space-y-4 leading-relaxed md:leading-7 list-decimal pl-6">
            <li>{t("how.steps.1")}</li>
            <li>{t("how.steps.2")}</li>
            <li>{t("how.steps.3")}</li>
            <li>{t("how.steps.4")}</li>
          </ol>
        </div>
      </section>

      {/* PERCHE FUNZIONA COSI BENE */}
      <section className="container mx-auto px-4 my-12 md:my-20">
        <div className="relative rounded-2xl border border-border bg-card p-6 sm:p-8 md:p-12">
          <h2 className="text-primary font-extrabold uppercase text-2xl tracking-tight">
            🧠 {t("why.title")}
          </h2>
          <p className="mt-8 text-muted-foreground text-base md:text-lg leading-relaxed md:leading-7">
            {t("why.subtitle")}
          </p>
          <ul className="mt-8 space-y-3 md:space-y-4 text-foreground/90 text-base md:text-lg leading-relaxed md:leading-7 list-none pl-0">
            <li className="flex gap-3">
              <span aria-hidden="true">•</span>
              <span>{t("why.bullets.1")}</span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true">•</span>
              <span>{t("why.bullets.2")}</span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true">•</span>
              <span>{t("why.bullets.3")}</span>
            </li>
          </ul>
          <div className="mt-8 rounded-lg bg-primary/10 p-4 sm:p-5 md:p-6 text-foreground leading-relaxed md:leading-7">
            <strong>{t("why.conclusion")}</strong>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS (aderenti al tono) */}
      <section className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border-l-4 border-primary bg-card p-5">
            <div className="italic text-card-foreground">
              {t("testimonials.1.text")}
            </div>
            <div className="mt-2 font-semibold text-primary">
              {t("testimonials.1.author")}
            </div>
          </div>
          <div className="rounded-2xl border-l-4 border-primary bg-card p-5">
            <div className="italic text-card-foreground">
              {t("testimonials.2.text")}
            </div>
            <div className="mt-2 font-semibold text-primary">
              {t("testimonials.2.author")}
            </div>
          </div>
        </div>
      </section>

      {/* QUANTO COSTA */}
      <section className="container mx-auto px-4">
        <div className="relative rounded-2xl border border-border bg-card p-5 sm:p-6 md:p-8 text-center">
          <h2 className="text-primary font-extrabold uppercase text-2xl">
            💰 {t("cost.title")}
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            {t("cost.subtitle")}
          </p>
        </div>
      </section>

      {/* URGENCY */}
      <section className="container mx-auto px-4">
        <div className="my-6 rounded-lg border border-destructive bg-destructive/10 text-foreground text-center font-semibold p-3">
          ⚠️ {t("cost.offer")}
        </div>
      </section>

      {/* CTA BOTTOM con tono originale */}
      <section className="container mx-auto px-4">
        <div className="my-8 rounded-2xl border border-border bg-accent/30 p-8 sm:p-10 text-center">
          <h2 className="text-3xl font-extrabold uppercase">
            {t("cta.title")}
          </h2>
          <p className="mt-2 text-lg font-semibold text-muted-foreground">
            {t("cta.subtitle")}
          </p>
          <div className="mt-6">
            <LocaleLink
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-8 sm:px-10 py-3 sm:py-4 text-sm sm:text-base md:text-lg font-semibold text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              🚀 {t("cta.button")}
            </LocaleLink>
          </div>
        </div>
      </section>

      {/* Claim finale */}
      <section className="container mx-auto px-4 my-20 ">
        <div className="my-10 text-center text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-primary">
          {t("footer.title")}
        </div>
        <div className="text-center text-primary font-semibold">
          {t("footer.description")}
        </div>
      </section>

      <footer className="border-t border-border bg-card/40">
        <div className="container mx-auto px-4 py-8 md:py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SINCRO GROUP SRL. All rights reserved.
          </div>
          <nav className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
            <LocaleLink
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </LocaleLink>
          </nav>
        </div>
      </footer>
    </div>
  );
}
