# 🚀 AnthonChat: Il tuo Chatbot AI Multi-Componente Scalabile 🧠

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black.svg)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Enabled-3ECF8E.svg)](https://supabase.com/)
[![N8N](https://img.shields.io/badge/N8N-Workflow-FF6200.svg)](https://n8n.io/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-6772E5.svg)](https://stripe.com/)

---

## 🎯 Overview

AnthonChat è una piattaforma chatbot AI sofisticata e multi-componente, progettata per offrire interazioni intelligenti e personalizzate su diversi canali di messaggistica. Il sistema abilita gli utenti a creare e gestire chatbot avanzati con funzionalità di intelligenza artificiale all'avanguardia, gestione della memoria di conversazione, integrazione di knowledge base e un robusto sistema di sottoscrizione a tier.

**Value Proposition:**
AnthonChat mira a fornire una soluzione completa per aziende e privati che cercano di implementare chatbot AI scalabili, intelligenti e gestibili, con un modello di prezzi flessibile basato sull'utilizzo e sulle capacità AI.

---

## 🏗️ Architecture

L'architettura di AnthonChat è modulare e distribuita, composta da quattro componenti chiave che lavorano in sinergia per fornire un'esperienza chatbot completa:

1.  **Database Supabase**: Gestisce tutti i dati persistenti, inclusi utenti, canali, sottoscrizioni, dati di utilizzo e memoria delle conversazioni. Fornisce autenticazione e funzionalità in tempo reale.
2.  **N8N Workflow**: Il cuore logico del chatbot. N8N orchestrata la ricezione dei messaggi dai canali (WhatsApp, Telegram), elabora le richieste utente, interagisce con i modelli AI (Gemini Flash, OpenAI o4-mini, Claude Opus) e gestisce la memoria della conversazione e il rate limiting.
3.  **Web Application Next.js**: L'interfaccia utente front-end per la gestione dell'account, dei canali, delle sottoscrizioni Stripe e della dashboard di utilizzo. Fornisce un'esperienza utente reattiva e sicura.
4.  **Stripe Integration**: Il motore di fatturazione e gestione delle sottoscrizioni, che supporta tre diversi tier di servizio.

```mermaid
graph TD
    User --> |WhatsApp/Telegram| N8N[N8N Workflow (Chatbot Engine)]
    N8N --> |AI Processing (Gemini/OpenAI/Claude)| AI_Models[AI Models]
    N8N ---> KB[Pinecone Knowledge Base]
    N8N --> |Read/Write Conversation Memory| Supabase[Supabase Database]
    Supabase --> |User Data, Channels, Subscriptions, Usage| NextJS[Next.js Web App]
    NextJS --> |Manage Subscriptions| Stripe[Stripe Payments]
    Stripe --> |Webhooks| NextJS
    NextJS --> |Authentication| Supabase
    N8N --> |Logging| GoogleSheets[Google Sheets (Monitoring)]

    subgraph Front-end
        NextJS
    end

    subgraph Back-end & Logic
        N8N
        AI_Models
        KB
        Stripe
    end

    subgraph Data
        Supabase
        GoogleSheets
    end
```

**Interconnessioni Principali:**
*   I messaggi utente via WhatsApp/Telegram arrivano a N8N.
*   N8N interroga i modelli AI e la knowledge base Pinecone per generare risposte.
*   N8N interagisce con Supabase per recuperare/salvare la memoria delle conversazioni e i dati di utilizzo.
*   La Web App si autentica via Supabase e mostra i dati utente, canali, usage e sottoscrizioni.
*   La Web App interagisce con Stripe per gestire i checkout e i portali di fatturazione.
*   Stripe invia webhooks alla Web App per la sincronizzazione dello stato delle sottoscrizioni.
*   N8N registra l'attività su Google Sheets per il monitoring.

---

## 💾 Database Schema

Il database è ospitato su Supabase (PostgreSQL) e segue uno schema ben definito per gestire gli utenti, i canali chatbot, le sottoscrizioni, l'utilizzo e la memoria delle conversazioni.

Per lo schema completo, riferirsi al file: [`db.sql`](./db.sql)

**Tabelle Principali (Schema `public`):**

*   `users`: Dettagli degli utenti registrati, collegati all'autenticazione Supabase Auth.
    *   `id`: `uuid` (Primary Key, Foreign Key a `auth.users`)
    *   `email`: `text`
    *   `created_at`: `timestamp`
    *   `stripe_customer_id`: `text` (Foreign Key a `stripe.customers`)
*   `channels`: Rappresenta i canali chatbot gestiti dagli utenti (es. sessioni WhatsApp, bot Telegram).
    *   `id`: `uuid` (Primary Key)
    *   `user_id`: `uuid` (Foreign Key a `public.users`)
    *   `type`: `text` (es. 'whatsapp', 'telegram')
    *   `name`: `text`
    *   `status`: `text` (es. 'active', 'inactive', 'pending_verification')
    *   `created_at`: `timestamp`
    *   `linked`: `boolean` (indica se il canale è stato collegato con successo)
    *   `last_active_at`: `timestamp`
*   `subscriptions`: Dettagli sulle sottoscrizioni degli utenti ai diversi tier.
    *   `id`: `uuid` (Primary Key)
    *   `user_id`: `uuid` (Foreign Key a `public.users`)
    *   `stripe_subscription_id`: `text` (Foreign Key a `stripe.subscriptions`)
    *   `tier`: `text` (es. 'basic', 'standard', 'pro')
    *   `start_date`: `timestamp`
    *   `end_date`: `timestamp`
    *   `status`: `text` (es. 'active', 'cancelled', 'past_due')
*   `usage`: Registra l'utilizzo del chatbot (messaggi scambiati, richieste AI). Reset quotidiano.
    *   `id`: `uuid` (Primary Key)
    *   `user_id`: `uuid` (Foreign Key a `public.users`)
    *   `date`: `date`
    *   `message_count`: `integer`
    *   `ai_token_count`: `integer`
*   `conversation_memory`: Memorizza lo storico delle conversazioni per utente/canale.
    *   `id`: `uuid` (Primary Key)
    *   `channel_id`: `uuid` (Foreign Key a `public.channels`)
    *   `message_index`: `integer`
    *   `sender`: `text` (es. 'user', 'bot')
    *   `content`: `text`
    *   `timestamp`: `timestamp`

**Tabelle Principali (Schema `stripe`):**
Il Supabase integra lo schema Stripe per la gestione di clienti, prodotti, prezzi e sottoscrizioni, sincronizzato tramite webhooks e script dedicati.

---

## 💬 N8N Workflow (Chatbot Engine)

L'engine del chatbot è orchestrato tramite N8N, che funge da middleware per la gestione dei messaggi, l'interazione con l'AI e la logica di business.

Per il workflow completo, riferirsi al file: [`n8n_workflow.json`](./n8n_workflow.json)

**Logica del Chatbot:**

1.  **Trigger di Ingresso**:
    *   **WhatsApp**: Tramite webhook configurato con un provider WhatsApp (es. Twilio, 360dialog) che inoltra i messaggi in ingresso a N8N.
    *   **Telegram**: Tramite il nodo Telegram Bot di N8N, che ascolta i messaggi in arrivo.
2.  **Identificazione Utente e Canale**:
    *   Alla ricezione di un messaggio, N8N identifica l'utente e il canale associato tramite l'ID del mittente.
    *   Viene verificato lo stato di linking del canale, utilizzando un sistema con nonce temporizzati per la sicurezza. L'API Next.js `/api/link/validate` viene utilizzata per convalidare il linking.
3.  **Rate Limiting**:
    *   Prima di ogni operazione AI, N8N verifica l'utilizzo attuale dell'utente verso il limite giornaliero consentito dal suo tier di sottoscrizione.
    *   I limiti di rate limiting sono per tier e si resettano quotidianamente.
    *   `Basic`: Limite X messaggi/AI tokens al giorno.
    *   `Standard`: Limite Y messaggi/AI tokens al giorno.
    *   `Pro`: Limite Z messaggi/AI tokens al giorno.
    *   Se l'utente supera il limite, riceve un messaggio di notifica e la richiesta AI viene bloccata.
4.  **Recupero Memoria Conversazione**:
    *   N8N recupera la cronologia recente della conversazione da Supabase (`conversation_memory`) per fornire contesto al modello AI.
    *   La quantità di memoria conservata (numero di messaggi precedenti) è limitata per tier per ottimizzare i costi e le prestazioni.
    *   `Basic`: Memoria limitata a N messaggi.
    *   `Standard`: Memoria limitata a M messaggi.
    *   `Pro`: Memoria completa o estesa a L messaggi.
5.  **Interazione con Modelli AI (Multi-Tier)**:
    *   A seconda del tier di sottoscrizione dell'utente, N8N seleziona il modello AI appropriato:
        *   **Basic**: Gemini Flash
        *   **Standard**: OpenAI GPT-4o mini
        *   **Pro**: Claude Opus
    *   Il messaggio utente, combinato con la memoria della conversazione e, se applicabile, i dati dalla knowledge base, viene inviato al modello AI selezionato.
6.  **Integrazione Knowledge Base (Pinecone)**:
    *   Per risposte a domande complesse o basate su documenti, N8N può interrogare una knowledge base vettoriale Pinecone.
    *   La logica decide se una query richiede l'accesso alla KB o può essere gestita direttamente dal LLM.
7.  **Generazione e Invio Risposta**:
    *   La risposta generata dal modello AI o dalla knowledge base viene formattata e inviata all'utente attraverso il canale di messaggistica originale (WhatsApp o Telegram).
8.  **Aggiornamento Memoria Conversazione**:
    *   Il messaggio utente e la risposta del bot vengono entrambi salvati in `conversation_memory` su Supabase.
9.  **Aggiornamento Usage Tracking**:
    *   L'utilizzo giornaliero (numero di messaggi, token AI consumati) viene aggiornato nella tabella `usage` su Supabase.
10. **Logging**:
    *   Tutte le interazioni chiave e gli errori vengono loggati su un Google Sheet per scopi di monitoring e analisi.

---

## 🚶 User Journey

Questo descrive il tipico percorso dell'utente, dalla fase di scoperta fino all'utilizzo attivo e alla sottoscrizione del servizio.

1.  **Discovery & Landing Page**: L'utente visita la landing page di AnthonChat (Front-end Next.js) e scopre le funzionalità principali, i canali supportati e i tier di prezzo.
2.  **Signup / Login**: L'utente decide di provare il servizio e si registra o effettua il login tramite Supabase Auth (gestito dalla Web App).
3.  **Dashboard Iniziale**: Dopo il login, l'utente accede alla Dashboard (Next.js) dove viene invitato a configurare il suo primo canale o a scegliere un piano di sottoscrizione.
4.  **Channel Creation & Linking**:
    *   L'utente decide di aggiungere un nuovo canale (es. WhatsApp).
    *   La Web App (Next.js) genera un nonce temporizzato tramite `/api/link/generate` e fornisce istruzioni su come collegare il canale (es. inviando un messaggio specifico a un numero WhatsApp).
    *   Quando l'utente invia il messaggio di collegamento, N8N intercetta il messaggio, valida il nonce tramite `/api/link/validate` e aggiorna lo stato del canale su Supabase a "linked".
    *   L'utente vede lo stato del canale aggiornarsi in tempo reale sulla Dashboard.
5.  **Initial Chat Interaction**: L'utente testa il canale collegato inviando un messaggio al chatbot.
    *   N8N riceve il messaggio, lo elabora tramite AI, recupera la memoria e la knowledge base se necessario.
    *   N8N invia la risposta al canale dell'utente.
    *   L'utilizzo viene tracciato e la memoria delle conversazioni viene aggiornata.
6.  **Subscription Management**:
    *   Se l'utente è sul piano Basic o gratuito (se configurato), potrebbe voler effettuare l'upgrade a un tier superiore per maggiori funzionalità od uso.
    *   L'utente naviga alla sezione "Sottoscrizione" sulla Web App.
    *   Vengono presentati i 3 tier:
        *   **Basic**: €9.99/mese
        *   **Standard**: €19.99/mese
        *   **Pro**: €39.99/mese
    *   L'utente seleziona il tier desiderato e viene reindirizzato al checkout di Stripe (gestito dall'API Next.js `/api/stripe/checkout`).
    *   Dopo il pagamento, Stripe invia un webhook alla Web App (`/api/stripe/webhooks`) che aggiorna lo stato della sottoscrizione dell'utente su Supabase (`public.subscriptions`).
    *   Funzionalità e limiti del chatbot si aggiornano dinamicamente in base al nuovo tier.
7.  **Usage Monitoring**: L'utente può monitorare il proprio utilizzo giornaliero tramite la Dashboard (Next.js), consultando il conteggio dei messaggi e dei token AI.
8.  **Billing Portal**: L'utente può accedere al portale di fatturazione di Stripe direttamente dalla Web App per gestire metodi di pagamento, fatture e cancellare la sottoscrizione (tramite `/api/stripe/billing-portal`).

---

## 🛠️ Components Setup

Questa sezione fornisce una guida dettagliata per la configurazione di ciascun componente del sistema.

### 1. Supabase Database

1.  **Crea un nuovo progetto Supabase**: Vai su [supabase.com](https://supabase.com/) e crea un nuovo progetto.
2.  **Configura il Database**:
    *   Una volta creato il progetto, naviga alla sezione SQL Editor.
    *   Esegui lo script [`db.sql`](./db.sql) per creare tutte le tabelle, funzioni e trigger necessari per gli schemi `public` e `stripe`.
    *   **Abilita Row Level Security (RLS)**: Assicurati che RLS sia abilitato per le tabelle sensibili (es. `users`, `channels`, `subscriptions`, `usage`, `conversation_memory`) e configura le relative policy.
3.  **Configura Auth**:
    *   In Supabase, vai su `Authentication` -> `Settings`.
    *   Abilita i metodi di autenticazione desiderati (es. Email, Google, ecc.).
    *   Aggiungi l'URL di callback per la tua applicazione Next.js (es. `YOUR_NEXTJS_APP_URL/auth/callback`).
4.  **API Keys**: Recupera la `Project URL` e la `Anon Public Key` (o `Service Role Key` per operazioni backend sicure) dalla pagina "API" di Supabase. Saranno necessarie per la configurazione della Web App e di N8N.

### 2. N8N Workflow

1.  **Installazione N8N**:
    *   Puoi ospitare N8N in autonomia (Docker recommended) o utilizzare il servizio cloud N8N.
    *   Riferimento a [docs.n8n.io/getting-started/installation/](https://docs.n8n.io/getting-started/installation/)
2.  **Importa il Workflow**:
    *   Dopo aver installato e avviato N8N, vai nella tua istanza N8N.
    *   Crea un nuovo workflow.
    *   Importa il workflow dal file [`n8n_workflow.json`](./n8n_workflow.json) utilizzando l'opzione "Import from JSON".
3.  **Configura Credenziali N8N**:
    *   **Supabase**: Aggiungi credenziali Supabase (URL del progetto e Anon/Service Key).
    *   **API AI**: Aggiungi credenziali per OpenAI, Gemini (Google Cloud) e Claude (Anthropic).
    *   **WhatsApp/Telegram**: Configura le credenziali per il tuo provider WhatsApp (Webhook URL) e/o il token del bot Telegram.
    *   **Pinecone**: Aggiungi le credenziali per Pinecone (API Key, Environment).
    *   **Google Sheets**: Aggiungi credenziali Google per accedere al foglio di monitoring.
4.  **Attiva il Workflow**: Assicurati che il workflow importato sia "Active" in N8N.

### 3. Web Application Next.js

1.  **Clona il Repository**: Clona il repository del progetto sul tuo sistema locale.
2.  **Installazione Dipendenze**: Naviga nella directory `anthonchat-web` (o la root del tuo progetto Next.js) ed esegui:
    ```bash
    bun install # o npm install o yarn install
    ```
3.  **Configura Variabili d'Ambiente**: Crea un file `.env.local` nella root del progetto e popola con le variabili necessarie (vedi sezione "Environment Configuration").
4.  **Esegui l'Applicazione**: Avvia l'applicazione in modalità di sviluppo:
    ```bash
    bun dev
    ```
    L'applicazione sarà disponibile su `http://localhost:3000`.

### 4. Stripe Integration

1.  **Crea un Account Stripe**: Se non ne hai già uno, crea un account su [stripe.com](https://stripe.com/).
2.  **Configura Prodotti e Prezzi**:
    *   Nel tuo Dashboard Stripe, vai su `Products` e crea i tre prodotti con i relativi prezzi (recurring, mensili):
        *   **Basic**: €9.99/mese
        *   **Standard**: €19.99/mese
        *   **Pro**: €39.99/mese
    *   Assicurati di annotare gli `Price ID` di ogni tier, saranno necessari per le variabili d'ambiente.
3.  **Configura Webhooks**:
    *   Nel Dashboard Stripe, vai su `Developers` -> `Webhooks`.
    *   Aggiungi un nuovo endpoint webhook che punti al tuo endpoint Next.js `/api/stripe/webhooks`.
    *   Scegli gli eventi da ascoltare, almeno: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
    *   **Importante**: Annota la `Webhook Signing Secret`. È fondamentale per la sicurezza e la verifica dei webhook.
4.  **API Keys**: Recupera la tua `Publishable Key` (per il frontend) e la `Secret Key` (per il backend) dalle tue API Keys di Stripe.

---

## ⚙️ Environment Configuration

Le seguenti variabili d'ambiente sono necessarie per il corretto funzionamento dell'applicazione. Crea un file `.env.local` nella root del tuo progetto Next.js e popolalo.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_signing_secret

# Stripe Price IDs (found in Stripe Dashboard for each product)
STRIPE_PRICE_ID_BASIC=price_basic_tier_id
STRIPE_PRICE_ID_STANDARD=price_standard_tier_id
STRIPE_PRICE_ID_PRO=price_pro_tier_id

# N8N (Internal API Key for secure communication from Next.js to N8N, if applicable)
N8N_WEBHOOK_BASE_URL=your_n8n_base_url # Es. per il linking del canale
N8N_API_KEY=your_n8n_api_key_for_secure_endpoint # Se usi endpoint autenticati

# AI Models (needed for N8N setup, not directly in Next.js usually)
# OPENAI_API_KEY=sk-your_openai_key
# GOOGLE_AI_API_KEY=your_google_gemini_key (for Gemini)
# ANTHROPIC_API_KEY=your_anthropic_claude_key
# PINECONE_API_KEY=your_pinecone_api_key
# PINECONE_ENVIRONMENT=your_pinecone_environment

# Google Sheets Logging
# GOOGLE_SHEETS_API_KEY=your_google_sheets_api_key
# GOOGLE_SHEET_ID=your_google_sheet_document_id

# Next.js specific
NEXT_PUBLIC_APP_URL=http://localhost:3000 # Your application's public URL
```

---

## 🚀 Deployment Guide

Questa sezione delinea i passaggi generali per il deployment dell'applicazione in un ambiente di produzione.

### 1. Next.js Web Application

*   **Hosting**: Si consiglia l'hosting su piattaforme come Vercel, Netlify o un server Node.js configurato.
*   **Variabili d'Ambiente**: Assicurati che tutte le variabili d'ambiente elencate in [`Environment Configuration`](#%EF%B8%8F-environment-configuration) siano impostate correttamente nell'ambiente di deployment.
*   **Build**: Esegui la build di produzione.
    ```bash
    bun build
    ```
*   **Server Setup**: Configura il server web (es. Nginx, Apache) come reverse proxy se necessario, oppure affida la gestione al provider di hosting.

### 2. N8N Workflow Engine

*   **Hosting**: N8N può essere deployed in diversi modi:
    *   **Docker/Kubernetes**: Consigliato per scalabilità e isolamento. Utilizza l'immagine Docker ufficiale di N8N.
    *   **N8N Cloud**: Soluzione gestita per deployment rapidi.
*   **Persistenza Dati**: Assicurati che il database di N8N (PostgreSQL o SQLite) sia configurato per la persistenza dei dati e i backup.
*   **Accessibilità**: N8N deve essere accessibile pubblicamente (Webhook URLs) per ricevere messaggi dai provider di canali (WhatsApp, Telegram) e per le chiamate API dal frontend Next.js (es. per il linking dei canali).
*   **Sicurezza**: Configura SSL/TLS per tutte le connessioni in entrata. Protegg i tuoi webhook N8N con chiavi API e/o segreti, verificandoli nella tua logica del workflow.

### 3. Supabase Database

*   **Nessun Deployment Diretto**: Supabase è un servizio gestito, quindi non richiede deployment diretto.
*   **Backup e Monitoraggio**: Configura i backup automatici da Supabase e monitora le prestazioni del database.
*   **Sicurezza RLS**: Verifica che le tue politiche RLS siano applicate correttamente nell'ambiente di produzione.

### 4. Stripe Integration

*   **Nessun Deployment Diretto**: Stripe è un servizio gestito.
*   **Webhooks**: Assicurati che gli endpoint webhook di Stripe puntino all'URL di produzione della tua applicazione Next.js e che la `STRIPE_WEBHOOK_SECRET` sia correttamente configurata.

---

## 📉 UX Friction Analysis

L'analisi dell'attrito utente (UX Friction) è cruciale per migliorare l'esperienza e l'adozione del chatbot.

**Problemi Identificati e Soluzioni Proposte:**

1.  **Frizione: Processo di Linking dei Canali Complicato**
    *   **Problema**: L'associazione di un canale (es. WhatsApp) tramite messaggi specifici e nonce può essere complessa per utenti non tecnici.
    *   **Soluzione Proposta**: Implementare una UI più guidata, con istruzioni chiare passo-passo, progress bar visive e feedback in tempo reale sullo stato del linking. Considerare codici QR o link diretti se supportati dai provider di messaggistica. Aggiungere un contatore del nonce per mostrare quanto tempo manca alla sua scadenza.
2.  **Frizione: Limiti di Rate Limiting non Chiari**
    *   **Problema**: Gli utenti potrebbero raggiungere i limiti di utilizzo senza preavviso, causando frustrazione.
    *   **Soluzione Proposta**: Implementare notifiche proattive (via email o notifica nella dashboard) quando l'utente si avvicina al limite (es. al 80% dell'utilizzo). Mostrare visualmente l'utilizzo corrente sulla dashboard (es. grafico a barre o percentuale).
3.  **Frizione: Difficoltà nella Comprensione dei Modelli AI per Tier**
    *   **Problema**: La distinzione tra Gemini Flash, GPT-4o mini e Claude Opus potrebbe non essere immediatamente chiara in termini di capacità e costo/beneficio.
    *   **Soluzione Proposta**: Fornire una descrizione chiara delle capacità di ciascun modello nella pagina di sottoscrizione, magari con esempi di casi d'uso o benchmark di performance/costo. Educare l'utente sul valore aggiunto di ogni tier.
4.  **Frizione: Debugging Rallentato per Problemi Chatbot**
    *   **Problema**: Quando il chatbot non risponde come previsto, l'utente non ha strumenti per capire il problema.
    *   **Soluzione Proposta**: Nella dashboard, fornire una sezione "Storico Interazioni" dettagliata (con log visibili per l'utente, se appropriato) o un link a una guida di troubleshooting con errori comuni. Per i tier Pro, considerare funzionalità di "debug mode" che forniscono feedback più dettagliato direttamente nel canale di chat (solo per sviluppatori).
5.  **Frizione: Gestione Memoria Conversazioni non Trasparente**
    *   **Problema**: L'utente potrebbe non capire perché il chatbot "dimentica" il contesto dopo un certo numero di scambi.
    *   **Soluzione Proposta**: Spiegare chiaramente i limiti di memoria per tier nella pagina di sottoscrizione e nella documentazione. Offrire suggerimenti su come strutturare le conversazioni o su come ripristinare il contesto se necessario.

---

## 📄 API Documentation

Questa sezione elenca gli endpoint API principali esposti dalla Web Application Next.js. Questi endpoint sono principalmente utilizzati per la gestione dei flussi utente e l'integrazione con servizi esterni come Stripe e N8N.

**Base URL**: `YOUR_APP_URL` (es. `http://localhost:3000`)

### Autenticazione (Supabase Auth)

*   `POST /app/api/auth/callback`: Endpoint di callback per l'autenticazione Supabase.
*   `GET /app/api/auth/signout`: Endpoint per il logout (gestisce la sessione Supabase).

### Gestione Canali

#### `POST /api/link/generate`

*   **Descrizione**: Genera un nonce temporizzato per avviare il processo di collegamento di un nuovo canale (es. WhatsApp, Telegram) all'account utente.
*   **Richiesta**:
    *   Metodo: `POST`
    *   Headers: `Authorization: Bearer <Supabase JWT>`
    *   Body:
        ```json
        {
          "channelType": "whatsapp" // o "telegram"
        }
        ```
*   **Risposta (Successo - 200 OK)**:
    ```json
    {
      "nonce": "unique_temporary_nonce",
      "expiresAt": "ISO_timestamp"
    }
    ```

#### `POST /api/link/start`

*   **Descrizione**: Inizia il processo di linking per un canale (utilizzato internamente, spesso via N8N dopo la ricezione del primo messaggio con nonce).
*   **Richiesta**:
    *   Metodo: `POST`
    *   Body:
        ```json
        {
          "nonce": "unique_temporary_nonce",
          "channelId": "uuid_of_new_channel",
          "providerSpecificId": "whatsapp_phone_number_or_telegram_chat_id"
        }
        ```
*   **Risposta (Successo - 200 OK)**: `{ "status": "pending_validation" }`

#### `GET /api/link/status/[nonce]`

*   **Descrizione**: Controlla lo stato del processo di collegamento di un canale tramite il nonce.
*   **Richiesta**:
    *   Metodo: `GET`
    *   Headers: `Authorization: Bearer <Supabase JWT>`
*   **Risposta (Successo - 200 OK)**:
    ```json
    {
      "status": "linked", // o "pending", "expired", "not_found"
      "channelId": "uuid_of_linked_channel" // Presente solo se 'linked'
    }
    ```

#### `POST /api/link/validate`

*   **Descrizione**: Valida un nonce ricevuto da un messaggio in ingresso (chiamata interna da N8N).
*   **Richiesta**:
    *   Metodo: `POST`
    *   Headers: `X-N8N-API-Key: <N8N_API_KEY>` (se configurata)
    *   Body:
        ```json
        {
          "nonce": "unique_temporary_nonce",
          "providerSpecificId": "whatsapp_phone_number_or_telegram_chat_id"
        }
        ```
*   **Risposta (Successo - 200 OK)**:
    ```json
    {
      "valid": true,
      "userId": "uuid_of_user",
      "channelId": "uuid_of_channel"
    }
    ```
*   **Risposta (Errore - 400 Bad Request)**: `{ "valid": false, "error": "Reason" }`

### Stripe (Payments & Subscriptions)

#### `POST /api/stripe/checkout`

*   **Descrizione**: Crea una sessione di checkout Stripe per l'acquisto di un piano di sottoscrizione.
*   **Richiesta**:
    *   Metodo: `POST`
    *   Headers: `Authorization: Bearer <Supabase JWT>`
    *   Body:
        ```json
        {
          "priceId": "price_id_of_selected_tier" // es. STRIPE_PRICE_ID_BASIC
        }
        ```
*   **Risposta (Successo - 200 OK)**:
    ```json
    {
      "checkoutUrl": "https://checkout.stripe.com/..."
    }
    ```

#### `GET /api/stripe/billing-portal`

*   **Descrizione**: Reindirizza l'utente al portale di fatturazione clienti di Stripe per gestire la propria sottoscrizione (aggiornare metodo di pagamento, cancellare, ecc.).
*   **Richiesta**:
    *   Metodo: `GET`
    *   Headers: `Authorization: Bearer <Supabase JWT>`
*   **Risposta (Reindirizzamento - 303 See Other)**: Reindirizza a Stripe Customer Portal URL.

#### `POST /api/stripe/webhooks`

*   **Descrizione**: Endpoint per la ricezione di eventi webhook da Stripe. Usato per sincronizzare lo stato delle sottoscrizioni e i dati cliente nel database Supabase.
*   **Richiesta**:
    *   Metodo: `POST`
    *   Headers: `Stripe-Signature: <signature>`
    *   Body: Stripe Event Object
*   **Risposta (Successo - 200 OK)**: `{ "received": true }`

---

## ⚠️ Troubleshooting

Questa sezione fornisce una guida per la risoluzione dei problemi comuni che potrebbero verificarsi durante lo sviluppo o l'esecuzione di AnthonChat.

### Problemi Comuni

1.  **Nessuna Risposta dal Chatbot (N8N)**
    *   **Sintomi**: I messaggi vengono inviati ai canali (WhatsApp/Telegram) ma il chatbot non risponde.
    *   **Possibili Cause**:
        *   Webhook N8N non configurato correttamente o non accessibile pubblicamente.
        *   Credenziali AI (OpenAI, Gemini, Claude) non valide in N8N.
        *   Workflow N8N non attivo o con errori interni.
        *   Provider di canale (WhatsApp/Telegram) non collegato correttamente a N8N.
        *   Problemi di rate limiting (utente ha superato il limite giornaliero).
    *   **Soluzione**:
        *   Controlla i log di esecuzione del workflow N8N per errori.
        *   Verifica che l'URL del webhook N8N nell'API del provider sia corretto e raggiungibile.
        *   Controlla che le credenziali API (AI, Supabase, etc.) in N8N siano valide.
        *   Verifica i log di Google Sheets per eventuali errori di logging dal workflow.
        *   Controlla la dashboard Next.js per lo stato del canale (dovrebbe essere `linked`).
2.  **Problemi di Autenticazione (Next.js/Supabase)**
    *   **Sintomi**: Impossibile registrarsi o effettuare il login.
    *   **Possibili Cause**:
        *   `NEXT_PUBLIC_SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_ANON_KEY` non configurate correttamente nel `.env.local`.
        *   URL di reindirizzamento Auth in Supabase non corretto (deve corrispondere a `NEXT_PUBLIC_APP_URL/auth/callback`).
        *   Problemi di RLS sulle tabelle `users` o `auth.users`.
    *   **Soluzione**:
        *   Verifica `.env.local`.
        *   Controlla le impostazioni di autenticazione e i log di Auth nel dashboard Supabase.
        *   Esamina le policy RLS in Supabase.
3.  **Sottoscrizioni Stripe non Sincronizzate**
    *   **Sintomi**: Un utente effettua un pagamento su Stripe ma la sottoscrizione non si aggiorna nella dashboard o nel chatbot.
    *   **Possibili Cause**:
        *   Webhook Stripe non configurato correttamente o non punta all'endpoint `/api/stripe/webhooks` della tua app Next.js.
        *   `STRIPE_WEBHOOK_SECRET` non corrisponde tra Stripe e il `.env.local` dell'app Next.js.
        *   Errori nell'elaborazione del webhook nell'API Next.js.
    *   **Soluzione**:
        *   Controlla i log dei webhook nel dashboard Stripe per vedere se gli eventi vengono inviati e se la tua app li riceve (codice di stato 200).
        *   Verifica i log del server Next.js per errori nell'endpoint `/api/stripe/webhooks`.
        *   Assicurati che `SUPABASE_SERVICE_ROLE_KEY` sia configurata e valida, poiché è richiesta per gli aggiornamenti del database da questo endpoint.
4.  **Limiti di Utilizzo Superati Imprevisti**
    *   **Sintomi**: Il chatbot smette di rispondere o risponde con un messaggio "limite superato" prima del previsto.
    *   **Possibili Cause**:
        *   Errore nel calcolo dell'utilizzo o nel reset quotidiano in N8N.
        *   Incoerenza tra i limiti configurati in N8N e i dati di sottoscrizione in Supabase.
    *   **Soluzione**:
        *   Controlla la logica di rate limiting nel workflow N8N.
        *   Esamina i dati nella tabella `public.usage` su Supabase per verificare il tracciamento corretto.
        *   Verifica che le mappature dei tier ai limiti siano coerenti.

### Debugging Generico

*   **Controlla i Log**: Ogni componente (Next.js, N8N, Supabase) genera log. Sono la prima risorsa per diagnosticare i problemi.
*   **Variabili d'Ambiente**: Ricontrolla sempre le tue variabili d'ambiente. Un errore di battitura o un valore mancante possono causare problemi inaspettati.
*   **Network Tab (Browser)**: Per problemi del frontend, utilizza la tab Network degli strumenti per sviluppatori del browser per ispezionare le chiamate API e le risposte.
*   **Postman/Insomnia**: Utilizza un client API per testare direttamente gli endpoint API di Next.js o i webhook N8N per isolare i problemi.

---

## 📊 Monitoring

Un monitoring efficace è essenziale per la salute e le prestazioni di AnthonChat.

### Logging

*   **Google Sheets**: N8N è configurato per loggare eventi chiave (messaggi in ingresso, risposte AI, errori di rate limiting, errori di sistema) in un Google Sheet dedicato. Questo fornisce una visione aggregata dell'attività del chatbot.
    *   **Setup**: Assicurati che le credenziali Google (per Google Sheets API) siano configurate correttamente in N8N e che il documento Google Sheet specificato per il logging esista e sia accessibile.
*   **Supabase Logs**:
    *   **Database Activity**: Il dashboard Supabase offre strumenti per monitorare le query al database, le metriche di performance e gli errori SQL.
    *   **Auth Logs**: I log di autenticazione di Supabase sono utili per tracciare tentativi di login, registrazioni e problemi di autenticazione.
*   **Next.js Server Logs**: I log generati dalla Web Application (stdout/stderr) sono cruciali per il debug degli endpoint API e dei processi lato server.
*   **N8N (Internal Logs)**: All'interno dell'interfaccia utente di N8N, è possibile visualizzare la cronologia delle esecuzioni del workflow, inclusi gli input, gli output di ogni nodo e gli errori.

### Analytics

*   **Usage Tracking (Supabase `usage` table)**: I dati nella tabella `public.usage` possono essere usati per generare report sull'attività del chatbot, l'adozione dei tier, il consumo di messaggi/token AI e le tendenze di utilizzo nel tempo.
*   **Stripe Dashboard**: Fornisce un'analisi dettagliata delle entrate, delle sottoscrizioni attive, dei churn rate e delle metriche finanziarie.
*   **Provider di Canale (Es. WhatsApp/Telegram)**: Interfacce come quelle di 360dialog o gli strumenti di Telegram per bot possono offrire metriche aggiuntive sull'engagement degli utenti e la consegna dei messaggi.

---

## 🤝 Contributing

Siamo felici di accettare contributi a AnthonChat! Si prega di seguire queste linee guida per garantire un processo di sviluppo collaborativo e senza intoppi.

### Come Contribuire

1.  **Forkare il Repository**: Crea un fork del repository principale.
2.  **Clona il tuo Fork**:
    ```bash
    git clone https://github.com/your-username/anthonchat-web.git
    cd anthonchat-web
    ```
3.  **Crea una Branch Tematica**:
    ```bash
    git checkout -b feature/your-feature-name # per nuove funzionalità
    git checkout -b bugfix/your-bug-name # per correzioni di bug
    ```
4.  **Implementa le Tue Modifiche**: Scrivi il codice e assicurati che sia conforme agli standard di codifica esistenti.
5.  **Test**: Esegui i test esistenti e, se applicabile, aggiungi nuovi test per le tue modifiche.
6.  **Commit delle Modifiche**: Scrivi un messaggio di commit chiaro e conciso.
    ```bash
    git commit -m "feat: Aggiunta nuova funzionalità X"
    ```
7.  **Push al Tuo Fork**:
    ```bash
    git push origin feature/your-feature-name
    ```
8.  **Apri una Pull Request**: Apri una Pull Request dal tuo fork al repository principale. Descrivi dettagliatamente le tue modifiche e il problema che risolvono/funzionalità che aggiungono.

### Standard di Codifica

*   **Next.js**: Segui le best practice di Next.js, utilizzando TypeScript per la maggior parte del codice.
*   **Stile del Codice**: Mantieni uno stile del codice coerente con quello esistente (Prettier ed ESLint sono configurati).
*   **Test**: Scrivi test unitari e di integrazione dove appropriato.
*   **Documentazione**: Aggiorna la documentazione (inclusi questo README e i commenti nel codice) per riflettere le tue modifiche.

---

## ⚙️ Maintenance

La manutenzione regolare è fondamentale per la stabilità, la sicurezza e l'efficienza di AnthonChat.

### Procedure di Manutenzione Regolare

1.  **Aggiornamenti delle Dipendenze**:
    *   **Mensile/Trimestrale**: Controlla e aggiorna regolarmente le dipendenze di Next.js (`package.json`) e N8N. Utilizza strumenti come `bun upgrade` o `npm outdated` e `npm update`.
    *   **Sicurezza**: Prioritizza gli aggiornamenti di sicurezza non appena vengono rilasciati.
2.  **Monitoraggio Prestazioni e Utilizzo**:
    *   **Giornaliero/Settimanale**: Rivedi i log di Google Sheets, le metriche di Supabase e i report di Stripe per identificare anomalie o picchi di utilizzo.
    *   **Soglie**: Imposta soglie di avviso per l'utilizzo delle risorse (es. token AI consumati, spazio DB, traffico N8N).
3.  **Backup del Database**:
    *   **Automatizzato**: Assicurati che i backup automatici di Supabase siano configurati e funzionanti.
    *   **Verifiche**: Periodicamente, testa il processo di ripristino da un backup per assicurarti che i dati possano essere recuperati in caso di disastro.
4.  **Ottimizzazione del Database**:
    *   **Trimestrale**: Rivedi l'utilizzo del disco di Supabase e considera l'indicizzazione di colonne comunemente interrogate per migliorare le prestazioni delle query.
    *   **Pulizia**: Implementa una strategia per l'archiviazione o la pulizia dei dati di conversazione o di utilizzo molto vecchi per mantenere il database snello.
5.  **Revisione dei Modelli AI**:
    *   **Periodica**: I modelli AI si evolvono rapidamente. Rivedi le prestazioni dei modelli AI utilizzati (Gemini, OpenAI, Claude) e valuta se è opportuno fare l'upgrade a nuove versioni o optare per modelli più efficienti/performanti.
    *   **Costo**: Monitora i costi associati all'utilizzo dei modelli AI e ottimizza le chiamate API se necessario.
6.  **Aggiornamenti N8N**:
    *   **Regolare**: Mantieni aggiornato il tuo ambiente N8N all'ultima versione stabile per beneficiare di nuove funzionalità, correzioni di bug e patch di sicurezza.
7.  **Sicurezza**:
    *   **Revisione Credenziali**: Rivedi regolarmente le API key e i segreti utilizzati in `.env.local` e in N8N.
    *   **Misure di Sicurezza**: Sii consapevole delle minacce emergent, specialmente per i webhook e gli endpoint API, e applica misure di sicurezza aggiuntive se necessario.

---

---
_Ultimo aggiornamento: Luglio 2025_