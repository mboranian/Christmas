import { ChristmasList, User, GiftsGiving } from '../types';
import { firebaseStorage } from './firebaseStorage';

const CURRENT_USER_KEY = 'christmas-current-user';
const STORAGE_KEY = 'christmas-lists';
const GIFTS_GIVING_KEY_PREFIX = 'christmas-gifts-giving-';
const USER_PREFS_KEY_PREFIX = 'christmas-user-prefs-';

const giftsKey = (userId: string) => `${GIFTS_GIVING_KEY_PREFIX}${userId}`;
const prefsKey = (userId: string) => `${USER_PREFS_KEY_PREFIX}${userId}`;

// Reads fall back to the localStorage cache when Firestore is unreachable, so
// the app still renders offline.
//
// Writes do NOT fall back. They used to cache locally and swallow the Firestore
// error as a console warning, which meant the UI reported success for data that
// never left the device — and the next snapshot silently overwrote it. Now a
// failed write rejects and the caller surfaces it.

// Sign-in is per-device, so it never leaves localStorage.
export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  return stored ? JSON.parse(stored) : null;
};

export const setCurrentUser = (user: User | null): void => {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};

export const getAllLists = async (): Promise<ChristmasList[]> => {
  try {
    const lists = await firebaseStorage.getAllLists();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    return lists;
  } catch (error) {
    console.warn('Firebase unavailable, using cached lists:', error);
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }
};

/**
 * Apply a change to one owner's list. The mutator receives the list as it
 * currently exists on the server — never a copy read earlier — and the whole
 * read-modify-write runs in a transaction, so simultaneous edits retry instead
 * of overwriting each other.
 *
 * Rejects if the write doesn't land. Callers must handle that.
 */
export const updateUserList = async (
  ownerId: string,
  mutate: (current: ChristmasList | null) => ChristmasList
): Promise<void> => {
  await firebaseStorage.updateUserList(ownerId, mutate);
};

export const subscribeToLists = (callback: (lists: ChristmasList[]) => void) => {
  try {
    return firebaseStorage.subscribeToLists((lists) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
      callback(lists);
    });
  } catch (error) {
    console.warn('Firebase subscription failed; serving cached lists:', error);
    const stored = localStorage.getItem(STORAGE_KEY);
    callback(stored ? JSON.parse(stored) : []);
    return () => {};
  }
};

export const generateId = (): string => {
  return Math.random().toString(36).slice(2, 11);
};

export const getGiftsGiving = async (userId: string): Promise<GiftsGiving> => {
  try {
    const data = await firebaseStorage.getGiftsGiving(userId);
    localStorage.setItem(giftsKey(userId), JSON.stringify(data));
    return data;
  } catch (error) {
    console.warn('Firebase unavailable, using cached gifts:', error);
    const stored = localStorage.getItem(giftsKey(userId));
    return stored ? JSON.parse(stored) : { userId, gifts: {} };
  }
};

export const saveGiftsGiving = async (userId: string, data: GiftsGiving): Promise<void> => {
  await firebaseStorage.saveGiftsGiving(userId, data);
  localStorage.setItem(giftsKey(userId), JSON.stringify(data));
};

export const subscribeToGiftsGiving = (userId: string, callback: (data: GiftsGiving) => void) => {
  try {
    return firebaseStorage.subscribeToGiftsGiving(userId, (data) => {
      localStorage.setItem(giftsKey(userId), JSON.stringify(data));
      callback(data);
    });
  } catch (error) {
    console.warn('Firebase subscription failed; serving cached gifts:', error);
    const stored = localStorage.getItem(giftsKey(userId));
    callback(stored ? JSON.parse(stored) : { userId, gifts: {} });
    return () => {};
  }
};

export const getUserPrefs = async (userId: string): Promise<Record<string, any>> => {
  try {
    const data = await firebaseStorage.getUserPrefs(userId);
    localStorage.setItem(prefsKey(userId), JSON.stringify(data || {}));
    return data || {};
  } catch (error) {
    console.warn('Firebase unavailable, using cached prefs:', error);
    const stored = localStorage.getItem(prefsKey(userId));
    return stored ? JSON.parse(stored) : {};
  }
};

export const saveUserPrefs = async (userId: string, prefs: Record<string, any>): Promise<void> => {
  await firebaseStorage.saveUserPrefs(userId, prefs);
  localStorage.setItem(prefsKey(userId), JSON.stringify(prefs));
};

export const subscribeToUserPrefs = (userId: string, callback: (data: Record<string, any>) => void) => {
  try {
    return firebaseStorage.subscribeToUserPrefs(userId, (data) => {
      localStorage.setItem(prefsKey(userId), JSON.stringify(data || {}));
      callback(data || {});
    });
  } catch (error) {
    console.warn('Firebase subscription failed; serving cached prefs:', error);
    const stored = localStorage.getItem(prefsKey(userId));
    callback(stored ? JSON.parse(stored) : {});
    return () => {};
  }
};
