export interface User {
  id: string;
  name: string;
}

export interface ChristmasItem {
  id: string;
  title: string;
  link?: string;
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

export const USERS: User[] = [
  { id: 'andy', name: 'Andy' },
  { id: 'christopher', name: 'Christopher' },
  { id: 'elena', name: 'Elena' },
  { id: 'lauren', name: 'Lauren' },
  { id: 'matthew', name: 'Matthew' },
  { id: 'steven', name: 'Steven' },
  { id: 'susan', name: 'Susan' },
];