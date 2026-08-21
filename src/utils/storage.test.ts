import * as storage from './storage';
import { firebaseStorage } from './firebaseStorage';
import { ChristmasList, CURRENT_SEASON_YEAR, FIRST_SEASON_YEAR } from '../types';

const YEAR = CURRENT_SEASON_YEAR;

jest.mock('./firebaseStorage');
const fb = firebaseStorage as jest.Mocked<typeof firebaseStorage>;

const LIST: ChristmasList = {
  id: 'l1', ownerId: 'andy', ownerName: 'Andy', createdAt: 1,
  items: [{ id: 'i1', title: 'Socks', checkedBy: [], createdAt: 1 }],
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('reads fall back to the cache', () => {
  test('getAllLists caches what it fetched', async () => {
    fb.getAllLists.mockResolvedValue([LIST]);
    await expect(storage.getAllLists(YEAR)).resolves.toEqual([LIST]);
    expect(JSON.parse(localStorage.getItem(`christmas-lists-${YEAR}`)!)).toEqual([LIST]);
  });

  test('getAllLists serves the cache when Firestore is unreachable', async () => {
    localStorage.setItem(`christmas-lists-${YEAR}`, JSON.stringify([LIST]));
    fb.getAllLists.mockRejectedValue(new Error('offline'));
    await expect(storage.getAllLists(YEAR)).resolves.toEqual([LIST]);
  });

  test('getAllLists returns empty with no cache and no network', async () => {
    fb.getAllLists.mockRejectedValue(new Error('offline'));
    await expect(storage.getAllLists(YEAR)).resolves.toEqual([]);
  });

  test('getGiftsGiving falls back to an empty structure', async () => {
    fb.getGiftsGiving.mockRejectedValue(new Error('offline'));
    await expect(storage.getGiftsGiving(YEAR, 'matthew')).resolves.toEqual({ userId: 'matthew', gifts: {} });
  });
});

describe('writes surface failures instead of hiding them', () => {
  // The previous implementation cached locally and logged a warning, so the UI
  // reported success for data that never left the device.
  test('updateUserList rejects when the transaction fails', async () => {
    fb.updateUserList.mockRejectedValue(new Error('permission-denied'));
    await expect(storage.updateUserList(YEAR, 'andy', () => LIST)).rejects.toThrow('permission-denied');
  });

  test('saveGiftsGiving rejects and does not cache a failed write', async () => {
    fb.saveGiftsGiving.mockRejectedValue(new Error('offline'));
    await expect(
      storage.saveGiftsGiving(YEAR, 'matthew', { userId: 'matthew', gifts: {} })
    ).rejects.toThrow('offline');
    expect(localStorage.getItem(`christmas-gifts-giving-${YEAR}-matthew`)).toBeNull();
  });

  test('saveUserPrefs rejects and does not cache a failed write', async () => {
    fb.saveUserPrefs.mockRejectedValue(new Error('offline'));
    await expect(storage.saveUserPrefs('matthew', { anonymizeGivers: true })).rejects.toThrow('offline');
    expect(localStorage.getItem('christmas-user-prefs-matthew')).toBeNull();
  });

  test('a successful write is cached', async () => {
    fb.saveGiftsGiving.mockResolvedValue(undefined);
    const data = { userId: 'matthew', gifts: {} };
    await storage.saveGiftsGiving(YEAR, 'matthew', data);
    expect(JSON.parse(localStorage.getItem(`christmas-gifts-giving-${YEAR}-matthew`)!)).toEqual(data);
  });
});

describe('archived seasons are read-only', () => {
  test('updateUserList refuses a past year without touching Firestore', async () => {
    await expect(
      storage.updateUserList(FIRST_SEASON_YEAR, 'andy', () => LIST)
    ).rejects.toThrow(/archived season/i);
    expect(fb.updateUserList).not.toHaveBeenCalled();
  });

  test('saveGiftsGiving refuses a past year without touching Firestore', async () => {
    await expect(
      storage.saveGiftsGiving(FIRST_SEASON_YEAR, 'matthew', { userId: 'matthew', gifts: {} })
    ).rejects.toThrow(/archived season/i);
    expect(fb.saveGiftsGiving).not.toHaveBeenCalled();
  });

  test('reads from a past year still work', async () => {
    fb.getAllLists.mockResolvedValue([LIST]);
    await expect(storage.getAllLists(FIRST_SEASON_YEAR)).resolves.toEqual([LIST]);
  });
});

describe('current user', () => {
  test('round-trips and clears', () => {
    storage.setCurrentUser({ id: 'andy', name: 'Andy' });
    expect(storage.getCurrentUser()).toEqual({ id: 'andy', name: 'Andy' });
    storage.setCurrentUser(null);
    expect(storage.getCurrentUser()).toBeNull();
  });
});

test('generateId returns a 9-character id', () => {
  // Was substr(2, 9); the slice(2, 11) rewrite has to produce the same length.
  for (let i = 0; i < 50; i++) {
    expect(storage.generateId()).toMatch(/^[a-z0-9]{9}$/);
  }
});
