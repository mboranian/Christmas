import React, { useState } from 'react';
import { gistStorage } from '../utils/gistStorage';

interface GistSetupProps {
  onSetupComplete: () => void;
}

const GistSetup: React.FC<GistSetupProps> = ({ onSetupComplete }) => {
  const [gistId, setGistId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSetGistId = () => {
    if (gistId.trim()) {
      gistStorage.setGistId(gistId.trim());
      onSetupComplete();
    }
  };

  const handleCreateNewGist = async () => {
    setIsCreating(true);
    try {
      // This will create a new gist on first save
      console.log('New gist will be created automatically on first save');
      onSetupComplete();
    } catch (error) {
      console.error('Error setting up gist:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const currentGistId = gistStorage.getGistId();

  if (currentGistId) {
    return (
      <div className="gist-setup">
        <h3>GitHub Gist Storage</h3>
        <p>✅ Connected to Gist ID: <code>{currentGistId}</code></p>
        <p>Your Christmas lists are synced across devices!</p>
        <button onClick={onSetupComplete} className="setup-complete-button">
          Continue to App
        </button>
      </div>
    );
  }

  return (
    <div className="gist-setup">
      <h3>🔗 Setup Cross-Device Sync</h3>
      <p>To sync your Christmas lists across all devices and browsers, we'll use GitHub Gist storage.</p>
      
      <div className="setup-options">
        <div className="setup-option">
          <h4>Option 1: Use Existing Gist</h4>
          <p>If you already have a Gist ID:</p>
          <input
            type="text"
            placeholder="Enter your Gist ID"
            value={gistId}
            onChange={(e) => setGistId(e.target.value)}
            className="gist-input"
          />
          <button 
            onClick={handleSetGistId}
            disabled={!gistId.trim()}
            className="setup-button"
          >
            Connect to Existing Gist
          </button>
        </div>

        <div className="setup-option">
          <h4>Option 2: Create New Gist</h4>
          <p>We'll automatically create a new private Gist for your data:</p>
          <button 
            onClick={handleCreateNewGist}
            disabled={isCreating}
            className="setup-button primary"
          >
            {isCreating ? 'Setting up...' : 'Create New Gist Storage'}
          </button>
        </div>

        <div className="setup-option">
          <h4>Option 3: Skip for Now</h4>
          <p>Use local storage only (data won't sync across devices):</p>
          <button 
            onClick={onSetupComplete}
            className="setup-button secondary"
          >
            Skip Sync Setup
          </button>
        </div>
      </div>

      <div className="setup-info">
        <h5>ℹ️ About GitHub Gist Storage:</h5>
        <ul>
          <li>Your data is stored in a private GitHub Gist</li>
          <li>Syncs automatically across all your devices</li>
          <li>Free and reliable through GitHub's infrastructure</li>
          <li>You can always change this later</li>
        </ul>
      </div>
    </div>
  );
};

export default GistSetup;