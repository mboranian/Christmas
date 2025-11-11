import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  enableNetwork, 
  disableNetwork,
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ChristmasList, GiftsGiving } from '../types';

const LISTS_COLLECTION = 'christmas-lists';
const LISTS_DOCUMENT = 'all-lists';
const GIFTS_GIVING_COLLECTION = 'gifts-giving';

export class FirebaseStorage {
  private unsubscribe: Unsubscribe | null = null;
  private lastSavedData: string | null = null;
  private isSaving = false;
  private saveQueue: ChristmasList[] | null = null;

  /**
   * Save all lists to Firestore (with deduplication to prevent loops)
   */
  async saveLists(lists: ChristmasList[]): Promise<void> {
    const currentData = JSON.stringify(lists);
    
    // If already saving, queue this data for next save
    if (this.isSaving) {
      this.saveQueue = lists;
      if (process.env.NODE_ENV === 'development') {
        console.log('⏳ Save in progress, queuing data...');
      }
      return;
    }

    // Check if data actually changed to prevent unnecessary saves
    if (this.lastSavedData === currentData) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Skipping save - data unchanged');
      }
      return;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('💾 Saving new data to Firebase...');
    }

    this.isSaving = true;
    try {
      await setDoc(doc(db, LISTS_COLLECTION, LISTS_DOCUMENT), {
        lists,
        lastUpdated: Date.now()
      });
      this.lastSavedData = currentData;
      
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Successfully saved lists to Firebase');
      }
      
      // If there's queued data that's different, save it
      if (this.saveQueue && JSON.stringify(this.saveQueue) !== currentData) {
        const queuedLists = this.saveQueue;
        this.saveQueue = null;
        this.isSaving = false; // Reset flag before recursive call
        await this.saveLists(queuedLists);
        return;
      }
    } catch (error) {
      console.error('❌ Error saving lists to Firebase:', error);
      throw error;
    } finally {
      this.isSaving = false;
      this.saveQueue = null;
    }
  }

  /**
   * Get all lists from Firestore (one-time fetch)
   */
  async getAllLists(): Promise<ChristmasList[]> {
    try {
      const docRef = doc(db, LISTS_COLLECTION, LISTS_DOCUMENT);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Successfully fetched lists from Firebase');
        }
        return data.lists || [];
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('📝 No lists found in Firebase, starting fresh');
        }
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching lists from Firebase:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates for all lists
   */
  subscribeToLists(callback: (lists: ChristmasList[]) => void): Unsubscribe {
    // Prevent multiple subscriptions
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    const docRef = doc(db, LISTS_COLLECTION, LISTS_DOCUMENT);
    let lastReceivedData: string | null = null;
    
    this.unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const currentData = JSON.stringify(data.lists || []);
        
        // Only trigger callback if data actually changed
        if (lastReceivedData !== currentData) {
          lastReceivedData = currentData;
          
          // Only log in development and throttle logs
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Real-time update received from Firebase');
          }
          callback(data.lists || []);
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('📝 No document exists, starting with empty lists');
        }
        callback([]);
      }
    }, (error) => {
      console.error('❌ Error in real-time listener:', error);
      // Don't throw here, just log - the app should continue working
    });

    return this.unsubscribe;
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribeFromLists(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('🔕 Unsubscribed from Firebase real-time updates');
      }
    }
  }

  /**
   * Check if Firebase is available (network connectivity)
   */
  async isOnline(): Promise<boolean> {
    try {
      await enableNetwork(db);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Force offline mode (useful for testing)
   */
  async goOffline(): Promise<void> {
    try {
      await disableNetwork(db);
      console.log('📴 Firebase is now offline');
    } catch (error) {
      console.error('Error going offline:', error);
    }
  }

  /**
   * Force online mode
   */
  async goOnline(): Promise<void> {
    try {
      await enableNetwork(db);
      console.log('🌐 Firebase is now online');
    } catch (error) {
      console.error('Error going online:', error);
    }
  }

  /**
   * Save gifts giving data for a specific user
   */
  async saveGiftsGiving(userId: string, giftsData: GiftsGiving): Promise<void> {
    try {
      await setDoc(doc(db, GIFTS_GIVING_COLLECTION, userId), {
        ...giftsData,
        lastUpdated: Date.now()
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Successfully saved gifts giving for ${userId}`);
      }
    } catch (error) {
      console.error('❌ Error saving gifts giving:', error);
      throw error;
    }
  }

  /**
   * Get gifts giving data for a specific user
   */
  async getGiftsGiving(userId: string): Promise<GiftsGiving> {
    try {
      const docRef = doc(db, GIFTS_GIVING_COLLECTION, userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as GiftsGiving;
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Successfully fetched gifts giving for ${userId}`);
        }
        return data;
      } else {
        // Return empty structure if no data exists
        if (process.env.NODE_ENV === 'development') {
          console.log(`📝 No gifts giving data for ${userId}, starting fresh`);
        }
        return { userId, gifts: {} };
      }
    } catch (error) {
      console.error('❌ Error fetching gifts giving:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates for a user's gifts giving data
   */
  subscribeToGiftsGiving(userId: string, callback: (data: GiftsGiving) => void): Unsubscribe {
    const docRef = doc(db, GIFTS_GIVING_COLLECTION, userId);
    
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as GiftsGiving;
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔄 Real-time update for gifts giving (${userId})`);
        }
        callback(data);
      } else {
        callback({ userId, gifts: {} });
      }
    }, (error) => {
      console.error('❌ Error in gifts giving listener:', error);
    });

    return unsubscribe;
  }
}

// Export singleton instance
export const firebaseStorage = new FirebaseStorage();