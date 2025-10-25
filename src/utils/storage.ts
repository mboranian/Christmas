import { ChristmasList, User } from '../types';

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

// Lists storage (uses localStorage only for now)
export const getAllLists = (): ChristmasList[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveLists = (lists: ChristmasList[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
};

export const getUserList = (userId: string): ChristmasList | undefined => {
  const lists = getAllLists();
  return lists.find(list => list.ownerId === userId);
};

export const createOrUpdateUserList = (list: ChristmasList): void => {
  const lists = getAllLists();
  const existingIndex = lists.findIndex(l => l.ownerId === list.ownerId);
  
  if (existingIndex >= 0) {
    lists[existingIndex] = list;
  } else {
    lists.push(list);
  }
  
  saveLists(lists);
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};