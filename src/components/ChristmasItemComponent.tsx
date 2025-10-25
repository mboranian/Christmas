import React, { useState, useEffect, useRef } from 'react';
import { ChristmasItem, User, USERS } from '../types';

interface ChristmasItemComponentProps {
  item: ChristmasItem;
  isOwner: boolean;
  currentUser: User;
  listOwner: User;
  onToggleCheck: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onEditItem?: (itemId: string, updatedData: { title: string; link?: string }) => void;
  onReorderItem?: (draggedId: string, targetId: string) => void;
  itemIndex: number;
  isReorderMode?: boolean;
}

const ChristmasItemComponent: React.FC<ChristmasItemComponentProps> = ({
  item,
  isOwner,
  currentUser,
  listOwner,
  onToggleCheck,
  onDeleteItem,
  onEditItem,
  onReorderItem,
  itemIndex,
  isReorderMode = false
}) => {
  const isCheckedByCurrentUser = item.checkedBy.includes(currentUser.id);
  const checkedByCount = item.checkedBy.length;
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editLink, setEditLink] = useState(item.link || '');
  
  // Drag state
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Dropdown menu state
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

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

  // Drag handlers
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isReorderMode) {
      const draggedId = e.dataTransfer.getData('text/plain');
      if (draggedId !== item.id && onReorderItem) {
        onReorderItem(draggedId, item.id);
      }
    }
  };
  
  return (
    <div 
      className={`christmas-item ${isCheckedByCurrentUser ? 'checked-by-me' : ''} ${isDragOver ? 'drag-over' : ''} ${isReorderMode ? 'reorder-mode' : ''}`}
      draggable={isOwner && isReorderMode}
      onDragStart={isReorderMode ? handleDragStart : undefined}
      onDragOver={isReorderMode ? handleDragOver : undefined}
      onDragEnter={isReorderMode ? handleDragEnter : undefined}
      onDragLeave={isReorderMode ? handleDragLeave : undefined}
      onDrop={isReorderMode ? handleDrop : undefined}
    >
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
                {!isOwner && !isReorderMode && (
                  <button
                    onClick={() => onToggleCheck(item.id)}
                    className={`check-button ${isCheckedByCurrentUser ? 'checked' : ''}`}
                    title={isCheckedByCurrentUser ? "Click if you're not getting this" : `Click here if you're getting this for ${listOwner.name}!`}
                  >
                    {isCheckedByCurrentUser ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20,6 9,17 4,12"></polyline>
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      </svg>
                    )}
                  </button>
                )}
                {item.link && !isReorderMode && (
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
                {isOwner && (onEditItem || onDeleteItem) && !isReorderMode && (
                  <div className="dropdown-menu" ref={dropdownRef}>
                    <button 
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="menu-button"
                      title="More options"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                      </svg>
                    </button>
                    {showDropdown && (
                      <div className="dropdown-content">
                        {onEditItem && (
                          <button 
                            onClick={() => {
                              handleEditClick();
                              setShowDropdown(false);
                            }}
                            className="dropdown-item"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="m18,2 4,4L7,21H3v-4L18,2Z"></path>
                              <path d="m13,7 4,4"></path>
                            </svg>
                            Edit
                          </button>
                        )}
                        {onDeleteItem && (
                          <button 
                            onClick={() => {
                              onDeleteItem(item.id);
                              setShowDropdown(false);
                            }}
                            className="dropdown-item delete"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3,6 5,6 21,6"></polyline>
                              <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        {!isOwner && checkedByCount > 0 && (
          <div className="item-actions">
            <span className="check-count">
              {(() => {
                const checkedUsers = USERS.filter(user => item.checkedBy.includes(user.id));
                if (checkedUsers.length === 1) {
                  return `${checkedUsers[0].name}'s got this!`;
                } else if (checkedUsers.length === 2) {
                  return `${checkedUsers[0].name} and ${checkedUsers[1].name} have got this!`;
                } else {
                  return `${checkedUsers.length} people have got this!`;
                }
              })()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChristmasItemComponent;