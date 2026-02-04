# Platform System

One place for platform metadata and the helpers that render it.

## Where things live

- `registry.ts`: canonical platform metadata (data only, includes `iconKey`)
- `utils.ts`: lookup + resolve helpers (no UI)
- `icons.ts`: icon component lookup (registry id → component)
- `ui.ts`: UI helpers (display names, icon classes, run labels)

## Data flow (mental model)

1. **Connectors** define runtime platforms in `connectors/*.json` (loaded by Tauri).
2. **Registry** maps those platform ids/names/aliases to canonical metadata.
3. **UI helpers** convert metadata into display props (icon, className, labels).

## When to use what

- Need to resolve a platform by id/name/company → `utils.ts`
- Need connect list entries or availability state → `utils.ts`
- Need an icon component → `icons.ts`
- Need UI display props (`icon`, `iconClassName`, `displayName`) → `ui.ts`

## Add a new platform (fast path)

1. Add connector metadata JSON under `connectors/<company>/<id>.json`.
2. Add a registry entry in `registry.ts`:
   - `id`, `displayName`, `iconEmoji`
   - `platformIds` (connector ids)
   - `availability`, `showInConnectList`, `ingestScope` (if needed)
3. Add an icon component and wire it into the entry (optional).

## Notes

- Styling is derived from availability in `ui.ts`. Registry does not store classes.
- If a platform exists at runtime but isn’t in the registry, UI falls back to
  a generic icon + name.

## To assign an icon to a platform

1. Make sure the platform resolves to a registry entry
   In src/lib/platform/registry.ts, ensure the entry matches your platform:
   platformIds contains the connector id, or
   aliases matches name/company, or
   id matches directly.
2. Set iconKey in the registry entry
   Example: iconKey: "chatgpt".
3. Map iconKey → component in src/lib/platform/icons.ts
   Add it in PLATFORM_ICON_COMPONENTS using a component from src/components/icons.
   That’s it. The home page uses getPlatformIconComponent, so it updates automatically.
