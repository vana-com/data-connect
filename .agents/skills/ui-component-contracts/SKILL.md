---
name: ui-component-contracts
description: Read and debug UI primitives before editing call sites. Use whenever a React/Tailwind/design-system component behaves unexpectedly, especially for icon or avatar lockups, variant confusion, wrapper misuse, padding/radius/background bugs, mismatched rendered footprints, or any case where inspecting the actual DOM is the fastest way to see which node owns the visual shell versus the inner content.
---

# UI Component Contracts

Fix the primitive before patching the caller.

## Run this workflow

1. Read the primitive and any thin wrapper around it.
2. List the real ownership boundaries:
   - shell/surface
   - layout box
   - padding
   - clipping radius
   - loading state surface
   - typography
   - overlap / spacing
3. Inspect rendered DOM when the bug is visual or the API is ambiguous.
4. Compare the actual rendered nodes on both sides of the broken UI.
5. Change the abstraction seam first.
6. Simplify the call site after the primitive is correct.

## Check before changing anything

- Which node actually draws the visible surface?
- Which props are already forwarded (`className`, `style`, `variant`, text props)?
- Does `size` mean root size or inner content size?
- Does a variant add wrappers, padding, or background?
- Is the content an image, SVG, text fallback, or custom fallback node?

## DOM-first debugging

When a UI still does not make sense, inspect the DOM and compare:

- root classes
- explicit width and height
- margin / overlap styles
- z-index
- whether an inner wrapper appears only for some variants
- whether the content is an `<img>`, SVG, or text node

Drop any theory that the DOM disproves.

## Do not do these

- Do not invent wrapper divs until the primitive truly lacks the seam.
- Do not compensate for bad variant semantics with hacks like `padded` plus `p-0`.
- Do not assume equal prop values produce equal rendered footprints.
- Do not style a wrapper when the primitive root owns the shell.
- Do not mix different text primitives for the same fallback concept.
- Do not invent outer-size math until you have proved the primitive cannot own sizing.

## Variant rules

- Make variant names describe real surface modes.
- Add a new mode when the existing ones are semantically wrong.
- Comment any variant whose structure or sizing model is non-obvious.
- Prefer `plain` / `padded` / `filled` style semantics over vague names.

## Comment only the weird parts

Add one-sentence comments when a reader would otherwise backtrack, for example:

- why a padded image needs an inner wrapper
- why root sizing differs between variants
- why overlap uses visible slice instead of arbitrary negative margin

## Typical failure pattern

1. Patch the caller.
2. Add wrappers.
3. Add compensation math.
4. Discover the primitive semantics were wrong all along.

Avoid that loop.

## Done means

- both sides of a lockup have the same rendered outer footprint
- the intended node owns the shell styling
- variant semantics are internally consistent
- comments exist where the structure is surprising
- tests assert rendered behavior, not just prop values
