import React, { useState } from 'react';
import { User, USERS } from '../types';

interface SignInPageProps {
  onSignIn: (user: User) => void;
}

const SignInPage: React.FC<SignInPageProps> = ({ onSignIn }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const user = USERS.find(u => u.id === selectedUserId);
    if (user) {
      onSignIn(user);
    }
  };

  return (
    <div className="sign-in-container">
      <div className="sign-in-card">
        <h1>🎄 Christmas List Manager 🎄</h1>
        <p>Welcome! Please select your name to access your Christmas list.</p>
        
        <form onSubmit={handleSignIn} className="sign-in-form">
          <div className="user-selection">
            {USERS.map(user => (
              <label key={user.id} className="user-option">
                <input
                  type="radio"
                  name="user"
                  value={user.id}
                  checked={selectedUserId === user.id}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                />
                <span className="user-name">{user.name}</span>
              </label>
            ))}
          </div>
          
          <button 
            type="submit" 
            disabled={!selectedUserId}
            className="sign-in-button"
          >
            Enter Christmas List Manager
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignInPage;