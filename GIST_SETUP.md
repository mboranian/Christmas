# Setting up GitHub Gist for Christmas Lists

To complete the cross-device sync setup, you need to create a private GitHub Gist:

## Option 1: Manual Setup (Recommended)

1. **Go to GitHub Gists**: https://gist.github.com/
2. **Create a new Gist** with these settings:
   - **Filename**: `christmas-lists.json`
   - **Content**: 
   ```json
   {
     "lists": [],
     "lastUpdated": 1729783200000
   }
   ```
   - **Make it private** (uncheck "Public")
3. **Click "Create secret gist"**
4. **Copy the Gist ID** from the URL (e.g., `https://gist.github.com/mboranian/abc123def456` → ID is `abc123def456`)

## Option 2: Using the Script

1. **Get a GitHub token**:
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Create a token with "gist" scope
2. **Edit `setup-gist.js`** and add your token:
   ```javascript
   'Authorization': 'token YOUR_GITHUB_TOKEN'
   ```
3. **Run**: `node setup-gist.js`

## Final Step

Once you have the Gist ID, update `src/utils/gistStorage.ts`:

```typescript
const GIST_ID = 'YOUR_ACTUAL_GIST_ID_HERE';
```

Then rebuild and deploy:
```bash
npm run build
git add .
git commit -m "Update Gist ID for data storage"
git push
```

The app will then automatically sync all Christmas list data to your private Gist!