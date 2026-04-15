# Platform System

One place for platform metadata and the helpers that render it.

## Where things live

- `registry.ts`: platform registry types plus local coming-soon entries
- `registry.generated.ts`: generated connector-backed platform entries
- `registry.overlay.json`: app-policy overlay for generated connector-backed entries
- `utils.ts`: lookup + resolve helpers (no UI)
- `icons.ts`: icon component lookup (registry id → component)
- `ui.ts`: UI helpers (run labels, icon fallback component)

## Data flow (mental model)

1. **data-connectors** publishes canonical signed connector artifacts plus `connector-index.json`.
2. **connectors/lock.json** pins the bundled connector versions this app vendors.
3. **Bundled connector manifests** provide the canonical consumer metadata used at runtime.
4. **registry.overlay.json** adds Data Connect policy fields like `showInConnectList`.
5. **registry.generated.ts** merges those into connector-backed platform entries.
6. **UI helpers** convert metadata into runtime display behavior (icons, labels).

## When to use what

- Need to resolve a platform by id/name/company → `utils.ts`
- Need ingest scope by platform id → `utils.ts`
- Need an icon component → `icons.ts`
- Need run label / icon component fallback → `ui.ts`

## Add a new platform (fast path)

1. Add connector metadata JSON under `connectors/<company>/<id>.json`.
2. Add the connector/version to `connectors/connector-dependencies.json`.
3. Add a minimal overlay entry in `registry.overlay.json`:
   - `connectorId`
   - `showInConnectList`
   - local `id` only if it intentionally differs from upstream `source_id`
   - optional local overrides like `defaultScope`, `aliases`, or `iconKey`
4. Run `node scripts/resolve-connectors.js` and `node scripts/generate-platform-registry.js`.
5. Add an icon component and wire it into the entry only if you need a custom local icon.

## Notes

- Styling is derived from availability in `ui.ts`. Registry does not store classes.
- If a platform exists at runtime but isn’t in the registry, UI falls back to
  a generic icon + name.

## To assign an icon to a platform

1. Make sure the platform resolves to a registry entry
   In src/lib/platform/registry.generated.ts or src/lib/platform/registry.ts, ensure the entry matches your platform:
   platformIds contains the connector id, or
   aliases matches name/company, or
   id matches directly.
2. Set iconKey in the registry entry
   Prefer upstream `consumer_metadata.icon_key`; use a local overlay override only when needed.
3. Map iconKey → component in src/lib/platform/icons.ts
   Add it in PLATFORM_ICON_COMPONENTS using a component from src/components/icons.
   That’s it. The home page uses getPlatformIconComponent, so it updates automatically.
