// Test Script per il flusso di registrazione sicuro
// Usage: node test-registration-flow.js

const API_BASE = "http://localhost:3000/api";

async function testRegistrationFlow() {
  console.log("🧪 Test Flusso Registrazione Sicuro\n");

  try {
    // 1️⃣ Test generazione link registrazione
    console.log("1️⃣ Generazione link registrazione...");
    const generateResponse = await fetch(`${API_BASE}/link/generate-registration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel_id: "telegram",
        user_handle: "@testuser123",
        message_info: {
          first_message: "Ciao, voglio registrarmi!",
          timestamp: new Date().toISOString()
        }
      })
    });

    if (!generateResponse.ok) {
      throw new Error(`Generate API failed: ${generateResponse.status} ${await generateResponse.text()}`);
    }

    const generateData = await generateResponse.json();
    console.log("✅ Link generato con successo:");
    console.log(`   Nonce: ${generateData.nonce.substring(0, 8)}...`);
    console.log(`   URL: ${generateData.signup_url}`);
    console.log(`   Scade: ${generateData.expires_at}`);
    console.log();

    // 2️⃣ Test validazione link
    console.log("2️⃣ Validazione link generato...");
    const validateResponse = await fetch(`${API_BASE}/link/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nonce: generateData.nonce,
        channelId: "telegram"
      })
    });

    if (!validateResponse.ok) {
      throw new Error(`Validate API failed: ${validateResponse.status} ${await validateResponse.text()}`);
    }

    const validateData = await validateResponse.json();
    console.log("✅ Validazione completata:");
    console.log(`   Link valido: ${validateData.isValid}`);
    console.log(`   È registrazione: ${validateData.isRegistration}`);
    console.log(`   Channel ID: ${validateData.channelId}`);
    console.log();

    // 3️⃣ Test validazione con dati errati
    console.log("3️⃣ Test validazione con nonce falso...");
    const invalidResponse = await fetch(`${API_BASE}/link/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nonce: "fake-nonce-123",
        channelId: "telegram"
      })
    });

    const invalidData = await invalidResponse.json();
    console.log("✅ Validazione nonce falso:");
    console.log(`   Link valido: ${invalidData.isValid} (deve essere false)`);
    console.log();

    // 4️⃣ Test duplicati
    console.log("4️⃣ Test prevenzione duplicati...");
    const duplicateResponse = await fetch(`${API_BASE}/link/generate-registration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel_id: "telegram",
        user_handle: "@testuser123", // Stesso handle
        message_info: { first_message: "Altro messaggio" }
      })
    });

    const duplicateData = await duplicateResponse.json();
    console.log("✅ Test duplicati:");
    console.log(`   Stesso nonce: ${generateData.nonce === duplicateData.nonce}`);
    console.log(`   Messaggio: ${duplicateData.message || "Nuovo link generato"}`);
    console.log();

    console.log("🎉 Tutti i test completati con successo!");
    console.log("\n📋 Prossimi passi:");
    console.log("1. Copia uno degli URL generati");
    console.log("2. Aprilo nel browser");
    console.log("3. Verifica che mostri 'Link valido - Il tuo canale telegram verrà collegato automaticamente'");
    console.log("4. Completa la registrazione per testare il collegamento");

  } catch (error) {
    console.error("❌ Test fallito:", error.message);
    console.log("\n🔧 Possibili soluzioni:");
    console.log("1. Verifica che il server sia in esecuzione (npm run dev)");
    console.log("2. Controlla che SUPABASE_SERVICE_ROLE_KEY sia configurato");
    console.log("3. Esegui la migrazione database se non già fatto");
    console.log("4. Controlla i logs del server per errori specifici");
  }
}

// Esegui test
testRegistrationFlow();