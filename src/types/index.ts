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