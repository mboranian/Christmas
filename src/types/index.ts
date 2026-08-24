export interface User {
  id: string;
  name: string;
}

export interface ChristmasItem {
  id: string;
  title: string;
  link?: string;
  notes?: string;
  checkedBy: string[]; // Array of user IDs who have checked this item
  createdAt: number;
}

export interface ChristmasList {
  id: string;
  ownerId: string;
  ownerName: string;
  items: ChristmasItem[];
  createdAt: number;
}

export interface GiftItem {
  id: string;
  title: string;
  link?: string;
  notes?: string;
  source: 'checked' | 'manual'; // 'checked' = from checking someone's list, 'manual' = manually added
  sourceItemId?: string; // ID of the original item if source is 'checked'
  createdAt: number;
}

export interface GiftsGiving {
  userId: string; // The user who is giving gifts
  gifts: {
    [recipientId: string]: GiftItem[]; // Gifts for each recipient user
  };
}

// --- Seasons ---------------------------------------------------------------
//
// Each Christmas gets its own set of lists so previous years stay readable.
// Only the current year is editable; earlier years are archives.
//
// 2025 is special: its data predates this feature and still lives at the
// original unversioned paths, so it needs no migration. 2026 onward live under
// per-year paths. See utils/firebaseStorage.ts.
export const FIRST_SEASON_YEAR = 2025;

/** The season being planned right now. Rolls over on 1 January. */
export const CURRENT_SEASON_YEAR = new Date().getFullYear();

/** Newest first, for the year picker. */
export const SEASON_YEARS: number[] = Array.from(
  { length: Math.max(1, CURRENT_SEASON_YEAR - FIRST_SEASON_YEAR + 1) },
  (_, i) => CURRENT_SEASON_YEAR - i
);

/** Archived seasons are read-only. */
export const isArchivedYear = (year: number): boolean => year < CURRENT_SEASON_YEAR;

export const USERS: User[] = [
  { id: 'andy', name: 'Andy' },
  { id: 'christopher', name: 'Christopher' },
  { id: 'elena', name: 'Elena' },
  { id: 'lauren', name: 'Lauren' },
  { id: 'matthew', name: 'Matthew' },
  { id: 'steven', name: 'Steven' },
  { id: 'susan', name: 'Susan' },
];

// Sign-in compares a SHA-256 hash of what was typed against this map. It is
// generated from passwords.json (gitignored) by scripts/generate-password-hashes.js,
// which runs before `npm start` and `npm run build`. Edit the passwords there,
// never the hashes.
export { USER_PASSWORD_HASHES } from './passwordHashes';
