import { ChristmasList } from '../types';

// GitHub Gist configuration - using your account's private gist
const GIST_ID = '3370860fec5883043706513ba276fe67'; // Replace with your actual Gist ID
const GIST_FILENAME = 'christmas-lists.json';

interface GistData {
  lists: ChristmasList[];
  lastUpdated: number;
}

interface GistFile {
  content: string;
}

interface GistResponse {
  files: {
    [filename: string]: GistFile;
  };
  id: string;
}

class GitHubGistStorage {
  private gistId: string = GIST_ID;

  constructor() {
    // Use the hardcoded gist ID - no user setup needed
  }



  private async updateGist(gistId: string, data: GistData): Promise<void> {
    const updatePayload = {
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(data, null, 2)
        }
      }
    };

    // Note: For now, we'll skip the actual Gist update due to CORS and auth issues
    // The data is still saved to localStorage as a fallback
    console.log('Would update Gist with:', data);
    
    // TODO: Implement proper authentication or use a backend proxy
    // Uncomment when you add a GitHub token or backend:
    /*
    try {
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Christmas-Lists-App',
          'Authorization': 'token YOUR_GITHUB_TOKEN' // Add your token here
        },
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) {
        throw new Error(`Failed to update gist: ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating gist:', error);
      throw error;
    }
    */
  }

  private async fetchGist(gistId: string): Promise<GistData | null> {
    // Note: Skipping Gist fetch for now due to CORS/rate limit issues
    console.log('Would fetch from Gist ID:', gistId);
    return null;
    
    // TODO: Implement proper authentication or use a backend proxy  
    // Uncomment when you add a GitHub token or backend:
    /*
    try {
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
          'User-Agent': 'Christmas-Lists-App',
          'Authorization': 'token YOUR_GITHUB_TOKEN' // Add your token here
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Christmas Lists Gist not found. Please contact support.');
        }
        throw new Error(`Failed to fetch gist: ${response.status}`);
      }

      const gist: GistResponse = await response.json();
      const file = gist.files[GIST_FILENAME];
      
      if (!file) {
        throw new Error('Christmas lists file not found in gist');
      }

      return JSON.parse(file.content);
    } catch (error) {
      console.error('Error fetching gist:', error);
      return null;
    }
    */
  }

  async loadLists(): Promise<ChristmasList[]> {
    try {
      const data = await this.fetchGist(this.gistId);
      return data?.lists || [];
    } catch (error) {
      console.error('Error loading lists from gist:', error);
      // Fall back to localStorage if gist fails
      const localData = localStorage.getItem('christmas-lists');
      return localData ? JSON.parse(localData) : [];
    }
  }

  async saveLists(lists: ChristmasList[]): Promise<void> {
    const data: GistData = {
      lists,
      lastUpdated: Date.now()
    };

    try {
      // Always update the existing gist
      await this.updateGist(this.gistId, data);

      // Also save to localStorage as backup
      localStorage.setItem('christmas-lists', JSON.stringify(lists));
    } catch (error) {
      console.error('Error saving to gist:', error);
      // Fall back to localStorage if gist fails
      localStorage.setItem('christmas-lists', JSON.stringify(lists));
      throw error;
    }
  }
}

export const gistStorage = new GitHubGistStorage();
export default gistStorage;