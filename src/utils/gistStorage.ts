import { ChristmasList } from '../types';

// GitHub Gist configuration
// You'll need to replace these with your actual values
const GITHUB_USERNAME = 'mboranian';
const GIST_ID = ''; // We'll create this programmatically or you can set it manually
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
  private gistId: string | null = null;

  constructor() {
    // Try to get gist ID from localStorage (for caching)
    this.gistId = localStorage.getItem('christmas-gist-id');
  }

  private async createGist(data: GistData): Promise<string> {
    const gistPayload = {
      description: '780 Christmas Lists Data Storage',
      public: false,
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(data, null, 2)
        }
      }
    };

    try {
      const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Christmas-Lists-App'
        },
        body: JSON.stringify(gistPayload)
      });

      if (!response.ok) {
        throw new Error(`Failed to create gist: ${response.status}`);
      }

      const gist: GistResponse = await response.json();
      this.gistId = gist.id;
      
      // Cache the gist ID
      localStorage.setItem('christmas-gist-id', gist.id);
      
      return gist.id;
    } catch (error) {
      console.error('Error creating gist:', error);
      throw error;
    }
  }

  private async updateGist(gistId: string, data: GistData): Promise<void> {
    const updatePayload = {
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(data, null, 2)
        }
      }
    };

    try {
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Christmas-Lists-App'
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
  }

  private async fetchGist(gistId: string): Promise<GistData | null> {
    try {
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
          'User-Agent': 'Christmas-Lists-App'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Gist not found, reset cached ID
          localStorage.removeItem('christmas-gist-id');
          this.gistId = null;
          return null;
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
  }

  async loadLists(): Promise<ChristmasList[]> {
    try {
      // If we don't have a gist ID, try to find existing gist or create new one
      if (!this.gistId) {
        // For now, we'll create a new gist. In production, you might want to 
        // search for existing gists or have the ID configured somewhere
        console.log('No gist ID found, will create new gist on first save');
        return [];
      }

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
      if (!this.gistId) {
        // Create new gist
        await this.createGist(data);
      } else {
        // Update existing gist
        await this.updateGist(this.gistId, data);
      }

      // Also save to localStorage as backup
      localStorage.setItem('christmas-lists', JSON.stringify(lists));
    } catch (error) {
      console.error('Error saving to gist:', error);
      // Fall back to localStorage if gist fails
      localStorage.setItem('christmas-lists', JSON.stringify(lists));
      throw error;
    }
  }

  // Method to manually set gist ID if you create one manually
  setGistId(gistId: string): void {
    this.gistId = gistId;
    localStorage.setItem('christmas-gist-id', gistId);
  }

  // Get current gist ID for reference
  getGistId(): string | null {
    return this.gistId;
  }
}

export const gistStorage = new GitHubGistStorage();
export default gistStorage;