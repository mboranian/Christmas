// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { webcrypto } from 'crypto';
import { TextEncoder, TextDecoder } from 'util';

// jsdom ships no Web Crypto, so crypto.subtle — which hashPassword depends on —
// is undefined under test. Node's implementation is API-compatible.
if (!(globalThis as any).crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}

// jsdom also omits TextEncoder/TextDecoder, which hashPassword uses to turn the
// password into bytes before hashing.
if (!(globalThis as any).TextEncoder) {
  (globalThis as any).TextEncoder = TextEncoder;
  (globalThis as any).TextDecoder = TextDecoder;
}
