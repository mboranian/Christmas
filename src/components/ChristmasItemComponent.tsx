import React, { useState } from 'react';
import { ChristmasItem, User } from '../types';

interface ChristmasItemComponentProps {
  item: ChristmasItem;
  isOwner: boolean;
  currentUser: User;
  onToggleCheck: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onEditItem?: (itemId: string, updatedData: { title: string; link?: string }) => void;
}

const ChristmasItemComponent: React.FC<ChristmasItemComponentProps> = ({
  item,
  isOwner,
  currentUser,
  onToggleCheck,
  onDeleteItem,
  onEditItem
}) => {
  const isCheckedByCurrentUser = item.checkedBy.includes(currentUser.id);
  const checkedByCount = item.checkedBy.length;
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editLink, setEditLink] = useState(item.link || '');

  const handleEditClick = () => {
    setIsEditing(true);
    setEditTitle(item.title);
    setEditLink(item.link || '');
  };

  const handleSaveEdit = () => {
    if (onEditItem && editTitle.trim()) {
      const updatedData: { title: string; link?: string } = {
        title: editTitle.trim()
      };
      
      const trimmedLink = editLink.trim();
      if (trimmedLink) {
        updatedData.link = trimmedLink;
      }
      
      onEditItem(item.id, updatedData);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(item.title);
    setEditLink(item.link || '');
  };
  
  return (
    <div className={`christmas-item ${isCheckedByCurrentUser ? 'checked-by-me' : ''}`}>
      <div className="item-content">
        <div className="item-header">
          {isEditing ? (
            <div className="edit-form">
              <div className="edit-inputs">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Item name"
                  className="edit-title-input"
                />
                <input
                  type="url"
                  value={editLink}
                  onChange={(e) => setEditLink(e.target.value)}
                  placeholder="Link (optional)"
                  className="edit-link-input"
                />
              </div>
              <div className="edit-buttons">
                <button 
                  onClick={handleSaveEdit}
                  className="save-button"
                  title="Save changes"
                >
                  Save
                </button>
                <button 
                  onClick={handleCancelEdit}
                  className="cancel-button"
                  title="Cancel editing"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
                            <h4>{item.title}</h4>
              <div className="item-buttons">
                {item.link && (
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="buy-button"
                    title="Buy this item"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="9" cy="21" r="1"></circle>
                      <circle cx="20" cy="21" r="1"></circle>
                      <path d="m1,1 h4 l2.68,13.39 a2,2 0 0,0 2,1.61H19.4a2,2 0 0,0 2,-1.61L23,6H6"></path>
                    </svg>
                    Buy Here!
                  </a>
                )}
                {!isOwner && (
                  <button
                    onClick={() => onToggleCheck(item.id)}
                    className={`check-button ${isCheckedByCurrentUser ? 'checked' : ''}`}
                  >
                    {isCheckedByCurrentUser ? '✅' : '☐'}
                  </button>
                )}
                {isOwner && onEditItem && (
                  <button 
                    onClick={handleEditClick}
                    className="edit-button"
                    title="Edit item"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m18,2 4,4L7,21H3v-4L18,2Z"></path>
                      <path d="m13,7 4,4"></path>
                    </svg>
                  </button>
                )}
                {isOwner && onDeleteItem && (
                  <button 
                    onClick={() => onDeleteItem(item.id)}
                    className="delete-button"
                    title="Delete item"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3,6 5,6 21,6"></polyline>
                      <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        
        {!isOwner && checkedByCount > 0 && (
          <div className="item-actions">
            <span className="check-count">
              {checkedByCount} person{checkedByCount !== 1 ? 's' : ''} handling this
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChristmasItemComponent;