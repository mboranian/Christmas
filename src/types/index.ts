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

// Password hashes (SHA-256) - raw passwords are no longer visible in code
// To generate a new hash: run `echo -n "yourpassword" | shasum -a 256` in terminal
export const USER_PASSWORD_HASHES: { [userId: string]: string } = {
  'andy': 'e2284dc3b5535645288cde2bad818404be728fb8c9f70b055c0b52023b0ff0a0',
  'christopher': '11424c1e6e16df0eddc4ce5b35971a4f72ee1340eedbcc02e86a4dfa4995e5e9',
  'elena': 'bf8c10763e4a48eb947eac3493febd04ffd57aee15710daa8b6f6b4f091f41af',
  'lauren': '2d580257fc4f931cd77d4650fddb799d9ba838865a234e5552daefa6694d20bd',
  'matthew': 'a0bb9a287176d1b592340f95f755092a2219bd38883ffa843f3f539a87db192f',
  'steven': '75c1354b3457f0e5d64dd66f4a00614abfaef73fa8b540784b2b231d1ea978cd',
  'susan': '5a2a558c78d3717db731600c4f354fa1d9c84b556f108091a891f444f1bdec40',
};