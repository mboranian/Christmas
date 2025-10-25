import React, { useState } from 'react';
import { User, USERS, USER_PASSWORDS } from '../types';

interface SignInPageProps {
  onSignIn: (user: User) => void;
}

const SignInPage: React.FC<SignInPageProps> = ({ onSignIn }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setPassword('');
    setPasswordError('');
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) return;
    
    // Validate password against the specific user's password
    const correctPassword = USER_PASSWORDS[selectedUser.id];
    if (password !== correctPassword) {
      setPasswordError('Incorrect password. Please try again.');
      return;
    }
    
    setPasswordError(''); // Clear any error
    setShowPasswordModal(false);
    onSignIn(selectedUser);
  };

  const handleModalClose = () => {
    setShowPasswordModal(false);
    setSelectedUser(null);
    setPassword('');
    setPasswordError('');
  };

  return (
    <div className="sign-in-container">
      <div className="sign-in-card">
        <h1>🎄Christmas Lists!🎄</h1>
        <p>Welcome! Please select your name to access your Christmas list.</p>
        
        <div className="user-list">
          {USERS.map(user => (
            <div 
              key={user.id} 
              className="user-card"
              onClick={() => handleUserClick(user)}
            >
              <span className="user-name">{user.name}</span>
              <span className="user-arrow">→</span>
            </div>
          ))}
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="modal-overlay" onClick={handleModalClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Welcome, {selectedUser.name}!</h2>
              <button className="modal-close" onClick={handleModalClose}>×</button>
            </div>
            
            <form onSubmit={handlePasswordSubmit} className="password-form">
              <div className="password-section">
                <label htmlFor="modal-password" className="password-label">
                  Enter your password:
                </label>
                <input
                  type="password"
                  id="modal-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(''); // Clear error when user types
                  }}
                  placeholder="Enter password"
                  className="password-input"
                  autoFocus
                  required
                />
                {passwordError && (
                  <div className="password-error">
                    🚫 {passwordError}
                  </div>
                )}
              </div>
              
              <button type="submit" className="modal-submit-button">
                Enter →
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignInPage;