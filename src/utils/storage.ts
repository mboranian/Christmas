import { ChristmasList, User, GiftsGiving, isArchivedYear } from '../types';
import { firebaseStorage } from './firebaseStorage';

const CURRENT_USER_KEY = 'christmas-current-user';
const STORAGE_KEY = 'christmas-lists';
const GIFTS_GIVING_KEY_PREFIX = 'christmas-gifts-giving-';
const USER_PREFS_KEY_PREFIX = 'christmas-user-prefs-';

// Cache keys carry the year so switching seasons can't serve the wrong data.
const listsKey = (year: number) => `${STORAGE_KEY}-${year}`;
const giftsKey = (year: number, userId: string) => `${GIFTS_GIVING_KEY_PREFIX}${year}-${userId}`;
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

export const getAllLists = async (year: number): Promise<ChristmasList[]> => {
  try {
    const lists = await firebaseStorage.getAllLists(year);
    localStorage.setItem(listsKey(year), JSON.stringify(lists));
    return lists;
  } catch (error) {
    console.warn('Firebase unavailable, using cached lists:', error);
    const stored = localStorage.getItem(listsKey(year));
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
  year: number,
  ownerId: string,
  mutate: (current: ChristmasList | null) => ChristmasList
): Promise<void> => {
  if (isArchivedYear(year)) {
    // Archived seasons are read-only. The UI hides the controls, but guard here
    // too so a stray call can't rewrite history.
    throw new Error(`${year} is an archived season and can't be edited`);
  }
  await firebaseStorage.updateUserList(year, ownerId, mutate);
};

export const subscribeToLists = (year: number, callback: (lists: ChristmasList[]) => void) => {
  try {
    return firebaseStorage.subscribeToLists(year, (lists) => {
      localStorage.setItem(listsKey(year), JSON.stringify(lists));
      callback(lists);
    });
  } catch (error) {
    console.warn('Firebase subscription failed; serving cached lists:', error);
    const stored = localStorage.getItem(listsKey(year));
    callback(stored ? JSON.parse(stored) : []);
    return () => {};
  }
};

export const generateId = (): string => {
  // Math.random().toString(36) is usually ~13 chars but can be shorter, which
  // would yield a stunted id. Keep drawing until there are enough characters.
  let id = '';
  while (id.length < 9) {
    id += Math.random().toString(36).slice(2);
  }
  return id.slice(0, 9);
};

export const getGiftsGiving = async (year: number, userId: string): Promise<GiftsGiving> => {
  try {
    const data = await firebaseStorage.getGiftsGiving(year, userId);
    localStorage.setItem(giftsKey(year, userId), JSON.stringify(data));
    return data;
  } catch (error) {
    console.warn('Firebase unavailable, using cached gifts:', error);
    const stored = localStorage.getItem(giftsKey(year, userId));
    return stored ? JSON.parse(stored) : { userId, gifts: {} };
  }
};

export const saveGiftsGiving = async (year: number, userId: string, data: GiftsGiving): Promise<void> => {
  if (isArchivedYear(year)) {
    throw new Error(`${year} is an archived season and can't be edited`);
  }
  await firebaseStorage.saveGiftsGiving(year, userId, data);
  localStorage.setItem(giftsKey(year, userId), JSON.stringify(data));
};

export const subscribeToGiftsGiving = (year: number, userId: string, callback: (data: GiftsGiving) => void) => {
  try {
    return firebaseStorage.subscribeToGiftsGiving(year, userId, (data) => {
      localStorage.setItem(giftsKey(year, userId), JSON.stringify(data));
      callback(data);
    });
  } catch (error) {
    console.warn('Firebase subscription failed; serving cached gifts:', error);
    const stored = localStorage.getItem(giftsKey(year, userId));
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
