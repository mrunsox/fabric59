# Fabric59 Prompt Library

This directory holds every system prompt the platform sends to AI models.
Every change must be recorded in the prompt's own header.

## Conventions

- File name: `kebab-case.txt`
- Header (top of file):
  - `# <Title>`
  - `Version: <semver>`
  - `Last Updated: <YYYY-MM-DD>`
  - `Owner: <team>`
  - `Safety: [SAFETY] | [USER-FACING] | [INTERNAL]`
  - `Change Log:`
- Body: the prompt text, no extra markdown wrappers.

## Safety Labels

- `[SAFETY]` — prompt enforces guardrails (no legal advice, no PII leakage, etc.).
- `[USER-FACING]` — output is shown directly to a customer or agent.
- `[INTERNAL]` — output is consumed by the platform (parsed, summarized, logged).

## Index

| Prompt | Used By | Safety |
|---|---|---|
| `assistant-system.txt` | `assistant-chat` edge function | [SAFETY] [USER-FACING] |
| `legal-connect-context.txt` | `legal-connect-ai` edge function | [SAFETY] [USER-FACING] |
| `call-flow-builder.txt` | `ai-call-flow` edge function | [INTERNAL] |
| `script-generator.txt` | `generate-script` edge function | [INTERNAL] |

## Adding a New Prompt

1. Create the file with the header.
2. Add a row in the table above.
3. Reference it from the consuming edge function with a comment pointing back here.
