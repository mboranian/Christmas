# Firestore Security Rules Setup

## Problem
The Secret Santa toggle (and other user preferences) are not persisting across devices because Firestore security rules are blocking reads/writes to the `user-prefs` collection.

## Solution: Update Firestore Security Rules

### Step 1: Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **christmas-lists-41c76**
3. Click **Firestore Database** in the left sidebar
4. Click the **Rules** tab at the top

### Step 2: Update the Rules
Replace the existing rules with these:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write to christmas-lists collection
    match /christmas-lists/{document=**} {
      allow read, write: if true;
    }
    
    // Allow read/write to gifts-giving collection
    match /gifts-giving/{document=**} {
      allow read, write: if true;
    }
    
    // Allow read/write to user-prefs collection
    match /user-prefs/{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Step 3: Publish the Rules
1. Click **Publish** button in the top right
2. Wait for confirmation that rules are published

### Step 4: Test
1. Open your app in the browser
2. Toggle the Secret Santa switch
3. Check the browser console for:
   - ✅ `Successfully saved prefs for [userId] to Firestore`
   - ✅ `Real-time update for prefs ([userId]): { anonymizeGivers: true }`
4. Open the app on another device/browser
5. Sign in as the same user
6. The Secret Santa toggle should reflect the same state

## Security Note
⚠️ The rules above allow **anyone** to read/write all data. This is fine for a family Christmas list app, but for production apps with sensitive data, you should add proper authentication checks.

### More Secure Rules (Optional)
If you add Firebase Authentication later:
```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /christmas-lists/{document=**} {
      allow read: if true;  // Anyone can read lists
      allow write: if request.auth != null;  // Only authenticated users can write
    }
    
    match /gifts-giving/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /user-prefs/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Troubleshooting

### Check if rules are the problem
1. Open browser DevTools (F12)
2. Go to Console tab
3. Toggle the Secret Santa switch
4. Look for errors mentioning `permission-denied`

### Verify the collection exists
1. In Firebase Console, go to **Firestore Database**
2. Click the **Data** tab
3. You should see these collections:
   - `christmas-lists`
   - `gifts-giving`
   - `user-prefs` (this will be created when you first toggle Secret Santa)

### Check console logs
With the updated code, you'll see detailed logging:
- 💾 `Attempting to save prefs for [userId] to Firestore`
- ✅ `Successfully saved prefs for [userId] to Firestore`
- 🔔 `Setting up real-time listener for prefs ([userId])`
- 🔄 `Real-time update for prefs ([userId]): {...}`

If you see ❌ errors with `permission-denied`, you need to update the Firestore rules.
