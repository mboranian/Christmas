import { ChristmasList } from '../types';

const mockGetDocs = jest.fn();
const mockRunTransaction = jest.fn();

jest.mock('../config/firebase', () => ({ db: { __db: true } }));
jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, coll: string, id: string) => ({ path: `${coll}/${id}` }),
  collection: (_db: unknown, coll: string) => ({ path: coll }),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: (...a: unknown[]) => mockGetDocs(...a),
  onSnapshot: jest.fn(),
  runTransaction: (...a: unknown[]) => mockRunTransaction(...a),
  enableNetwork: jest.fn(),
  disableNetwork: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { firebaseStorage } = require('./firebaseStorage');

const list = (ownerId: string, title: string): ChristmasList => ({
  id: `l-${ownerId}`, ownerId, ownerName: ownerId, createdAt: 1,
  items: [{ id: `i-${ownerId}`, title, checkedBy: [], createdAt: 1 }],
});

/** Fake QuerySnapshot: docs keyed by id. */
const snapshot = (docs: Record<string, any>) => ({
  size: Object.keys(docs).length,
  forEach: (fn: (d: any) => void) =>
    Object.entries(docs).forEach(([id, data]) => fn({ id, data: () => data })),
});

beforeEach(() => jest.clearAllMocks());

describe('reading lists during the migration', () => {
  test('serves the legacy document when no per-user documents exist', async () => {
    mockGetDocs.mockResolvedValue(snapshot({
      'all-lists': { lists: [list('andy', 'Socks'), list('elena', 'Book')] },
    }));

    const result = await firebaseStorage.getAllLists();
    expect(result.map((l: ChristmasList) => l.ownerId).sort()).toEqual(['andy', 'elena']);
  });

  test('serves per-user documents once they exist', async () => {
    mockGetDocs.mockResolvedValue(snapshot({
      andy: list('andy', 'Socks'),
      elena: list('elena', 'Book'),
    }));

    const result = await firebaseStorage.getAllLists();
    expect(result.map((l: ChristmasList) => l.ownerId).sort()).toEqual(['andy', 'elena']);
  });

  test('a per-user document shadows that owner’s legacy entry', async () => {
    // Andy has migrated and renamed his item; Elena has not migrated yet.
    mockGetDocs.mockResolvedValue(snapshot({
      'all-lists': { lists: [list('andy', 'STALE'), list('elena', 'Book')] },
      andy: list('andy', 'Wool socks'),
    }));

    const result: ChristmasList[] = await firebaseStorage.getAllLists();

    expect(result).toHaveLength(2);
    expect(result.find((l) => l.ownerId === 'andy')!.items[0].title).toBe('Wool socks');
    expect(result.find((l) => l.ownerId === 'elena')!.items[0].title).toBe('Book');
  });

  test('no documents at all yields no lists', async () => {
    mockGetDocs.mockResolvedValue(snapshot({}));
    await expect(firebaseStorage.getAllLists()).resolves.toEqual([]);
  });
});

describe('writing a list', () => {
  /** Fake transaction over a set of existing documents. */
  const withDocs = (docs: Record<string, any>) => {
    const writes: Record<string, any> = {};
    mockRunTransaction.mockImplementation(async (_db: unknown, cb: any) =>
      cb({
        get: async (ref: { path: string }) => {
          const id = ref.path.split('/')[1];
          return { exists: () => id in docs, data: () => docs[id] };
        },
        set: (ref: { path: string }, data: any) => { writes[ref.path.split('/')[1]] = data; },
      })
    );
    return writes;
  };

  test('writes only the target owner’s document', async () => {
    const writes = withDocs({ andy: list('andy', 'Socks') });

    await firebaseStorage.updateUserList('andy', (current: ChristmasList) => ({
      ...current,
      items: [...current.items, { id: 'new', title: 'Hat', checkedBy: [], createdAt: 2 }],
    }));

    expect(Object.keys(writes)).toEqual(['andy']);
    expect(writes.andy.items.map((i: any) => i.title)).toEqual(['Socks', 'Hat']);
  });

  test('seeds from the legacy document on a first write, keeping existing items', async () => {
    // Andy has no document yet, but has items in the legacy array. Losing them
    // here would silently wipe his list on his first edit.
    const writes = withDocs({ 'all-lists': { lists: [list('andy', 'Socks')] } });

    await firebaseStorage.updateUserList('andy', (current: ChristmasList | null) => {
      expect(current).not.toBeNull();
      return {
        ...current!,
        items: [...current!.items, { id: 'new', title: 'Hat', checkedBy: [], createdAt: 2 }],
      };
    });

    expect(writes.andy.items.map((i: any) => i.title)).toEqual(['Socks', 'Hat']);
  });

  test('passes null for an owner with no document and no legacy entry', async () => {
    const writes = withDocs({ 'all-lists': { lists: [list('elena', 'Book')] } });
    const fresh = list('andy', 'Hat');

    await firebaseStorage.updateUserList('andy', (current: ChristmasList | null) => {
      expect(current).toBeNull();
      return fresh;
    });

    expect(writes.andy.items.map((i: any) => i.title)).toEqual(['Hat']);
  });
});
