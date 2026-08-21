# Christmas Lists

A shared Christmas wishlist app for the family, live at **[780christmas.com](https://780christmas.com)**.

Everyone keeps their own wishlist. Anyone can browse someone else's list and check off an
item they intend to buy, which quietly adds it to their own "Gifts I'm Giving" tracker so
two people don't buy the same thing. Lists sync between devices in real time.

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

51 tests cover sign-in, the list and gift mutations, PDF export, password
hashing, the error boundary, and the storage layer including the migration
fallback. CI blocks a deploy when any of them fail, so they're the safety net
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

## Adding or changing a family member

Two steps, both in [`src/types/index.ts`](src/types/index.ts):

1. Add an entry to `USERS` with a lowercase `id` and a display `name`.
2. Add a matching SHA-256 password hash to `USER_PASSWORD_HASHES`, keyed by that same `id`.

Generate the hash with:

```bash
echo -n "theirpassword" | shasum -a 256
```

There's no signup flow and no Firebase Auth — the roster is hardcoded, and sign-in just
compares a SHA-256 hash of what was typed against the table. Missing a hash for a user
means nobody can sign in as them.

## Firebase

Project **`christmas-lists-41c76`**. Config is committed in
[`src/config/firebase.ts`](src/config/firebase.ts) — that's normal for Firebase web keys,
which are identifiers rather than secrets.

Three Firestore collections:

| Collection | Shape | Holds |
|---|---|---|
| `christmas-lists` | one doc per user id | that user's wishlist |
| `gifts-giving` | one doc per user id | what that person plans to give |
| `user-prefs` | one doc per user id | small per-user settings |

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
  types/index.ts              types, USERS roster, password hashes
```

`storage.ts` is the boundary. Reads go to Firestore and fall back to a localStorage
cache when it's unreachable, so the app still renders offline. Writes go to Firestore
only — they used to cache locally and swallow the error, which reported success for
data that never left the device.
