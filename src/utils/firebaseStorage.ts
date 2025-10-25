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

  /**
   * Save all lists to Firestore
   */
  async saveLists(lists: ChristmasList[]): Promise<void> {
    try {
      await setDoc(doc(db, LISTS_COLLECTION, LISTS_DOCUMENT), {
        lists,
        lastUpdated: Date.now()
      });
      console.log('✅ Successfully saved lists to Firebase');
    } catch (error) {
      console.error('❌ Error saving lists to Firebase:', error);
      throw error;
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
        console.log('✅ Successfully fetched lists from Firebase');
        return data.lists || [];
      } else {
        console.log('📝 No lists found in Firebase, starting fresh');
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
    const docRef = doc(db, LISTS_COLLECTION, LISTS_DOCUMENT);
    
    this.unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        console.log('🔄 Real-time update received from Firebase');
        callback(data.lists || []);
      } else {
        console.log('📝 No document exists, starting with empty lists');
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
      console.log('🔕 Unsubscribed from Firebase real-time updates');
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