import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { USERS, USER_PASSWORD_HASHES } from './index';

const plaintextFile = path.join(__dirname, '..', '..', 'passwords.json');
const hasPlaintext = fs.existsSync(plaintextFile);

test('every name in the roster has a well-formed hash', () => {
  // A missing hash locks that person out and nothing else would tell you.
  for (const user of USERS) {
    expect(USER_PASSWORD_HASHES[user.id]).toMatch(/^[0-9a-f]{64}$/);
  }
});

test('the generated file has no stray entries', () => {
  const roster = new Set(USERS.map((u) => u.id));
  for (const id of Object.keys(USER_PASSWORD_HASHES)) {
    expect(roster.has(id)).toBe(true);
  }
});

// Only meaningful on a machine that has the plaintext. CI clones without it.
const whenLocal = hasPlaintext ? describe : describe.skip;

whenLocal('passwords.json is in sync with the generated hashes', () => {
  test('each plaintext password hashes to the committed value', () => {
    // Catches the one real trap: editing passwords.json, committing, and
    // pushing without ever running a build to regenerate.
    const plaintext: Record<string, string> = JSON.parse(fs.readFileSync(plaintextFile, 'utf8'));

    for (const [id, password] of Object.entries(plaintext)) {
      const expected = crypto.createHash('sha256').update(password, 'utf8').digest('hex');
      expect(USER_PASSWORD_HASHES[id]).toBe(expected);
    }
  });

  test('no password is blank', () => {
    const plaintext: Record<string, string> = JSON.parse(fs.readFileSync(plaintextFile, 'utf8'));
    for (const [id, password] of Object.entries(plaintext)) {
      expect(String(password).length).toBeGreaterThan(0);
      expect(id).toMatch(/^[a-z]+$/);
    }
  });
});
