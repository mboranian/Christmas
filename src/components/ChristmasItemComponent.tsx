import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChristmasItem, User, USERS } from '../types';

interface ChristmasItemComponentProps {
  item: ChristmasItem;
  isOwner: boolean;
  currentUser: User;
  listOwner: User;
  anonymizeGivers?: boolean;
  onToggleCheck: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onEditItem?: (itemId: string, updatedData: { title: string; link?: string; notes?: string }) => void;
  onReorderItem?: (draggedId: string, targetId: string) => void;
  itemIndex: number;
  totalItems: number;
  isReorderMode?: boolean;
}

const ChristmasItemComponent: React.FC<ChristmasItemComponentProps> = ({
  item,
  isOwner,
  currentUser,
  listOwner,
  anonymizeGivers = false,
  onToggleCheck,
  onDeleteItem,
  onEditItem,
  onReorderItem,
  itemIndex,
  totalItems,
  isReorderMode = false
}) => {
  const isCheckedByCurrentUser = item.checkedBy.includes(currentUser.id);
  const checkedByCount = item.checkedBy.length;
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editLink, setEditLink] = useState(item.link || '');
  const [editNotes, setEditNotes] = useState(item.notes || '');
  
  // Drag state
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Dropdown menu state (portal + fixed positioning so it sits above everything)
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownDirection, setDropdownDirection] = useState<'down' | 'up'>('down');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ left: number; top: number } | null>(null);

  // When opening the dropdown compute an initial position based on the menu button
  useLayoutEffect(() => {
    if (showDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // initial placement: below the button, right-aligned to the button
      const estimatedWidth = 160; // reasonable default for clamping
      let left = rect.right - estimatedWidth;
      left = Math.min(Math.max(left, 8), window.innerWidth - estimatedWidth - 8);
      const top = rect.bottom + 6;
      setDropdownPos({ left, top });
    }
  }, [showDropdown]);

  // After the menu renders, measure it and adjust for viewport fit (flip up if needed)
  useEffect(() => {
    if (showDropdown && buttonRef.current && menuRef.current) {
      const btnRect = buttonRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();

      let direction: 'down' | 'up' = 'down';
      let top = btnRect.bottom + 6;
      if (btnRect.bottom + menuRect.height + 6 > window.innerHeight) {
        direction = 'up';
        top = btnRect.top - menuRect.height - 6;
      }

      let left = btnRect.right - menuRect.width;
      left = Math.min(Math.max(left, 8), window.innerWidth - menuRect.width - 8);

      setDropdownDirection(direction);
      setDropdownPos({ left, top });
    }
  }, [showDropdown]);

  // Close dropdown when clicking outside (consider both the button and the menu rendered in the portal)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
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

  // Reposition on scroll/resize to keep the dropdown anchored to the button
  useEffect(() => {
    const reposition = () => {
      if (showDropdown && buttonRef.current && menuRef.current) {
        const btnRect = buttonRef.current.getBoundingClientRect();
        const menuRect = menuRef.current.getBoundingClientRect();

        let direction: 'down' | 'up' = 'down';
        let top = btnRect.bottom + 6;
        if (btnRect.bottom + menuRect.height + 6 > window.innerHeight) {
          direction = 'up';
          top = btnRect.top - menuRect.height - 6;
        }

        let left = btnRect.right - menuRect.width;
        left = Math.min(Math.max(left, 8), window.innerWidth - menuRect.width - 8);

        setDropdownDirection(direction);
        setDropdownPos({ left, top });
      }
    };

    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);

    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [showDropdown]);

  const handleEditClick = () => {
    setIsEditing(true);
    setEditTitle(item.title);
    setEditLink(item.link || '');
    setEditNotes(item.notes || '');
  };

  const handleSaveEdit = () => {
    if (onEditItem && editTitle.trim()) {
      const updatedData: { title: string; link?: string; notes?: string } = {
        title: editTitle.trim()
      };
      
      const trimmedLink = editLink.trim();
      if (trimmedLink) {
        updatedData.link = trimmedLink;
      } else {
        updatedData.link = undefined;
      }
      
      const trimmedNotes = editNotes.trim();
      if (trimmedNotes) {
        updatedData.notes = trimmedNotes;
      } else {
        updatedData.notes = undefined;
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
      className={`christmas-item ${isCheckedByCurrentUser ? 'checked-by-me' : ''} ${isDragOver ? 'drag-over' : ''} ${isReorderMode ? 'reorder-mode' : ''} ${item.notes ? 'has-notes' : ''}`}
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
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  className="edit-notes-input"
                  rows={2}
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
              <div className="item-text">
                <h4>{item.title}</h4>
                {item.notes && (
                  <p className="item-notes">{item.notes}</p>
                )}
              </div>
              <div className="item-buttons">
                {/* Render buy button first so the check mark appears to the right when viewing another user's list */}
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
                {isOwner && (onEditItem || onDeleteItem) && !isReorderMode && (
                  <div className="dropdown-menu">
                    <button 
                      ref={buttonRef}
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
                    {showDropdown && dropdownPos && createPortal(
                      <div
                        ref={menuRef}
                        className={`dropdown-content dropdown-${dropdownDirection} dropdown-portal`}
                        style={{ left: dropdownPos.left, top: dropdownPos.top }}
                      >
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
                      </div>,
                      document.body
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
                // If anonymization is enabled, don't show the user's name to other viewers
                if (anonymizeGivers) {
                  if (checkedUsers.length === 1) {
                    return `Santa's got this!`;
                  } else {
                    return `${checkedUsers.length} Santas have got this!`;
                  }
                }

                // Default (non-anonymized) behavior
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