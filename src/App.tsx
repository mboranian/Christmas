import React, { useState, useEffect } from 'react';
import { User } from './types';
import { getCurrentUser, setCurrentUser } from './utils/storage';
import SignInPage from './components/SignInPage';
import Dashboard from './components/Dashboard';
import GistSetup from './components/GistSetup';
import { gistStorage } from './utils/gistStorage';
import './App.css';

function App() {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showGistSetup, setShowGistSetup] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUserState(user);
    
    // Check if we need to show gist setup
    if (user && !gistStorage.getGistId()) {
      setShowGistSetup(true);
    }
    
    setIsLoading(false);
  }, []);

  const handleSignIn = (user: User) => {
    setCurrentUser(user);
    setCurrentUserState(user);
    
    // Show gist setup if not configured
    if (!gistStorage.getGistId()) {
      setShowGistSetup(true);
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setCurrentUserState(null);
    setShowGistSetup(false);
  };

  const handleGistSetupComplete = () => {
    setShowGistSetup(false);
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">🎄</div>
        <p>Loading Christmas List Manager...</p>
      </div>
    );
  }

  return (
    <div className="App">
      {currentUser ? (
        showGistSetup ? (
          <div className="dashboard">
            <header className="dashboard-header">
              <h1>🎄 Christmas List Manager</h1>
              <div className="user-info">
                <span>Welcome, {currentUser.name}!</span>
                <button onClick={handleSignOut} className="sign-out-button">Sign Out</button>
              </div>
            </header>
            <div className="dashboard-content">
              <GistSetup onSetupComplete={handleGistSetupComplete} />
            </div>
          </div>
        ) : (
          <Dashboard currentUser={currentUser} onSignOut={handleSignOut} />
        )
      ) : (
        <SignInPage onSignIn={handleSignIn} />
      )}
    </div>
  );
}

export default App;
