import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  enableNetwork,
  disableNetwork,
  Unsubscribe,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ChristmasList, GiftsGiving } from '../types';

// Chatty progress logging is useful while developing and is noise (and a small
// privacy leak — these payloads contain gift data) in the deployed app.
const debug = (...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

const LISTS_COLLECTION = 'christmas-lists';
const GIFTS_GIVING_COLLECTION = 'gifts-giving';
const USER_PREFS_COLLECTION = 'user-prefs';

// Lists used to live in a single christmas-lists/all-lists document holding an
// array of everyone's lists, which meant every edit rewrote all seven and two
// people editing at once clobbered each other. Each list now lives in its own
// christmas-lists/{ownerId} document.
//
// The legacy document is still read, so nothing has to be migrated up front: a
// per-user document shadows the legacy entry for that owner as soon as they
// make their first edit. Once every owner has a document, all-lists is inert
// and can be deleted by hand.
const LEGACY_LISTS_DOCUMENT = 'all-lists';

/** Per-user documents win; the legacy array fills in owners not yet migrated. */
const mergeSnapshot = (snapshot: QuerySnapshot<DocumentData>): ChristmasList[] => {
  const perUser: ChristmasList[] = [];
  let legacy: ChristmasList[] = [];

  snapshot.forEach((docSnap) => {
    if (docSnap.id === LEGACY_LISTS_DOCUMENT) {
      legacy = (docSnap.data().lists as ChristmasList[]) || [];
    } else {
      perUser.push(docSnap.data() as ChristmasList);
    }
  });

  const migrated = new Set(perUser.map(list => list.ownerId));
  return [...perUser, ...legacy.filter(list => !migrated.has(list.ownerId))];
};

export class FirebaseStorage {
  private unsubscribe: Unsubscribe | null = null;

  /**
   * Apply a change to one owner's list inside a transaction, so a concurrent
   * write to the same document retries against fresh data instead of
   * overwriting it. Returns the list as written.
   *
   * Callers pass a mutator rather than a finished list: the mutator receives
   * whatever the server currently holds, so an edit can never be based on a
   * stale copy read before someone else's change landed.
   */
  async updateUserList(
    ownerId: string,
    mutate: (current: ChristmasList | null) => ChristmasList
  ): Promise<ChristmasList> {
    const listRef = doc(db, LISTS_COLLECTION, ownerId);
    const legacyRef = doc(db, LISTS_COLLECTION, LEGACY_LISTS_DOCUMENT);

    return runTransaction(db, async (tx) => {
      const snap = await tx.get(listRef);

      let current: ChristmasList | null = null;
      if (snap.exists()) {
        current = snap.data() as ChristmasList;
      } else {
        // First write for this owner — seed from the legacy document so their
        // existing items aren't dropped.
        const legacySnap = await tx.get(legacyRef);
        if (legacySnap.exists()) {
          const legacy = (legacySnap.data().lists as ChristmasList[]) || [];
          current = legacy.find(list => list.ownerId === ownerId) || null;
        }
      }

      const next = mutate(current);
      tx.set(listRef, { ...next, lastUpdated: Date.now() });
      return next;
    });
  }

  async getAllLists(): Promise<ChristmasList[]> {
    const snapshot = await getDocs(collection(db, LISTS_COLLECTION));
    debug(`📖 Read ${snapshot.size} list document(s)`);
    return mergeSnapshot(snapshot);
  }

  subscribeToLists(callback: (lists: ChristmasList[]) => void): Unsubscribe {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    let previous: string | null = null;

    this.unsubscribe = onSnapshot(
      collection(db, LISTS_COLLECTION),
      (snapshot) => {
        const lists = mergeSnapshot(snapshot);
        const serialized = JSON.stringify(lists);
        // Firestore echoes our own writes back; skip identical payloads so the
        // UI doesn't re-render for no reason.
        if (serialized === previous) return;
        previous = serialized;
        debug('🔄 Real-time update received (lists)');
        callback(lists);
      },
      (error) => {
        console.error('Error in lists listener:', error);
      }
    );

    return this.unsubscribe;
  }

  async isOnline(): Promise<boolean> {
    try {
      await enableNetwork(db);
      return true;
    } catch {
      return false;
    }
  }

  async goOffline(): Promise<void> {
    await disableNetwork(db);
    debug('📴 Firebase is now offline');
  }

  async goOnline(): Promise<void> {
    await enableNetwork(db);
    debug('🌐 Firebase is now online');
  }

  async saveGiftsGiving(userId: string, giftsData: GiftsGiving): Promise<void> {
    await setDoc(doc(db, GIFTS_GIVING_COLLECTION, userId), {
      ...giftsData,
      lastUpdated: Date.now()
    });
    debug(`✅ Saved gifts-giving for ${userId}`);
  }

  async getGiftsGiving(userId: string): Promise<GiftsGiving> {
    const snap = await getDoc(doc(db, GIFTS_GIVING_COLLECTION, userId));
    return snap.exists() ? (snap.data() as GiftsGiving) : { userId, gifts: {} };
  }

  subscribeToGiftsGiving(userId: string, callback: (data: GiftsGiving) => void): Unsubscribe {
    return onSnapshot(
      doc(db, GIFTS_GIVING_COLLECTION, userId),
      (snap) => {
        callback(snap.exists() ? (snap.data() as GiftsGiving) : { userId, gifts: {} });
      },
      (error) => {
        console.error('Error in gifts-giving listener:', error);
      }
    );
  }

  async saveUserPrefs(userId: string, prefs: Record<string, any>): Promise<void> {
    await setDoc(doc(db, USER_PREFS_COLLECTION, userId), {
      ...prefs,
      lastUpdated: Date.now()
    });
    debug(`✅ Saved prefs for ${userId}`);
  }

  async getUserPrefs(userId: string): Promise<Record<string, any>> {
    const snap = await getDoc(doc(db, USER_PREFS_COLLECTION, userId));
    return snap.exists() ? (snap.data() as Record<string, any>) : {};
  }

  subscribeToUserPrefs(userId: string, callback: (data: Record<string, any>) => void): Unsubscribe {
    return onSnapshot(
      doc(db, USER_PREFS_COLLECTION, userId),
      (snap) => {
        callback(snap.exists() ? (snap.data() as Record<string, any>) : {});
      },
      (error) => {
        console.error('Error in prefs listener:', error);
      }
    );
  }
}

export const firebaseStorage = new FirebaseStorage();
