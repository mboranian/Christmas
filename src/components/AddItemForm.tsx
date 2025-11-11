import React, { useState } from 'react';
import { ChristmasItem } from '../types';

interface AddItemFormProps {
  onAddItem: (item: Omit<ChristmasItem, 'id' | 'checkedBy' | 'createdAt'>) => void;
  onCancel: () => void;
}

const AddItemForm: React.FC<AddItemFormProps> = ({ onAddItem, onCancel }) => {
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      const itemData: Omit<ChristmasItem, 'id' | 'checkedBy' | 'createdAt'> = {
        title: title.trim(),
      };
      
      // Only include link if it has a value (Firebase doesn't allow undefined)
      const trimmedLink = link.trim();
      if (trimmedLink) {
        itemData.link = trimmedLink;
      }
      
      // Only include notes if it has a value
      const trimmedNotes = notes.trim();
      if (trimmedNotes) {
        itemData.notes = trimmedNotes;
      }
      
      onAddItem(itemData);
      setTitle('');
      setLink('');
      setNotes('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-item-form">
      <div className="form-group">
        <label htmlFor="title">Item Name *</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What would you like for Christmas?"
          required
          autoFocus
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="link">Link (optional)</label>
        <input
          type="url"
          id="link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://example.com/product"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="notes">Notes (optional)</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Size, color, preferences, etc."
          rows={3}
        />
      </div>
      
      <div className="form-actions">
        <button type="button" onClick={onCancel} className="cancel-button">
          Cancel
        </button>
        <button type="submit" className="add-button">
          Add Item
        </button>
      </div>
    </form>
  );
};

export default AddItemForm;