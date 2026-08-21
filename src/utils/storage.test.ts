import * as storage from './storage';
import { firebaseStorage } from './firebaseStorage';
import { ChristmasList } from '../types';

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
    await expect(storage.getAllLists()).resolves.toEqual([LIST]);
    expect(JSON.parse(localStorage.getItem('christmas-lists')!)).toEqual([LIST]);
  });

  test('getAllLists serves the cache when Firestore is unreachable', async () => {
    localStorage.setItem('christmas-lists', JSON.stringify([LIST]));
    fb.getAllLists.mockRejectedValue(new Error('offline'));
    await expect(storage.getAllLists()).resolves.toEqual([LIST]);
  });

  test('getAllLists returns empty with no cache and no network', async () => {
    fb.getAllLists.mockRejectedValue(new Error('offline'));
    await expect(storage.getAllLists()).resolves.toEqual([]);
  });

  test('getGiftsGiving falls back to an empty structure', async () => {
    fb.getGiftsGiving.mockRejectedValue(new Error('offline'));
    await expect(storage.getGiftsGiving('matthew')).resolves.toEqual({ userId: 'matthew', gifts: {} });
  });
});

describe('writes surface failures instead of hiding them', () => {
  // The previous implementation cached locally and logged a warning, so the UI
  // reported success for data that never left the device.
  test('updateUserList rejects when the transaction fails', async () => {
    fb.updateUserList.mockRejectedValue(new Error('permission-denied'));
    await expect(storage.updateUserList('andy', () => LIST)).rejects.toThrow('permission-denied');
  });

  test('saveGiftsGiving rejects and does not cache a failed write', async () => {
    fb.saveGiftsGiving.mockRejectedValue(new Error('offline'));
    await expect(
      storage.saveGiftsGiving('matthew', { userId: 'matthew', gifts: {} })
    ).rejects.toThrow('offline');
    expect(localStorage.getItem('christmas-gifts-giving-matthew')).toBeNull();
  });

  test('saveUserPrefs rejects and does not cache a failed write', async () => {
    fb.saveUserPrefs.mockRejectedValue(new Error('offline'));
    await expect(storage.saveUserPrefs('matthew', { anonymizeGivers: true })).rejects.toThrow('offline');
    expect(localStorage.getItem('christmas-user-prefs-matthew')).toBeNull();
  });

  test('a successful write is cached', async () => {
    fb.saveGiftsGiving.mockResolvedValue(undefined);
    const data = { userId: 'matthew', gifts: {} };
    await storage.saveGiftsGiving('matthew', data);
    expect(JSON.parse(localStorage.getItem('christmas-gifts-giving-matthew')!)).toEqual(data);
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
