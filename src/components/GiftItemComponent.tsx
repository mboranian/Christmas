import React, { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { GiftItem } from '../types';

interface GiftItemComponentProps {
  gift: GiftItem;
  recipientId: string;
  onEditItem: (recipientId: string, giftItemId: string, updatedData: { title: string; link?: string; notes?: string }) => void;
  onDeleteItem: (recipientId: string, giftItemId: string) => void;
}

const GiftItemComponent: React.FC<GiftItemComponentProps> = ({
  gift,
  recipientId,
  onEditItem,
  onDeleteItem,
}) => {
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(gift.title);
  const [editLink, setEditLink] = useState(gift.link || '');
  const [editNotes, setEditNotes] = useState(gift.notes || '');
  
  // Dropdown menu state (portal + fixed positioning so it sits above everything)
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownDirection, setDropdownDirection] = useState<'down' | 'up'>('down');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ left: number; top: number } | null>(null);

  // When opening the dropdown compute an initial position based on the menu button
  useLayoutEffect(() => {
    if (!showDropdown || !buttonRef.current) {
      return;
    }

    // Set initial position immediately
    const buttonRect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      left: buttonRect.left,
      top: buttonRect.bottom + 4
    });

    const reposition = () => {
      if (!buttonRef.current || !menuRef.current) return;
      
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      
      let direction: 'down' | 'up' = 'down';
      let top = buttonRect.bottom + 4;
      
      if (spaceBelow < menuRect.height + 10 && spaceAbove > spaceBelow) {
        direction = 'up';
        top = buttonRect.top - menuRect.height - 4;
      }
      
      let left = buttonRect.left;
      left = Math.min(Math.max(left, 8), window.innerWidth - menuRect.width - 8);

      setDropdownDirection(direction);
      setDropdownPos({ left, top });
    };

    // Reposition after render
    setTimeout(reposition, 0);

    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);

    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [showDropdown]);

  // Handle edit save
  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      onEditItem(recipientId, gift.id, {
        title: editTitle.trim(),
        link: editLink.trim() || undefined,
        notes: editNotes.trim() || undefined
      });
      setIsEditing(false);
    }
  };

  // Handle edit cancel
  const handleCancelEdit = () => {
    setEditTitle(gift.title);
    setEditLink(gift.link || '');
    setEditNotes(gift.notes || '');
    setIsEditing(false);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current && 
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  if (isEditing) {
    return (
      <div className="christmas-item editing">
        <div className="item-header">
          <div className="edit-form">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Gift name"
              className="edit-input"
              autoFocus
            />
            <input
              type="url"
              value={editLink}
              onChange={(e) => setEditLink(e.target.value)}
              placeholder="Link (optional)"
              className="edit-input"
            />
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="edit-input"
              rows={2}
            />
            <div className="edit-actions">
              <button onClick={handleSaveEdit} className="save-button">
                ✓ Save
              </button>
              <button onClick={handleCancelEdit} className="cancel-button">
                ✗ Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const dropdownMenu = showDropdown && dropdownPos ? createPortal(
    <div
      ref={menuRef}
      className={`dropdown-content dropdown-${dropdownDirection} dropdown-portal`}
      style={{ left: dropdownPos.left, top: dropdownPos.top }}
    >
      {gift.source === 'manual' && (
        <button
          onClick={() => {
            setIsEditing(true);
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
      <button
        onClick={() => {
          onDeleteItem(recipientId, gift.id);
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
        {gift.source === 'checked' ? 'Remove' : 'Delete'}
      </button>
    </div>,
    document.body
  ) : null;

  return (
    <div className="christmas-item">
      <div className="item-header">
        <div className="item-content">
          <div className="item-text">
            <h4>
              {gift.link ? (
                <a href={gift.link} target="_blank" rel="noopener noreferrer">
                  {gift.title}
                </a>
              ) : (
                gift.title
              )}
            </h4>
            {gift.notes && (
              <p className="item-notes">{gift.notes}</p>
            )}
          </div>
          {gift.source === 'checked' && (
            <span className="gift-source-badge">From their list</span>
          )}
        </div>
        <div className="item-buttons">
          {gift.link && (
            <a
              href={gift.link}
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
            {dropdownMenu}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiftItemComponent;
