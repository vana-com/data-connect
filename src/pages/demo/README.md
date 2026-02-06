# Demo Flow

Throwaway clickable prototype for recording a video of the grant flow. Uses the real design system components with hardcoded data — no hooks, no Redux, no Tauri, no Privy.

## How to use

```bash
npm run dev
# open http://localhost:5173/demo
```

Click through the flow or jump to any scene from the index.

## Scenes

| #   | Route           | What it shows                                      |
| --- | --------------- | -------------------------------------------------- |
| 1   | `/demo/connect` | "Connect your ChatGPT" — big CTA button            |
| 2   | `/demo/auth`    | Vana Passport sign-in (email + Google + Apple)     |
| 3   | `/demo/consent` | "Allow access to your ChatGPT data" — Allow/Cancel |
| 4   | `/demo/success` | "Rickroll has your ChatGPT data" — done state      |

Navigation: each scene's primary CTA links to the next scene. Cancel/back links return to `/demo`.

## Architecture

- Routes are registered in `src/config/routes.ts` and `src/App.tsx`.
- Demo routes sit **outside** `AppRouter` / `AppContent`, so none of the Tauri hooks (`useEvents`, `useInitialize`, `useDeepLink`, `usePersonalServer`) fire.
- They're still inside the `dotPatternStyle` wrapper so the background pattern renders.
- No `TopNav` — these are standalone scenes.

## Cleanup

Delete `src/pages/demo/` and remove the demo entries from `routes.ts` + `App.tsx`.
