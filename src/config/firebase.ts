import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration - these values are safe to expose in client code
const firebaseConfig = {
  // TODO: Replace with your Firebase project config
  // You can find this in Firebase Console > Project Settings > General > Your apps
  apiKey: "your-api-key-here",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijklmnop"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Enable offline persistence
// This allows the app to work offline and sync when reconnected
export { enableNetwork, disableNetwork } from 'firebase/firestore';

export default app;