# Plan: End-to-End (E2E) Testing for n8n Logic

## Objective

Implement an automated testing strategy to verify the correctness of the n8n-based AI logic. Since the logic resides outside the Next.js app, we need a script that treats the n8n webhook as a black box and asserts its behavior.

## Why This Matters

-   **Regression Testing**: Ensure new prompts or logic changes don't break basic chat functionality.
-   **Integration Check**: Verifies the entire chain: `Script -> n8n -> Supabase -> OpenRouter -> n8n -> Script`.

## Proposed Solution

Create a standalone test script `scripts/test-workflow.ts` that simulates a user message and checks the response.

### 1. Test Scenarios

We should test at least these critical paths:

1.  **Basic Chat**: Send "Hello", expect a non-empty string response.
2.  **Context/Memory**: Send "My name is [TestName]", then "What is my name?", expect "[TestName]" in response.
3.  **Commands**: Send `/help`, expect help text.
4.  **Rate Limiting**: (Optional/Advanced) Send >N messages and expect a block message (requires a test user with low limits).

### 2. Implementation Details

**File:** `scripts/test-workflow.ts`

```typescript
import { config } from "dotenv";
config();

const WEBHOOK_URL = process.env.N8N_TEST_WEBHOOK_URL; // Use the "Test" workflow URL
const TEST_USER_ID = "e2e-test-user-" + Date.now(); // Unique ID to avoid history pollution

async function runTest(
	name: string,
	input: string,
	expectedKeywords: string[]
) {
	console.log(`\n🧪 Test: ${name}`);
	console.log(`   Input: "${input}"`);

	const payload = {
		message: input,
		id: TEST_USER_ID,
		channel: "telegram", // Simulate Telegram
		type: "text",
	};

	const start = Date.now();
	try {
		const res = await fetch(WEBHOOK_URL!, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

		const data = await res.json(); // Assuming n8n returns JSON { response: "..." }
		const output = data.response || JSON.stringify(data);
		const duration = Date.now() - start;

		console.log(
			`   Output: "${output.substring(0, 100)}..." (${duration}ms)`
		);

		// Assertions
		const passed = expectedKeywords.some((k) =>
			output.toLowerCase().includes(k.toLowerCase())
		);

		if (passed) {
			console.log(`   ✅ PASSED`);
		} else {
			console.error(
				`   ❌ FAILED: Expected to find one of [${expectedKeywords.join(
					", "
				)}]`
			);
			process.exit(1);
		}
	} catch (error) {
		console.error(`   ❌ ERROR:`, error);
		process.exit(1);
	}
}

async function main() {
	if (!WEBHOOK_URL) {
		console.error("Missing N8N_TEST_WEBHOOK_URL env var");
		process.exit(1);
	}

	// 1. Basic Greeting
	await runTest("Greeting", "Hello Anthon", ["hello", "ciao", "hi"]);

	// 2. Command
	await runTest("Help Command", "/help", ["commands", "support", "guide"]);

	console.log("\n✨ All tests passed!");
}

main();
```

### 3. Integration

-   **Environment**: Add `N8N_TEST_WEBHOOK_URL` to `.env`.
-   **NPM Script**: Add `"test:e2e": "bun scripts/test-workflow.ts"` to `package.json`.
-   **CI/CD**: Run this step in GitHub Actions _after_ deploying the workflow (if using a staging instance).

## Future Enhancements

-   **Mocking**: For pure logic testing without cost, mock the OpenRouter node in n8n (using a "Switch" node based on a header).
-   **Cleanup**: Have a teardown step that deletes the `TEST_USER_ID` data from Supabase to keep the DB clean.
