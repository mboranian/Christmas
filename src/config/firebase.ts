import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration - these values are safe to expose in client code
// Use environment variables when available, fallback to placeholder values
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDed-33aRv4_lYXacSCZH4pBnraydYdQF0",
  authDomain: "christmas-lists-41c76.firebaseapp.com",
  projectId: "christmas-lists-41c76",
  storageBucket: "christmas-lists-41c76.firebasestorage.app",
  messagingSenderId: "689772967477",
  appId: "1:689772967477:web:9be37974b2533beeb5a37c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Enable offline persistence
// This allows the app to work offline and sync when reconnected
export { enableNetwork, disableNetwork } from 'firebase/firestore';

export default app;