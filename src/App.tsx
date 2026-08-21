import React, { useState, useEffect } from 'react';
import { User } from './types';
import { getCurrentUser, setCurrentUser } from './utils/storage';
import ErrorBoundary from './components/ErrorBoundary';
import SignInPage from './components/SignInPage';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUserState(user);
    setIsLoading(false);
  }, []);

  const handleSignIn = (user: User) => {
    setCurrentUser(user);
    setCurrentUserState(user);
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setCurrentUserState(null);
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
      {/* Falling Snow Animation */}
      <div className="snowflake">❄</div>
      <div className="snowflake">❅</div>
      <div className="snowflake">❆</div>
      <div className="snowflake">❄</div>
      <div className="snowflake">❅</div>
      <div className="snowflake">❆</div>
      <div className="snowflake">❄</div>
      <div className="snowflake">❅</div>
      <div className="snowflake">❆</div>
      <div className="snowflake">❄</div>
      
      <ErrorBoundary>
        {currentUser ? (
          <Dashboard currentUser={currentUser} onSignOut={handleSignOut} />
        ) : (
          <SignInPage onSignIn={handleSignIn} />
        )}
      </ErrorBoundary>
    </div>
  );
}

export default App;
