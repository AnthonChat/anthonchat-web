# n8n DevOps Workflow

This project includes a Git-based workflow for managing n8n workflows. It allows you to export workflows from your n8n instance to the local repository, enabling version control and backup.

## Overview

-   **Script**: `scripts/n8n-export.ts`
-   **Command**: `bun run n8n:export`
-   **Output Directory**: `n8n/`

## Configuration

The export script relies on the following environment variables in your `.env` file:

| Variable         | Description                       | Example                      |
| :--------------- | :-------------------------------- | :--------------------------- |
| `N8N_HOST`       | Base URL of your n8n instance     | `https://n8n.yourdomain.com` |
| `N8N_API_KEY`    | Your n8n API Key (Settings > API) | `n8n_api_...`                |
| `N8N_PROJECT_ID` | The ID of the project to export   | `w51XaKZpdbYjr1WH`           |

## Features

### 1. Project Filtering

The script only exports workflows that belong to the project specified by `N8N_PROJECT_ID`. It checks the `shared` metadata of the workflow to confirm ownership.

### 2. Archive Exclusion

Workflows that are marked as archived (`isArchived: true`) are automatically excluded from the export.

### 3. Smart Filenames

Workflows are saved using their name (sanitized for file systems).

-   **Example**: "My Workflow" -> `My Workflow.json`
-   **Collision Handling**: If multiple workflows have the same name, the script appends the Workflow ID to prevent overwriting (e.g., `My Workflow_12345.json`).

### 4. Folder Convention

The script supports a tag-based folder structure:

-   **Eval Folder**: Any workflow with the tag **`model`** is automatically saved to the `n8n/Eval/` subdirectory.
-   All other workflows are saved to the root `n8n/` directory.

## Usage

1.  **Develop**: Create or modify workflows in the n8n UI.
2.  **Organize**:
    -   Ensure the workflow belongs to the correct Project.
    -   Add the `model` tag if you want it to appear in the `Eval` folder.
3.  **Export**: Run the export command:
    ```bash
    bun run n8n:export
    ```
4.  **Commit**: Review the changes in `n8n/` and commit them to Git.

## Troubleshooting

-   **"No workflows matched"**: Verify your `N8N_PROJECT_ID` is correct and that the workflows are shared with that project.
-   **"Collision detected"**: This means you have duplicate workflow names. The script handles this safely, but consider renaming them in n8n for clarity.
