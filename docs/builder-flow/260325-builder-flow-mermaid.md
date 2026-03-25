# Builder Flow Diagrams

This document breaks the builder workflow into smaller Mermaid diagrams.
The goal is readability first, not completeness in a single canvas.

## 0. FigJam-Friendly Overview

```mermaid
flowchart LR
  A["Open /build"] --> B{"Checks pass?"}
  B -->|"No"| C["Resolve auth, wallet, or Google Drive connection"]
  B -->|"Yes"| D["Choose path"]

  D --> E["Start from app seed input"]
  D --> F["Open user apps dashboard"]

  E --> G["Describe app idea"]
  G --> H["Select data source"]
  H --> I["Analyze seed prompt"]
  I --> J["Prefill app creation store"]
  J --> K["Go to /build/create"]
  K --> L["Complete create wizard"]
  L --> M["Show success page"]
  M --> N["Copy Lovable prompt"]
  N --> O["Finish app manually in Lovable"]

  F --> P["Open existing app"]
  F --> Q["Edit existing app"]
  F --> R["Delete existing app"]
  F --> S["Submit for hackathon or listing"]
```

## 1. High-Level Builder Flow

```mermaid
flowchart TD
  A["/build"] --> B["Connection checks
  auth + wallet + Google Drive"]
  B --> C["App Seed Input"]
  B --> D["User Apps Dashboard"]

  C --> E["Describe app idea"]
  E --> F["Select data source"]
  F --> G["Analyze seed prompt"]
  G --> H["Prefill app creation store"]
  H --> I["Go to /build/create"]

  I --> J["Create wizard"]
  J --> K["Success page"]
  K --> L["Copy Lovable prompt"]
  L --> M["Finish app manually in Lovable"]

  D --> N["Open existing app"]
  D --> O["Edit existing app"]
  D --> P["Delete existing app"]
  D --> Q["Submit for hackathon/listing"]
```

## 2. App Creation Wizard

```mermaid
flowchart TD
  A["Step 1: App Info"] --> B["Validate marketing fields
  name + tagline + description + branding"]
  B --> C["Write values to app creation store"]

  C --> D["Step 2: Data Prompt"]
  D --> E["Load sample data for selected schema"]
  E --> F["Run prompt against sandbox sample"]
  F --> G["Refine dataProcessingPrompt"]

  G --> H["Step 3: Product Description"]
  H --> I["Generate app wallet"]
  I --> J["Fetch relayer public key"]
  J --> K["Encrypt app private key"]
  K --> L["Require connected builder wallet"]
  L --> M["Register grantee onchain"]
  M --> N["Receive granteeId"]
  N --> O["Save app draft to Sanity CMS"]

  O --> P["Step 4: Success"]
  P --> Q["Generate Lovable seed prompt"]
```

## 3. Seed Analysis + Prefill

```mermaid
sequenceDiagram
  participant U as User
  participant B as /build page
  participant S as AppSeedInput
  participant API as /api/apps/analyze-seed
  participant AI as Gemini
  participant Store as AppCreationStore

  U->>B: Open /build
  B->>S: Show seed input
  U->>S: Enter app idea + choose data source
  S->>Store: initializeApp()
  S->>Store: save seedPrompt + schema
  S->>API: POST analyze-seed
  API->>AI: Ask for suggested app config
  AI-->>API: Suggested fields
  API-->>S: JSON suggestions
  S->>Store: save suggested name, descriptions, prompts
  S->>B: Navigate to /build/create
```

## 4. Prompt Sandbox Flow

```mermaid
sequenceDiagram
  participant U as User
  participant Step as StepDataPrompt
  participant Sandbox as SchemaSubpromptSandbox
  participant Samples as /api/sandbox/fetch-samples
  participant Run as /api/sandbox/run-prompt

  U->>Step: Open Data Prompt step
  Step->>Sandbox: Inject selected schema + base prompt
  Sandbox->>Samples: Fetch sample data for schema
  Samples-->>Sandbox: Return sample JSON
  U->>Sandbox: Edit prompt and sample if needed
  U->>Sandbox: Click Run Analysis
  Sandbox->>Run: POST enhanced prompt with sample data
  Run-->>Sandbox: Return JSON result
  Sandbox-->>U: Show analysis output
```

## 5. Onchain Registration + Save

```mermaid
sequenceDiagram
  participant U as User
  participant Step as StepProductDescription
  participant Key as /api/app-creation/relayer-key
  participant Chain as /api/build/register-grantee
  participant CMS as /api/apps

  U->>Step: Submit product description
  Step->>Step: Generate app wallet
  Step->>Key: GET relayer public key
  Key-->>Step: publicKey
  Step->>Step: Encrypt app private key
  Step->>Chain: POST walletAddress + publicKey
  Chain-->>Step: granteeId + tx hash
  Step->>CMS: POST app draft
  CMS-->>Step: saved Sanity document id
  Step-->>U: Success page
```

## 6. Existing Apps Flow

```mermaid
flowchart TD
  A["User Apps Dashboard"] --> B["Fetch my apps"]
  B --> C["List draft / existing apps"]

  C --> D["Open app URL"]
  C --> E["Edit app"]
  C --> F["Delete app"]
  C --> G["Share app"]
  C --> H["Submit for hackathon / listing"]

  E --> I["/build/edit/[id]"]
  I --> J["Load app via /api/apps/[id]?build=true"]
  J --> K["PATCH /api/apps/[id]"]

  F --> L["DELETE /api/apps/[id]"]
```

## Notes

- The current live flow chooses the data source in the seed input on `/build`.
- There is a `step-data-source.tsx` file in the repo, but it is not wired into the current wizard steps.
- The success page does not fully publish the app. It hands off to Lovable for the final manual build/publish flow.
