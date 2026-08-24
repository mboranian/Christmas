# Christmas Lists

A shared Christmas wishlist app for the family, live at **[780christmas.com](https://780christmas.com)**.

Everyone keeps their own wishlist. Anyone can browse someone else's list and check off an
item they intend to buy, which quietly adds it to their own "Gifts I'm Giving" tracker so
two people don't buy the same thing. Lists sync between devices in real time.

Each Christmas is kept separately. The year picker beside "All Lists" switches seasons;
only the current year can be edited, and earlier years are frozen as a record.

Built with Create React App (React 19 + TypeScript), backed by Firebase Firestore, hosted
on GitHub Pages.

---

## Running locally

```bash
npm install
npm start
```

Runs on **port 3001** (not CRA's default 3000 — set in the `start` script). `.env` sets
`BROWSER=none` so it won't grab a browser window on start.

```bash
npm test                        # watch mode
CI=true npm test -- --watchAll=false   # once, as CI runs it
npm run build                   # production build into ./build
```

71 tests cover sign-in, the list and gift mutations, PDF export, password
hashing, the error boundary, the per-season paths and read-only archives, and
the storage layer including the migration fallback. CI blocks a deploy when any of them fail, so they're the safety net
for changes to this app.

## Deploying

**Push to `main` and you're done.** [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
runs the tests, builds, and publishes to GitHub Pages. Nothing needs to be built or
committed by hand.

Two things worth knowing:

- **Lint warnings fail the build.** Actions sets `CI=true`, and CRA escalates warnings to
  errors under CI. An unused variable is enough to block a deploy. Run
  `CI=true npm run build` locally if you want to check before pushing.
- **The custom domain lives in [`public/CNAME`](public/CNAME).** CRA copies `public/` into
  the build output, so the domain survives each deploy. Don't delete that file.

Pages is configured to deploy from GitHub Actions (Settings → Pages → Source). Earlier
versions of this repo committed the built site into a `docs/` folder and served it from the
branch — that's gone, and build output is no longer tracked in git.

## Passwords

Write passwords in plain English in **`passwords.json`** at the repo root. That file is
gitignored and never leaves your machine:

```json
{
  "andy": "their password",
  "elena": "their password"
}
```

`scripts/generate-password-hashes.js` turns it into
[`src/types/passwordHashes.ts`](src/types/passwordHashes.ts) — SHA-256 hashes only, which
*is* committed and is what the app actually checks against. It runs automatically before
`npm start` and `npm run build`, or on demand:

```bash
npm run passwords
```

Copy `passwords.example.json` to `passwords.json` to get started. Never edit
`passwordHashes.ts` by hand; it's overwritten.

**The one trap:** change a password, commit, and push *without* building, and the deploy
still carries the old hash. `npm run build` or `npm test` locally will catch it — there's a
test that fails when `passwords.json` and the generated hashes disagree. That test skips in
CI, which clones without the plaintext file.

A user missing from `passwords.json` keeps whatever hash was generated before, so a
partly-filled file can't lock anyone out. And if `passwords.json` is absent entirely — as
in CI — the generator leaves the committed hashes untouched rather than wiping them.

### Adding a family member

1. Add an entry to `USERS` in [`src/types/index.ts`](src/types/index.ts) with a lowercase
   `id` and a display `name`.
2. Add the same `id` to `passwords.json` with their password.
3. Run `npm run passwords` and commit the regenerated hash file.

There's no signup flow and no Firebase Auth — the roster is hardcoded, and sign-in just
compares a SHA-256 hash of what was typed against the table.

## Firebase

Project **`christmas-lists-41c76`**. Config is committed in
[`src/config/firebase.ts`](src/config/firebase.ts) — that's normal for Firebase web keys,
which are identifiers rather than secrets.

Three Firestore collections:

| Path | Holds |
|---|---|
| `christmas-lists/{userId}` | that user's **2025** wishlist |
| `christmas-lists/{year}/lists/{userId}` | their wishlist for 2026 onward |
| `gifts-giving/{userId}` | what they planned to give in **2025** |
| `gifts-giving/{year}/users/{userId}` | what they plan to give in 2026 onward |
| `user-prefs/{userId}` | small per-user settings, not year-specific |

2025 keeps the original unversioned paths because its data predates the year
picker — so adding seasons required no migration, and the archive can't be
disturbed. Later seasons live in a subcollection under a year document. Both sit
inside the existing top-level collections, so the recursive `{document=**}`
security rules already cover them; no rules change was needed.

Seasons come from `src/types/index.ts`: `FIRST_SEASON_YEAR` is 2025 and the
current season is just `new Date().getFullYear()`, so the picker gains a year and
the previous one freezes automatically each 1 January. Archived years are
enforced in two places — the UI hides every control, and `storage.ts` throws on
any write to a past year.

Lists originally lived in a single `christmas-lists/all-lists` document holding
an array of all seven, which meant two people editing at once overwrote each
other. They're now one document per user, written inside a transaction. The old
document is still read as a fallback, so a user's entry there is used until they
make their first edit — at which point their own document takes over. Once every
name has its own document, `all-lists` is inert and can be deleted from the
console.

Writes reject if they don't reach Firestore, and the app shows a banner saying
the change wasn't saved. That means edits now fail while offline rather than
appearing to succeed and then vanishing.

Security rules aren't in this repo — they're edited in the Firebase console. See
[FIRESTORE_RULES_SETUP.md](FIRESTORE_RULES_SETUP.md) for the current setup and how to
change them.

## Security posture — read this before trusting it with a secret

This app is built for convenience among family, not privacy. Specifically:

- **All data is world-readable.** Firestore rules allow unauthenticated read/write, so
  anyone who finds the project can read every list and every gift plan.
- **The "Secret Santas" toggle is cosmetic.** It hides giver names in the UI, but the raw
  `checkedBy` array ships to the browser. Anyone with devtools can see who's buying what.
- **Passwords are weakly protected.** Unsalted SHA-256 hashes are in the client bundle and
  are reversible by lookup for anything guessable. They keep the family honest; they won't
  stop a stranger.

Fine for wishlists. Don't put anything genuinely sensitive in here.

## Layout

```
src/
  App.tsx                     sign-in vs. dashboard, snow animation
  components/
    ErrorBoundary.tsx         catches render errors so the page isn't blank
    SignInPage.tsx            roster + password modal
    Dashboard.tsx             lists, gifts-giving, settings, PDF export
    ChristmasItemComponent.tsx   a wishlist row
    GiftItemComponent.tsx        a gifts-giving row
    AddItemForm.tsx
  utils/
    storage.ts                app-facing API; localStorage cache + Firestore
    firebaseStorage.ts        Firestore reads/writes and subscriptions
    hash.ts                   SHA-256 via Web Crypto
  types/index.ts              types, USERS roster, season years
  types/passwordHashes.ts     GENERATED from passwords.json — do not edit
```

`storage.ts` is the boundary. Reads go to Firestore and fall back to a localStorage
cache when it's unreachable, so the app still renders offline. Writes go to Firestore
only — they used to cache locally and swallow the error, which reported success for
data that never left the device.
