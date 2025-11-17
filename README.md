# Agentic Testing Scaffold

This repository contains a TypeScript implementation of an agentic, self-healing web test runner inspired by the ChatGPT-style virtual browsing workflow described in the project brief. The goal is to provide an executable skeleton that demonstrates how tests written in natural language text files can be parsed, planned, executed (via a placeholder Playwright MCP client), and reported.

## Key Features

- **Test Parser** – Reads `tests/*.txt` files and converts them into structured objects (`tests/TestParser.ts`).
- **Planner & Executor** – Turns parsed steps into executable plans and runs them through the Observe → Think → Act loop (`agent/TestPlanner.ts`, `agent/StepExecutor.ts`). A Nova Lite-powered thinker (`agent/NovaLiteThinker.ts`) determines the next action from the observed state.
- **Locator Strategy & Self-Healing** – Provides layered locator candidates with caching for healed locators (`locators/LocatorStrategy.ts`, `locators/SelfHealingLocator.ts`).
- **Failure Analysis** – Routes failed steps through a Nova Lite-powered classifier (`analysis/FailureAnalyzer.ts`).
- **Reporting** – Generates HTML, JSON, Markdown, and healing insight reports under `artifacts/`.

## Running the Scaffold

1. Ensure Node.js 18+ and TypeScript are available in your environment.
2. Install dependencies (optional when the TypeScript compiler is available globally):
   ```bash
   npm install
   ```
3. Compile the TypeScript sources:
   ```bash
   npm run build
   ```

`AgentRunner` can be instantiated programmatically via `AgentRunner.fromConfig('config/agent.config.json')` and then `runFromDirectory()` to produce reports for all `.txt` test definitions.

## Configuring Amazon Bedrock Nova Lite

The agent relies on Amazon Bedrock Nova Lite both for planning the next action and for failure analysis. Provide credentials in one of two ways:

1. Populate the `novaLite` block inside `config/agent.config.json` to set the region, model ID, token limits, and sampling parameters.
2. Export standard AWS environment variables so the lightweight SigV4 client (`llm/NovaLiteClient.ts`) can sign requests:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_SESSION_TOKEN` (if using temporary credentials)
   - `AWS_REGION` (overrides the config file when set)

Without credentials the runner gracefully falls back to heuristic plans and failure analysis, but Nova Lite is required for full agentic reasoning.
