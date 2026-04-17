# AKeyless Extension for Azure DevOps — Copilot Instructions

## Repository overview

This repository packages an **Azure DevOps Marketplace extension** (`vss-extension.json`, publisher `LancelotSoftware`, id `akeyless-extensions`) that ships one or more pipeline tasks for retrieving secrets from an [Akeyless](https://www.akeyless.io/) vault.

- `vss-extension.json` — extension manifest (version, publisher, contributions, files included in the `.vsix`).
- `tasks/` — one subfolder per pipeline task. Each task is self-contained with its own `task.json`, `package.json`, `src/`, and `_tests_/`.
- `tasks/akeyless-secrets/` — the only task today. Node 20 task (`Node20_1` execution target) that authenticates with Akeyless using an Azure-issued JWT and emits pipeline output variables for static and dynamic secrets.
- `azure-pipelines.yml` — end-to-end "proof" pipeline that exercises the published task on Windows and Linux agents.
- `.github/workflows/` — `main.yml` (CI: lint + tests on PR/push), `releases.yml` (publish to Marketplace), `dependabot-auto-merge.yml`.
- `docs/` — user-facing setup and tutorial docs referenced from `README.md` and `task.json` help links.
- `images/` — Marketplace icon and screenshots referenced by `vss-extension.json`.

## Task architecture (`tasks/akeyless-secrets/src/`)

Entry point is `index.js`. The flow is intentionally split across small modules so each can be unit-tested in isolation:

1. `input.js` — reads and validates inputs from `task.json` via `azure-pipelines-task-lib`.
2. `akeyless_api.js` — constructs the Akeyless SDK client against the configured `apiUrl`.
3. `auth.js` — exchanges the Azure JWT for an Akeyless token.
4. `secrets.js` — `getStatic` and `getDynamic`. Writes pipeline output variables using `##vso[task.setvariable …;isoutput=true;issecret=true]`. Handles autogeneration of per-key outputs for dynamic secrets and base64 encoding for multiline values on Linux/macOS agents (Azure DevOps rejects multiline secret variables on those OSes).
5. `helpers.js` — shared logging/failure helpers.

Every input/output name and behavior is documented in the root `README.md`. Keep the README, `task.json` `helpMarkDown`, and code in sync when changing inputs or output naming rules.

## Conventions

- **Language & runtime**: JavaScript (CommonJS `require`), targeting Node 20 (the AzDO agent runtime declared in `task.json`). Do not introduce TypeScript or ESM without updating `task.json`, Jest, and ESLint config.
- **Formatting**: Prettier (`.prettierrc.json` in the task folder). Run `npm run format`.
- **Linting**: ESLint flat config (`eslint.config.mjs`). Run `npm run lint`. Fix lint errors rather than disabling rules.
- **Tests**: Jest, in `tasks/akeyless-secrets/_tests_/`. Tests mock `azure-pipelines-task-lib` and the Akeyless SDK; never make real network calls. Run `npm test`, `npm run test:verbose`, or `npm run test:coverage`.
- **Pre-commit**: `npm run precommit` runs `npm ci && format && lint && test:coverage`. Run it before opening a PR that touches `tasks/akeyless-secrets/`.
- **Secrets in code/tests**: Use obviously fake placeholders (`p-123456`, `fake-jwt`, etc.). Never commit a real Akeyless access ID, JWT, or secret value, and never log full secret values from the task — always mark output variables with `issecret=true`.
- **Output variable contract**: For static secrets the output name is the dictionary value the user supplied. For dynamic secrets there is always a "plain" output with the full JSON, plus (when `autogenerate=true`) recursively flattened `<prefix>_<path>` outputs. For multiline values on non-Windows agents, also emit `<outputName>_ENCODING=base64`. Changing any of this is a breaking change for consumers — bump the task `Major` version and document migration in the README.

## Versioning & release

Two version numbers must be kept consistent:

- `tasks/akeyless-secrets/task.json` → `version` object (`Major`/`Minor`/`Patch`). The `Major` is what consumers reference (`akeyless-secrets@1`).
- `vss-extension.json` → `version` string (`x.y.z`) for the Marketplace package.

Helper scripts in `tasks/akeyless-secrets/package.json` (`bump-task-version`, `bump-vsx-version`, `package-bump-version`) bump both and produce the `.vsix`. Prefer those over hand-editing. Do not commit generated `.vsix` artifacts or changes to `tasks/akeyless-secrets/.taskkey` (the package script restores it).

Bump rules:
- **Patch**: bug fix, no input/output contract change.
- **Minor**: new optional input or new additive output, fully backward compatible.
- **Major**: removed/renamed input, changed default behavior, changed output naming, or runtime upgrade (e.g. Node version).

## When making changes

- Touch one task at a time; do not refactor across tasks unless asked.
- If you add or rename a `task.json` input, update: `README.md` Inputs table, the input's `helpMarkDown`, `input.js` parsing, tests, and the `azure-pipelines.yml` proof pipeline if useful coverage is missing.
- Preserve cross-platform behavior. The proof pipeline runs on `windows-latest` and `ubuntu-latest`; multiline-secret handling differs by OS and is exercised there.
- Keep external-facing logs friendly and emoji-prefixed to match the existing style (`🔔`, `🔒`, `✅`, `❌`) — pipeline logs are the primary UX for this task.
- Documentation-only changes (`README.md`, `docs/`, this file) do not require running the Jest suite, but should still be spell-checked and have working links.

## What this repo is NOT

- Not a library published to npm — the only consumable artifact is the `.vsix` on the Visual Studio Marketplace.
- Not a general-purpose Akeyless client — scope is strictly "fetch secrets and expose them as Azure Pipelines variables".
- Not affiliated with Akeyless Inc. Akeyless ships their own [official AzDO extension](https://docs.akeyless.io/docs/akeyless-azure-devops-extension); this one predates it and is independently maintained.
