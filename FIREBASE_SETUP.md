# Firebase Setup Instructions

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name your project (e.g., "christmas-lists")
4. Disable Google Analytics (not needed for this app)
5. Click "Create project"

## Step 2: Set up Firestore Database

1. In your Firebase project, click "Firestore Database" 
2. Click "Create database"
3. Choose "Start in test mode" (for now)
4. Select a region close to you
5. Click "Done"

## Step 3: Get Firebase Configuration

1. In Firebase Console, click the gear icon ⚙️ → "Project settings"
2. Scroll down to "Your apps" section
3. Click the web icon `</>`
4. Register your app with name "Christmas Lists"
5. **Don't** enable Firebase Hosting (we're using GitHub Pages)
6. Copy the `firebaseConfig` object

## Step 4: Update Your Code

Replace the placeholder config in `src/config/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key-here",
  authDomain: "your-project.firebaseapp.com", 
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijklmnop"
};
```

## Step 5: Set Firestore Security Rules

In Firebase Console → Firestore Database → Rules, replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to the christmas-lists collection
    match /christmas-lists/{document=**} {
      allow read, write: if true; // Public read/write for simplicity
    }
  }
}
```

## Step 6: Test and Deploy

1. Run `npm start` locally to test
2. If everything works, commit and push to GitHub
3. Your app will auto-deploy with real-time sync!

## Features You'll Get

✨ **Real-time sync** - Changes appear instantly on all devices
🔄 **Offline support** - App works without internet, syncs when reconnected  
🌐 **Connection status** - See online/offline indicator in top right
📱 **Cross-device** - Same data on phone, tablet, computer
🆓 **Free tier** - More than enough for 7 users

## Security Note

Unlike GitHub tokens, Firebase config is safe to expose in client code. Firebase handles security through Firestore rules, not secret keys.