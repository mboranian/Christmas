import { hashPassword } from './hash';

// If hashing ever changes, every stored hash in types/index.ts stops matching
// and nobody can sign in. These vectors pin the algorithm and encoding.
test('matches known SHA-256 vectors', async () => {
  expect(await hashPassword('abc')).toBe(
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  );
  expect(await hashPassword('')).toBe(
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  );
});

test('always produces 64 lowercase hex characters', async () => {
  // Guards the zero-padding: a byte below 0x10 rendered without padStart would
  // shorten the string, and across this many inputs that is a certainty.
  for (const input of ['a', 'password', 'Christmas2025', 'ünïcodé', '🎄', 'x'.repeat(500)]) {
    expect(await hashPassword(input)).toMatch(/^[0-9a-f]{64}$/);
  }
});

test('is deterministic and input-sensitive', async () => {
  expect(await hashPassword('santa')).toBe(await hashPassword('santa'));
  expect(await hashPassword('santa')).not.toBe(await hashPassword('Santa'));
});
