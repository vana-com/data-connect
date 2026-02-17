# Passport Auth Rebuild

## Source
- `docs/plans/260217-passport-auth-rebuild-plan.md`

## Goals
- Rebuild passport auth conversion from clean `main` with lower rework and clearer reviewability.
- Execute work in phase-gated slices with explicit invariants and exit gates.
- Reuse known-good prior-branch behavior selectively, without reintroducing legacy coupling.
- Keep strict URL allowlist behavior blocked until upstream contract freeze is explicit.

## Constraints
- React frontend only (`src/`)
- Preserve existing styles and classes
- Don't overwrite existing comments
- No UX changes beyond what the source doc calls out

## Acceptance criteria
- Auth callback boundary is isolated and abuse-path protections are test-backed.
- Grant flow is decomposed into clear seams with transition-focused tests.
- Durable auth + resume behavior is implemented without secret-at-rest persistence.
- Deep-link normalization is deterministic, with bounded compatibility behavior while upstream contract is unresolved.
- Legacy auth surfaces are removed only after replacement paths are validated.
- Each delivered slice satisfies its phase exit gate with relevant tests green.
