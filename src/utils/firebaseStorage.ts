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
import { ChristmasList } from '../types';

const LISTS_COLLECTION = 'christmas-lists';
const LISTS_DOCUMENT = 'all-lists';

export class FirebaseStorage {
  private unsubscribe: Unsubscribe | null = null;
  private lastSavedData: string | null = null;
  private isSaving = false;

  /**
   * Save all lists to Firestore (with deduplication to prevent loops)
   */
  async saveLists(lists: ChristmasList[]): Promise<void> {
    // Prevent saving if already in progress
    if (this.isSaving) {
      return;
    }

    // Check if data actually changed to prevent unnecessary saves
    const currentData = JSON.stringify(lists);
    if (this.lastSavedData === currentData) {
      return;
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
    } catch (error) {
      console.error('❌ Error saving lists to Firebase:', error);
      throw error;
    } finally {
      this.isSaving = false;
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
}

// Export singleton instance
export const firebaseStorage = new FirebaseStorage();