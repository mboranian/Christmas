import React from 'react';
import { ChristmasItem, User } from '../types';

interface ChristmasItemComponentProps {
  item: ChristmasItem;
  isOwner: boolean;
  currentUser: User;
  onToggleCheck: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
}

const ChristmasItemComponent: React.FC<ChristmasItemComponentProps> = ({
  item,
  isOwner,
  currentUser,
  onToggleCheck,
  onDeleteItem
}) => {
  const isCheckedByCurrentUser = item.checkedBy.includes(currentUser.id);
  const checkedByCount = item.checkedBy.length;
  
  return (
    <div className={`christmas-item ${isCheckedByCurrentUser ? 'checked-by-me' : ''}`}>
      <div className="item-content">
        <div className="item-header">
          <h4 className="item-title">
            {item.link ? (
              <a href={item.link} target="_blank" rel="noopener noreferrer">
                {item.title} 🔗
              </a>
            ) : (
              item.title
            )}
          </h4>
          {isOwner && onDeleteItem && (
            <button 
              onClick={() => onDeleteItem(item.id)}
              className="delete-button"
              title="Delete item"
            >
              ✕
            </button>
          )}
        </div>
        
        <div className="item-actions">
          {!isOwner && (
            <button
              onClick={() => onToggleCheck(item.id)}
              className={`check-button ${isCheckedByCurrentUser ? 'checked' : ''}`}
            >
              {isCheckedByCurrentUser ? '✅ Checked' : '☐ Check as handled'}
            </button>
          )}
          
          {!isOwner && checkedByCount > 0 && (
            <span className="check-count">
              {checkedByCount} person{checkedByCount !== 1 ? 's' : ''} handling this
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChristmasItemComponent;