import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted text-foreground">
      {/* HERO con copy originale adattato */}
      <section className="relative overflow-hidden">
        <div className="relative container mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
            🧠 TRY ANTHON
          </h1>
          <div className="mt-2 text-xl md:text-2xl font-semibold text-primary uppercase">
            L&rsquo;AI CLONE DI ANTONIO VALENTE
          </div>
          <p className="mt-6 max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground">
            Il mental coach dei calciatori professionisti e dei VIP. Ora sempre
            con te 24H AL GIORNO 7 GIORNI SU 7. Non solo WhatsApp o Telegram:
            collega anche Web Chat, Email, Instagram e altri canali.
          </p>

          {/* CTA TOP */}
          <div className="mt-10">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-4 text-base md:text-lg font-semibold text-primary-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              🚀 PROVALO GRATIS 🚀
            </Link>
            <div className="mt-3 text-sm text-muted-foreground">
              ZERO CARTE. ZERO FREGATURE. SE NON TI FA DIRE WOW, CANCELLI.
            </div>
          </div>
        </div>
      </section>

      {/* CHAT DEMO + CTA demo (aderente al tono originale, ma omnicanale) */}
      <section className="container mx-auto px-4 py-12">
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
            {/* Mockup chat: focus visivo + responsive */}
            <div className="rounded-2xl border border-border bg-background shadow-sm max-w-2xl mx-auto">
              <div className="rounded-t-2xl bg-primary text-primary-foreground font-semibold px-4 py-3 flex items-center gap-2">
                💬 ANTHON — Coach AI
              </div>
              <div className="p-4 sm:p-5 min-h-[260px]">
                <div className="mb-3 ml-auto max-w-[82%] rounded-2xl bg-muted px-4 py-3 text-sm sm:text-base text-foreground shadow">
                  <strong>Tu:</strong>
                  <br />
                  &quot;Ho paura di sbagliare il rigore decisivo domani&quot;
                </div>
                <div className="mb-3 mr-auto max-w-[88%] rounded-2xl border border-border bg-card px-4 py-3 text-sm sm:text-base text-foreground shadow-sm">
                  <strong>Anthon:</strong>
                  <br />
                  &quot;Ehi Marco! 💪 So perfettamente cosa provi... quella
                  sensazione allo stomaco, vero?&quot;
                  <br />
                  <br />
                  🎯 30 secondi prima: visualizza il pallone che ENTRA
                  nell&rsquo;angolino destro
                  <br />
                  🫁 Respirazione quadrata: 4-4-4-4
                  <br />
                  🗣️ Ripeti: &lsquo;Io comando il pallone&rsquo;
                  <br />
                  <br />
                  Domani richiama questa sequenza e spacca!
                </div>
              </div>
            </div>

            {/* CTA demo + punti sintetici */}
            <div className="text-center lg:text-left">
              <h3 className="text-2xl font-extrabold text-card-foreground">
                Provalo gratis su tutti i tuoi canali
              </h3>
              <p className="mt-2 font-semibold text-muted-foreground">
                ZERO CARTE. ZERO FREGATURE. SE NON TI FA DIRE WOW, CANCELLI.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>• Risposte in tempo reale con AI</li>
                <li>• Regole di routing e fallback umano</li>
                <li>• Attivazione in pochi minuti</li>
              </ul>
              <div className="mt-6">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-4 text-base md:text-lg font-semibold text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  👆 CLICCA QUI E INIZIAMO!
                </Link>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Scrivi &quot;START&quot; e ricevi il tuo primo onboarding in 10
                secondi
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BIG CLAIM */}
      <section className="container mx-auto px-4">
        <div className="my-10 text-center text-4xl md:text-5xl font-extrabold uppercase tracking-tight">
          NON È CHATGPT
          <br />È ANTHON
        </div>
      </section>

      {/* SEZIONE: Unico coach AI clone ... (adattata a piattaforma) */}
      <section className="container mx-auto px-4">
        <div className="relative rounded-2xl border border-border bg-card p-6 md:p-8">
          <h2 className="text-primary font-extrabold uppercase text-2xl">
            🔥 L&rsquo;UNICO COACH AI ISTRUITO SUL CAMPO
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Allenato con migliaia di dati e aggiornato quotidianamente con
            strategie che producono risultati. Oggi la stessa intelligenza opera
            su più canali: WhatsApp, Telegram, Web Chat, Email, Instagram e
            altri via API.
          </p>

          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: "MIGLIAIA DI DATI REALI",
                desc: "Casi e strategie reali presi da anni di risultati",
              },
              {
                title: "METODO SINCRO",
                desc: "Processi validati sul campo, adattati all’AI",
              },
              {
                title: "ISTRUITO DA ESPERTI",
                desc: "Know-how trasferito, non un bot generico",
              },
              {
                title: "AGGIORNATO LIVE",
                desc: "Migliora costantemente con feedback e analytics",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-background text-center p-5"
              >
                <div className="text-2xl mb-2">✅</div>
                <div className="font-semibold text-card-foreground">
                  {f.title}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BIG CLAIM 2 */}
      <section className="container mx-auto px-4">
        <div className="my-12 text-center text-4xl md:text-5xl font-extrabold uppercase tracking-tight">
          IL VERO NEMICO?
          <br />
          QUELLA VOCINA CHE TI SABOTA
        </div>
      </section>

      {/* AUTOSABOTAGGIO -> adattato a contesto aziendale/squadre */}
      <section className="container mx-auto px-4">
        <div className="relative rounded-2xl border border-border bg-card p-6 md:p-8">
          <h2 className="text-primary font-extrabold uppercase text-2xl">
            ❌ L&rsquo;AUTOSABOTAGGIO
          </h2>
          <div className="mt-4 text-foreground/90 space-y-2">
            <p>
              ✗ Ti frena prima della “partita”: allenamento, amichevole o match reale
            </p>
            <p>✗ Ti fa mollare quando serve lucidità</p>
            <p>✗ Ti convince che “non sei all’altezza”</p>
            <p>✗ Ti fa pensare che “tanto non cambierà nulla”</p>
          </div>
          <div className="mt-5 rounded-lg border-l-4 border-destructive bg-destructive/10 p-4 text-foreground">
            <strong>👉 È autosabotaggio.</strong>
          </div>
        </div>
      </section>

      {/* BIG CLAIM 3 */}
      <section className="container mx-auto px-4">
        <div className="my-12 text-center text-4xl md:text-5xl font-extrabold uppercase tracking-tight">
          ANTHON LO SPEGNE
          <br />
          IN TEMPO REALE
        </div>
      </section>

      {/* SEZIONE RISPOSTE IN TEMPO REALE */}
      <section className="container mx-auto px-4">
        <div className="relative rounded-2xl border border-border bg-card p-6 md:p-8 text-center">
          <h2 className="text-primary font-extrabold uppercase text-2xl">
            🚀 RISPOSTE IN TEMPO REALE
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Quando serve. Come serve. Con strumenti concreti e personalizzati su
            ogni canale.
          </p>
          <div className="mt-6 space-y-2 text-foreground/90">
            <div>✅ Ti risveglia quando sei “spento”</div>
            <div>✅ Ti chiarisce quando sei confuso</div>
            <div>✅ Ti guida quando ti stai perdendo</div>
            <div>
              ✅ Ti fornisce strumenti diretti, con handover umano quando
              necessario
            </div>
          </div>
        </div>
      </section>

      {/* CTA MIDDLE: identico tono “provalo gratis” */}
      <section className="container mx-auto px-4">
        <div className="my-10 rounded-2xl border border-border bg-accent/30 p-10 text-center">
          <h2 className="text-3xl font-extrabold">PROVALO GRATIS</h2>
          <p className="mt-2 text-lg font-semibold text-muted-foreground">
            ZERO CARTE. ZERO FREGATURE. SE NON TI FA DIRE WOW, CANCELLI.
          </p>
          <div className="mt-6">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-10 py-4 text-base md:text-lg font-semibold text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              🚀 INIZIA ORA
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Scrivi &quot;START&quot; e ricevi il tuo primo onboarding in 10
            secondi
          </p>
        </div>
      </section>

      {/* È PER TE SE (adattato) */}
      <section className="container mx-auto px-4 my-12 md:my-20">
        <div className="relative rounded-2xl border border-border bg-card p-8 md:p-12">
          <h2 className="text-primary font-extrabold uppercase text-2xl tracking-tight">
            ⚽ È PER TE SE:
          </h2>
          <ul className="mt-8 space-y-3 md:space-y-4 text-foreground/90 text-base md:text-lg leading-relaxed md:leading-7 list-none pl-0">
            <li className="flex gap-3">
              <span aria-hidden="true">•</span>
              <span>Vuoi rendere per ciò che vali davvero, come atleta o come team</span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true">•</span>
              <span>Sei un genitore o un coach e vuoi un supporto costante, H24</span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true">•</span>
              <span>Gestisci community e clienti su più canali e ti serve ordine</span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true">•</span>
              <span>Vuoi più lucidità, concentrazione e continuità nelle conversazioni</span>
            </li>
          </ul>
        </div>
      </section>

      {/* COME FUNZIONA (aderente ai 4 passi) */}
      <section className="container mx-auto px-4 my-12 md:my-20">
        <div className="relative rounded-2xl border border-border bg-card p-8 md:p-12">
          <h2 className="text-primary font-extrabold uppercase text-2xl tracking-tight">
            📲 COME FUNZIONA?
          </h2>
          <ol className="mt-8 text-foreground/90 text-base md:text-lg space-y-3 md:space-y-4 leading-relaxed md:leading-7 list-decimal pl-6">
            <li>
              Scegli i canali: WhatsApp, Telegram, Web Chat, Email, Instagram o altri via API
            </li>
            <li>
              Scrivi la tua situazione o importa la tua conoscenza (FAQ, documenti, link)
            </li>
            <li>
              Chatta e imposta regole: conversazioni mirate, mini sessioni guidate dall’AI
            </li>
            <li>
              Ti sblocchi. Ti chiarisci. Agisci. Con analytics a supporto
            </li>
          </ol>
        </div>
      </section>

      {/* PERCHE FUNZIONA COSI BENE */}
      <section className="container mx-auto px-4 my-12 md:my-20">
        <div className="relative rounded-2xl border border-border bg-card p-8 md:p-12">
          <h2 className="text-primary font-extrabold uppercase text-2xl tracking-tight">
            🧠 PERCHÉ FUNZIONA COSÌ BENE?
          </h2>
          <p className="mt-8 text-muted-foreground text-base md:text-lg leading-relaxed md:leading-7">
            Non è motivazione da Baci Perugina. È una macchina costruita su:
          </p>
          <ul className="mt-8 space-y-3 md:space-y-4 text-foreground/90 text-base md:text-lg leading-relaxed md:leading-7 list-none pl-0">
            <li className="flex gap-3">
              <span aria-hidden="true">•</span>
              <span>
                <strong>Strategie vere</strong> usate sul campo e codificate in flussi AI
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true">•</span>
              <span>
                <strong>Dati raccolti</strong> in anni di esperienza, ruoli e contesti diversi
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true">•</span>
              <span>
                <strong>Risultati misurabili</strong>, con miglioramenti continui grazie ad analytics
              </span>
            </li>
          </ul>
          <div className="mt-8 rounded-lg bg-primary/10 p-5 md:p-6 text-foreground leading-relaxed md:leading-7">
            <strong>
              E soprattutto, continua a imparare ogni giorno. Nessun altro lo fa così.
            </strong>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS (aderenti al tono) */}
      <section className="container mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border-l-4 border-primary bg-card p-5">
            <div className="italic text-card-foreground">
              &quot;È come avere Antonio sempre in tasca. Sa esattamente cosa
              dirmi.&quot;
            </div>
            <div className="mt-2 font-semibold text-primary">
              - Centrocampista Serie B
            </div>
          </div>
          <div className="rounded-2xl border-l-4 border-primary bg-card p-5">
            <div className="italic text-card-foreground">
              &quot;Mio figlio è tornato a divertirsi. E a segnare come
              prima.&quot;
            </div>
            <div className="mt-2 font-semibold text-primary">
              - Padre di talento 16 anni
            </div>
          </div>
        </div>
      </section>

      {/* QUANTO COSTA */}
      <section className="container mx-auto px-4">
        <div className="relative rounded-2xl border border-border bg-card p-6 md:p-8 text-center">
          <h2 className="text-primary font-extrabold uppercase text-2xl">
            💰 QUANTO COSTA?
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Puoi <strong className="text-foreground">testarlo gratis</strong>.
            Nessuna carta. Nessun rischio. Provalo, poi decidi.
          </p>
        </div>
      </section>

      {/* URGENCY */}
      <section className="container mx-auto px-4">
        <div className="my-6 rounded-lg border border-destructive bg-destructive/10 text-foreground text-center font-semibold p-3">
          ⚠️ OFFERTA VALIDA SOLO PER I PRIMI 1.000 UTENTI - POI DIVENTA A
          PAGAMENTO
        </div>
      </section>

      {/* CTA BOTTOM con tono originale */}
      <section className="container mx-auto px-4">
        <div className="my-8 rounded-2xl border border-border bg-accent/30 p-10 text-center">
          <h2 className="text-3xl font-extrabold">PROVALO GRATIS</h2>
          <p className="mt-2 text-lg font-semibold text-muted-foreground">
            ZERO CARTE. ZERO FREGATURE. SE NON TI FA DIRE WOW, CANCELLI.
          </p>
          <div className="mt-6">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-10 py-4 text-base md:text-lg font-semibold text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              🚀 ATTIVA IL TUO ACCOUNT GRATUITO
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Scrivi &quot;START&quot; e ricevi il tuo primo onboarding in 10
            secondi
          </p>
        </div>
      </section>

      {/* Claim finale */}
      <section className="container mx-auto px-4">
        <div className="my-10 text-center text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-primary">
          PROVALO • SARÀ COME PARLARE CON UN COACH • SEMPRE
        </div>
        <div className="text-center text-primary font-semibold">
          Provalo gratis. Poi dimmi se sbaglio.
        </div>
      </section>

      <div className="h-6" />
    </div>
  );
}
