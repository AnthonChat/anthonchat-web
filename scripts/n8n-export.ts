import fs from "fs/promises";
import path from "path";

const N8N_HOST = process.env.N8N_HOST;
const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_PROJECT_ID = process.env.N8N_PROJECT_ID;

if (!N8N_HOST || !N8N_API_KEY) {
	console.error(
		"Error: N8N_HOST and N8N_API_KEY environment variables are required."
	);
	process.exit(1);
}

async function exportWorkflows() {
	try {
		console.log(`Fetching workflows from ${N8N_HOST}...`);
		// Pass projectId as query param if supported, otherwise filter client-side
		// n8n API might support ?projectId=... but let's fetch all and filter to be safe and inspect structure
		const response = await fetch(`${N8N_HOST}/api/v1/workflows`, {
			headers: { "X-N8N-API-KEY": N8N_API_KEY! },
		});

		if (!response.ok) {
			throw new Error(
				`Failed to fetch workflows: ${response.statusText}`
			);
		}

		const { data } = await response.json();
		let workflowsToExport = data;

		if (N8N_PROJECT_ID) {
			console.log(`Filtering for Project ID: ${N8N_PROJECT_ID}`);
			workflowsToExport = data.filter((w: any) => {
				// Check shared array for the project ID
				if (w.shared && Array.isArray(w.shared)) {
					const isInProject = w.shared.some(
						(s: any) => s.projectId === N8N_PROJECT_ID
					);
					return isInProject && w.isArchived !== true;
				}
				return false;
			});

			if (workflowsToExport.length === 0) {
				console.warn(
					`Warning: No workflows matched the Project ID ${N8N_PROJECT_ID}.`
				);
			}
		}

		console.log(`Found ${workflowsToExport.length} workflows to export.`);

		const n8nDir = path.join(process.cwd(), "n8n");
		// Clean directory first? Or just overwrite?
		// Let's keep it additive but maybe we should clean to remove deleted workflows?
		// For now, just mkdir.
		await fs.mkdir(n8nDir, { recursive: true });

		// Track used filenames to handle collisions
		const usedFilenames = new Set<string>();

		for (const workflow of workflowsToExport) {
			// Fetch full details including nodes
			const fullRes = await fetch(
				`${N8N_HOST}/api/v1/workflows/${workflow.id}`,
				{
					headers: { "X-N8N-API-KEY": N8N_API_KEY! },
				}
			);

			if (!fullRes.ok) {
				console.error(
					`Failed to fetch details for workflow ${workflow.id}: ${fullRes.statusText}`
				);
				continue;
			}

			const fullWorkflow = await fullRes.json();

			// Sanitize name: keep alphanumeric, spaces, hyphens, underscores. Replace others with empty string.
			let sanitizedName = fullWorkflow.name
				.replace(/[^a-zA-Z0-9 \-_]/g, "")
				.trim();
			if (!sanitizedName) sanitizedName = "workflow";

			let filename = `${sanitizedName}.json`;

			// Handle collisions
			if (usedFilenames.has(filename)) {
				console.warn(
					`Collision detected for ${filename}. Appending ID.`
				);
				filename = `${sanitizedName}_${fullWorkflow.id}.json`;
			}

			usedFilenames.add(filename);

			// Determine output directory based on tags
			let outputDir = n8nDir;
			const tags = fullWorkflow.tags || [];

			// Convention: 'model' tag -> 'Eval' folder
			const hasModelTag = tags.some((t: any) => t.name === "model");

			if (hasModelTag) {
				outputDir = path.join(n8nDir, "Eval");
				await fs.mkdir(outputDir, { recursive: true });
			}

			const hasMainTag = tags.some((t: any) => t.name === "main");
			if (hasMainTag) {
				outputDir = path.join(n8nDir, "Main");
				await fs.mkdir(outputDir, { recursive: true });
			}

			const filePath = path.join(outputDir, filename);

			await fs.writeFile(filePath, JSON.stringify(fullWorkflow, null, 2));
			console.log(`Exported: ${hasModelTag ? "Eval/" : ""}${filename}`);
		}
	} catch (error) {
		console.error("Export failed:", error);
		process.exit(1);
	}
}

exportWorkflows();
