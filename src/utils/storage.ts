import { ChristmasList, User } from '../types';
import { firebaseStorage } from './firebaseStorage';

const CURRENT_USER_KEY = 'christmas-current-user';
const STORAGE_KEY = 'christmas-lists';

// User authentication (uses localStorage since it's per-device)
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

// Lists storage (uses localStorage with Firebase when configured)
export const getAllLists = async (): Promise<ChristmasList[]> => {
  // Check if Firebase is properly configured
  const isFirebaseConfigured = true; // Firebase is always configured with our hardcoded config
  
  if (isFirebaseConfigured) {
    try {
      // Try Firebase first
      const lists = await firebaseStorage.getAllLists();
      // Also save to localStorage as backup
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
      return lists;
    } catch (error) {
      console.warn('⚠️ Firebase unavailable, using localStorage fallback:', error);
    }
  }
  
  // Use localStorage (either as fallback or primary)
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveLists = async (lists: ChristmasList[]): Promise<void> => {
  // Always save to localStorage first (immediate)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
  
  // Check if Firebase is properly configured
  const isFirebaseConfigured = true; // Firebase is always configured with our hardcoded config
  
  if (isFirebaseConfigured) {
    try {
      // Then save to Firebase for sync
      await firebaseStorage.saveLists(lists);
      
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Saved to both localStorage and Firebase');
      }
    } catch (error) {
      console.warn('⚠️ Firebase save failed, but localStorage saved:', error);
      // Don't throw - localStorage worked, so app continues functioning
    }
  } else if (process.env.NODE_ENV === 'development') {
    console.log('📝 Using localStorage only (Firebase not configured yet)');
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

// Real-time subscription for lists
export const subscribeToLists = (callback: (lists: ChristmasList[]) => void) => {
  // Check if Firebase is properly configured
  const isFirebaseConfigured = true; // Firebase is always configured with our hardcoded config
  
  if (isFirebaseConfigured) {
    try {
      return firebaseStorage.subscribeToLists((lists) => {
        // Also update localStorage when we get real-time updates
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
        callback(lists);
      });
    } catch (error) {
      console.warn('⚠️ Firebase subscription failed, using localStorage only');
    }
  }
  
  // If Firebase not configured, just call callback with localStorage data initially
  const stored = localStorage.getItem(STORAGE_KEY);
  const lists = stored ? JSON.parse(stored) : [];
  callback(lists);
  
  // Return a no-op unsubscribe function
  return () => {};
};

export const unsubscribeFromLists = () => {
  // Check if Firebase is properly configured
  const isFirebaseConfigured = true; // Firebase is always configured with our hardcoded config
  
  if (isFirebaseConfigured) {
    try {
      firebaseStorage.unsubscribeFromLists();
    } catch (error) {
      console.warn('⚠️ Firebase unsubscribe failed');
    }
  }
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};