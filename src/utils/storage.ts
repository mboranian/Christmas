import { ChristmasList, User, GiftsGiving } from '../types';
import { firebaseStorage } from './firebaseStorage';

const CURRENT_USER_KEY = 'christmas-current-user';
const STORAGE_KEY = 'christmas-lists';
const GIFTS_GIVING_KEY_PREFIX = 'christmas-gifts-giving-';
const USER_PREFS_KEY_PREFIX = 'christmas-user-prefs-';

const giftsKey = (userId: string) => `${GIFTS_GIVING_KEY_PREFIX}${userId}`;
const prefsKey = (userId: string) => `${USER_PREFS_KEY_PREFIX}${userId}`;

// Every function here reads Firestore first and falls back to the localStorage
// cache if it's unreachable, and writes localStorage first so the UI stays
// responsive (and usable offline) even when a sync fails.

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

export const saveLists = async (lists: ChristmasList[]): Promise<void> => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));

  try {
    await firebaseStorage.saveLists(lists);
  } catch (error) {
    // localStorage already has it, so the app keeps working.
    console.warn('Firebase save failed; lists saved locally only:', error);
  }
};

export const getUserList = async (userId: string): Promise<ChristmasList | undefined> => {
  const lists = await getAllLists();
  return lists.find(list => list.ownerId === userId);
};

export const createOrUpdateUserList = async (list: ChristmasList): Promise<void> => {
  const lists = await getAllLists();
  const existingIndex = lists.findIndex(l => l.ownerId === list.ownerId);

  if (existingIndex >= 0) {
    lists[existingIndex] = list;
  } else {
    lists.push(list);
  }

  await saveLists(lists);
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
  localStorage.setItem(giftsKey(userId), JSON.stringify(data));

  try {
    await firebaseStorage.saveGiftsGiving(userId, data);
  } catch (error) {
    console.warn('Firebase save failed; gifts saved locally only:', error);
  }
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
  localStorage.setItem(prefsKey(userId), JSON.stringify(prefs));

  try {
    await firebaseStorage.saveUserPrefs(userId, prefs);
  } catch (error) {
    console.warn('Firebase save failed; prefs saved locally only:', error);
  }
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
