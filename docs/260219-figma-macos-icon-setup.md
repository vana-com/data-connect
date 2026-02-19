# Figma Setup for Tori macOS App Icon

This is the exact Figma setup for creating a macOS icon master that looks right in Dock/Finder and works with the current Tauri icon pipeline.

## Scope

- App: Tori (DataConnect repo)
- Build pipeline: `src-tauri/icons/*` generated via `tauri icon`
- Goal: produce a high-quality macOS icon master (not a generic square export)

## Base Frame Recipe (Exact Values)

Create a Figma frame and enclosure with these exact values:

- Frame size: `1024 x 1024`
- Frame background: transparent
- Enclosure shape: rounded rectangle
- Enclosure size: `824 x 824`
- Enclosure position: centered (`X: 100`, `Y: 100`)
- Corner radius: `185.4`
- Corner smoothing: `100%` (continuous/squircle-like corner)

## Required Layer Structure

Use this layer order so handoff is consistent:

1. `icon/base-shadow`
2. `icon/enclosure`
3. `icon/glyph` (or grouped artwork)
4. `icon/highlight` (optional polish)
5. `icon/export-mask` (optional helper, hidden at export)

## Recommended Styling

### Enclosure

- Fill: your brand gradient or solid fill
- Keep strong contrast at edges (Dock icons get viewed very small)

### Shadow (on enclosure)

- Effect type: Drop shadow
- `X: 0`
- `Y: 12`
- Blur: `28`
- Spread: `0`
- Color: `#000000` at `50%` opacity

## Glyph/Artwork Placement Rules

- Keep all important detail inside the `824 x 824` enclosure
- Do not place critical edges right on the boundary
- Maintain visual breathing room so 32px and 16px renders still read
- Avoid tiny strokes and small text (they collapse at app icon sizes)

## Polish Pass (Recommended)

These are optional but usually improve final quality a lot.

### 1) Subtle inner highlight

- Add an inside stroke on the enclosure:
  - Width: `1 px`
  - Color: white at `10-18%`
  - Blend: normal

This gives the enclosure a cleaner edge without looking glossy.

### 2) Size-legibility check

In Figma, preview/export and sanity-check icon readability at:

- `128 x 128`
- `64 x 64`
- `32 x 32`
- `16 x 16`

If the mark gets muddy, simplify the glyph before export.

### 3) Optical centering

If the icon looks low/heavy in Dock previews, nudge glyph up by 2-6 px (optical, not geometric centering).

## Export + Tauri Pipeline

1. Export flattened PNG from Figma:
   - Size: `1024 x 1024`
   - Transparent background
2. Generate Tauri icon set from repo root:
   - `npm run tauri icon /absolute/path/to/tori-icon-1024.png`
3. This updates `src-tauri/icons/` including:
   - `icon.icns` (macOS)
   - `icon.ico` (Windows)
   - `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.png`
4. Build and validate:
   - `npm run tauri:build`
   - Open built `.app` and confirm Dock/Finder appearance

## macOS Behavior Notes

- For this native macOS app flow, do not assume automatic iOS-style corner masking.
- Treat `icon.icns` as final mac presentation; shape and visual balance should be designed in artwork.

## Scalable Formula (If You Change Artboard Size)

For artboard size `S`:

- Enclosure size: `0.8046875 * S`
- Gutter per side: `0.09765625 * S`
- Corner radius: `0.1810546875 * S`
- Shadow Y: `0.01171875 * S`
- Shadow blur: `0.02734375 * S`

## Quick Handoff Checklist

- [ ] Frame is `1024 x 1024` transparent
- [ ] Enclosure is `824 x 824` centered
- [ ] Corner radius is `185.4`, smoothing `100%`
- [ ] Shadow matches `0 / 12 / 28 / 0 / 50% black`
- [ ] Glyph is legible at `32` and `16`
- [ ] Exported `1024` transparent PNG
- [ ] Ran `npm run tauri icon ...`
- [ ] Verified Dock/Finder icon from built app

## Output

- `npm run tauri icon ./public/data_connect_1024_1x.png`
  - Generates/replaces app icon assets in `src-tauri/icons/` from your source PNG (`icon.icns`, `icon.ico`, and PNG size variants). This does not build installers; it only refreshes icon files.
- `npm run tauri:build`
  - Runs the production build flow: builds frontend + sidecar binaries, builds the Tauri app bundle, injects required runtime files, and creates release artifacts (including `.app`/`.dmg` on macOS).

## References

- Tauri icons docs: <https://tauri.app/develop/icons>
- Apple discussion on macOS icon shape behavior: <https://developer.apple.com/forums/thread/670578>
