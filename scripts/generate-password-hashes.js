#!/usr/bin/env node
/*
 * Turns the plaintext passwords in passwords.json into the SHA-256 hashes the
 * app actually checks against.
 *
 *   passwords.json            <- you edit this, in plain English. Gitignored.
 *   src/types/passwordHashes.ts <- generated, committed, safe to publish.
 *
 * Runs automatically before `npm start` and `npm run build`.
 *
 * passwords.json is deliberately NOT required. CI clones the repo without it,
 * and the generated file is committed, so a missing plaintext file is a no-op
 * rather than an error — otherwise every deploy would wipe the hashes.
 *
 * A user absent from passwords.json keeps whatever hash is already generated,
 * so a partially-filled file can't lock anyone out.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const plaintextFile = path.join(root, 'passwords.json');
const outputFile = path.join(root, 'src', 'types', 'passwordHashes.ts');

const sha256 = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');

function readExistingHashes() {
  if (!fs.existsSync(outputFile)) return {};
  const source = fs.readFileSync(outputFile, 'utf8');
  const hashes = {};
  const pattern = /'([^']+)':\s*'([0-9a-f]{64})'/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    hashes[match[1]] = match[2];
  }
  return hashes;
}

function write(hashes, note) {
  const entries = Object.keys(hashes)
    .sort()
    .map((id) => `  '${id}': '${hashes[id]}',`)
    .join('\n');

  fs.writeFileSync(outputFile, `// GENERATED FILE — DO NOT EDIT BY HAND.
//
// Written by scripts/generate-password-hashes.js from passwords.json, which is
// gitignored. Edit the passwords there and this regenerates on the next
// \`npm start\` or \`npm run build\`.
//
// ${note}
export const USER_PASSWORD_HASHES: { [userId: string]: string } = {
${entries}
};
`);
}

const existing = readExistingHashes();

if (!fs.existsSync(plaintextFile)) {
  console.log('passwords: no passwords.json here — keeping the committed hashes.');
  process.exit(0);
}

let plaintext;
try {
  plaintext = JSON.parse(fs.readFileSync(plaintextFile, 'utf8'));
} catch (error) {
  console.error(`passwords: passwords.json isn't valid JSON — ${error.message}`);
  process.exit(1);
}

const blank = Object.keys(plaintext).filter((id) => !String(plaintext[id] || '').length);
if (blank.length) {
  console.error(`passwords: these entries are empty: ${blank.join(', ')}`);
  process.exit(1);
}

const hashes = { ...existing };
for (const [id, password] of Object.entries(plaintext)) {
  hashes[id] = sha256(String(password));
}

const preserved = Object.keys(existing).filter((id) => !(id in plaintext));
const note = preserved.length
  ? `${Object.keys(plaintext).length} from passwords.json; ${preserved.length} kept from a previous run (${preserved.join(', ')}).`
  : `${Object.keys(plaintext).length} from passwords.json.`;

write(hashes, note);

const changed = Object.keys(hashes).filter((id) => existing[id] !== hashes[id]);
console.log(
  `passwords: hashed ${Object.keys(plaintext).length}` +
  (changed.length ? `, ${changed.length} changed (${changed.join(', ')})` : ', no changes') +
  (preserved.length ? `, kept ${preserved.join(', ')}` : '')
);
