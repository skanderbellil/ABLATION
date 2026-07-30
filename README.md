# ABLATION

A personal web app for running pre-registered N-of-1 trials on yourself.
Remove or change exactly one variable, commit to predictions before you have
data, log daily, and get an honest verdict at the end. A null result is a
legitimate outcome. Not a habit tracker.

## Stack

Vite + React + TypeScript. No backend, no charting library, no UI framework —
plain CSS custom properties and hand-written SVG. All data stays on the
device in `localStorage` (namespaced `ablation:v1:*`) behind a `Store`
interface (`src/store/store.ts`).

## Development

```sh
npm install
npm run dev      # serves at /
npm run build    # type-check + production build
```

The deploy build sets `BASE_PATH=/ABLATION/` (see
`.github/workflows/deploy.yml`); pushes to `main` deploy to GitHub Pages via
`actions/deploy-pages`. Icons are generated, dependency-free, by
`npm run icons`.

To enable Pages: repository Settings → Pages → Source: **GitHub Actions**.

## Releases

Bump `VERSION` in `public/sw.js` on each release so installed PWAs drop the
stale app shell.

## Design intent

- **Locked pre-registration.** Committing a protocol hashes the prediction
  block (SHA-256, first 8 hex chars) into a fingerprint shown on every
  screen. The prereg is immutable afterwards — enforced in the storage layer,
  not just the UI. Changing predictions means abandoning the trial, and
  abandoned trials stay in the archive.
- **No inferential statistics.** Means, deltas and observation counts only.
  Daily self-report from one person is autocorrelated; naive tests overstate
  significance, so none are computed.
- **Verdict is sealed** until the protocol end date.
- **Protocols are data.** Templates live in `src/templates/`; nothing outside
  that directory references any specific substance or behaviour.
- **Honest about notifications.** Installed iOS PWAs cannot schedule local
  notifications and web push needs a server this app doesn't have, so the
  app offers copyable reminder text for iOS Reminders instead of pretending.
