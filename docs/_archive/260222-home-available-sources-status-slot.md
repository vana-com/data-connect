# Home available sources status slot

## Goal

Move volatile connection/import messaging out of the card CTA label and into the card's top-right info slot to prevent overflow and keep the CTA copy stable.

## What was implemented

- `AvailableSourcesList` now keeps card labels stable (`Connect <source>`).
- Connecting progress is rendered in `SourceStack` `infoSlot` (top-right corner).
- Status line priority:
  1. `run.phase.label` when present.
  2. Normalized `run.statusMessage` fallback.
  3. `"Opening browser…"` default.
- Optional account line (line two):
  - Uses `run.exportData.userInfo.email` when available.
  - Falls back to extracting an email from `run.statusMessage` (regex).
- `SourceStackProps` now includes `infoSlot?: ReactNode`.

## Why this shape

- Bottom row remains concise and scannable.
- Top-right slot is better for dynamic, potentially longer operational copy.
- Connector cards avoid text overflow in the CTA region.

## Follow-up (recommended)

1. Add a first-class account field on `Run` for in-flight status:
   - Candidate: `activeAccount?: string`.
2. Populate that field from `connector-data` events in `useEvents`.
3. Prefer `activeAccount` over status-message parsing in `AvailableSourcesList`.
4. Add tests for:
   - Phase label rendering in top-right slot.
   - Account line rendering when account is present.
   - No account line when unavailable.

## Notes

- Current email extraction from `statusMessage` is an interim fallback.
- Keep `infoSlot` concise: one status line + optional account line, both truncated.
