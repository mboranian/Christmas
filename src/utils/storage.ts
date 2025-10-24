import { ChristmasList, User } from '../types';
import { gistStorage } from './gistStorage';

const CURRENT_USER_KEY = 'christmas-current-user';

// User authentication (still uses localStorage since it's per-device)
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

// Lists storage (now uses GitHub Gist for cross-device sync)
export const getAllLists = async (): Promise<ChristmasList[]> => {
  try {
    return await gistStorage.loadLists();
  } catch (error) {
    console.error('Error loading lists:', error);
    // Fallback to localStorage
    const stored = localStorage.getItem('christmas-lists');
    return stored ? JSON.parse(stored) : [];
  }
};

export const saveLists = async (lists: ChristmasList[]): Promise<void> => {
  try {
    await gistStorage.saveLists(lists);
  } catch (error) {
    console.error('Error saving lists:', error);
    // Even if gist save fails, we've already fallen back to localStorage in gistStorage
    throw error;
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

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};