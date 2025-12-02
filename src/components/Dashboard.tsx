import React, { useState, useEffect, useRef } from 'react';
import { BsFillGearFill } from "react-icons/bs";
import { ChristmasList, ChristmasItem, User, USERS, GiftsGiving, GiftItem } from '../types';
import { createOrUpdateUserList, generateId, getAllLists, subscribeToLists, unsubscribeFromLists, getGiftsGiving, saveGiftsGiving, subscribeToGiftsGiving, getUserPrefs, saveUserPrefs, subscribeToUserPrefs } from '../utils/storage';
import AddItemForm from './AddItemForm';
import ChristmasItemComponent from './ChristmasItemComponent';
import GiftItemComponent from './GiftItemComponent';

interface DashboardProps {
  currentUser: User;
  onSignOut: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, onSignOut }) => {
  const [allLists, setAllLists] = useState<ChristmasList[]>([]);
  const [giftsGiving, setGiftsGiving] = useState<GiftsGiving>({ userId: currentUser.id, gifts: {} });
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);
  const [viewMode, setViewMode] = useState<'lists' | 'giftsGiving'>('lists');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeGiftFormRecipient, setActiveGiftFormRecipient] = useState<string | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const [anonymizeGivers, setAnonymizeGivers] = useState(false);

  // Helper to get the currently selected list
  const getSelectedList = () => {
    return allLists.find(list => list.ownerId === selectedUserId) || null;
  };

  // Helper to get the selected user
  const getSelectedUser = () => {
    return USERS.find(user => user.id === selectedUserId) || currentUser;
  };

  useEffect(() => {
    // Load lists, gifts and user prefs
    const loadAll = async () => {
      setIsLoading(true);
      try {
        const [lists, gifts, prefs] = await Promise.all([
          getAllLists(),
          getGiftsGiving(currentUser.id),
          getUserPrefs(currentUser.id)
        ]);
        setAllLists(lists);
        setGiftsGiving(gifts);
        if (prefs && typeof prefs.anonymizeGivers === 'boolean') {
          setAnonymizeGivers(prefs.anonymizeGivers);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAll();

    // Set up real-time listener for lists
    const unsubscribeLists = subscribeToLists((lists) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('📡 Real-time update received (lists)');
      }
      setAllLists(lists);
    });

    // Set up real-time listener for gifts giving
    const unsubscribeGifts = subscribeToGiftsGiving(currentUser.id, (data) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('📡 Real-time update received (gifts giving)');
      }
      setGiftsGiving(data);
    });

    // Subscribe to user prefs so anonymize toggles sync across devices
    const unsubscribePrefs = subscribeToUserPrefs(currentUser.id, (prefs) => {
      if (prefs && typeof prefs.anonymizeGivers === 'boolean') {
        setAnonymizeGivers(prefs.anonymizeGivers);
      }
    });

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeLists();
      unsubscribeFromLists();
      unsubscribeGifts();
      if (typeof unsubscribePrefs === 'function') unsubscribePrefs();
    };
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close settings menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!isSettingsOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        settingsMenuRef.current && !settingsMenuRef.current.contains(target) &&
        settingsButtonRef.current && !settingsButtonRef.current.contains(target)
      ) {
        setIsSettingsOpen(false);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSettingsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isSettingsOpen]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [lists, gifts] = await Promise.all([
        getAllLists(),
        getGiftsGiving(currentUser.id)
      ]);
      setAllLists(lists);
      setGiftsGiving(gifts);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAnonymize = async (value?: boolean) => {
    const next = typeof value === 'boolean' ? value : !anonymizeGivers;
    setAnonymizeGivers(next);
    try {
      await saveUserPrefs(currentUser.id, { anonymizeGivers: next });
    } catch (err) {
      console.warn('Failed to persist anonymize preference:', err);
    }
  };

  const createNewList = async () => {
    const newList: ChristmasList = {
      id: generateId(),
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      items: [],
      createdAt: Date.now(),
    };

    setIsSyncing(true);
    try {
      await createOrUpdateUserList(newList);
      // Don't need to call loadData - real-time listener will update automatically
    } catch (error) {
      console.error('Error creating list:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const addItem = async (itemData: Omit<ChristmasItem, 'id' | 'checkedBy' | 'createdAt'>) => {
    const currentList = getSelectedList();
    if (!currentList || selectedUserId !== currentUser.id) return;

    const newItem: ChristmasItem = {
      ...itemData,
      id: generateId(),
      checkedBy: [],
      createdAt: Date.now(),
    };

    const updatedList = {
      ...currentList,
      items: [...currentList.items, newItem],
    };

    setShowAddForm(false);
    setIsSyncing(true);
    try {
      await createOrUpdateUserList(updatedList);
      // Real-time listener will update the UI automatically
    } catch (error) {
      console.error('Error adding item:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    const currentList = getSelectedList();
    if (!currentList || selectedUserId !== currentUser.id) return;

    const updatedList = {
      ...currentList,
      items: currentList.items.filter((item: ChristmasItem) => item.id !== itemId),
    };

    setIsSyncing(true);
    try {
      await createOrUpdateUserList(updatedList);
      // Real-time listener will update the UI automatically
    } catch (error) {
      console.error('Error deleting item:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const editItem = async (itemId: string, updatedData: { title: string; link?: string; notes?: string }) => {
    const currentList = getSelectedList();
    if (!currentList || selectedUserId !== currentUser.id) return;

    const updatedList = {
      ...currentList,
      items: currentList.items.map((item: ChristmasItem) => {
        if (item.id === itemId) {
          const updated = { ...item, ...updatedData };
          // Remove properties that are explicitly set to undefined
          if (updatedData.link === undefined) {
            delete updated.link;
          }
          if (updatedData.notes === undefined) {
            delete updated.notes;
          }
          return updated;
        }
        return item;
      }),
    };

    setIsSyncing(true);
    try {
      await createOrUpdateUserList(updatedList);
      // Real-time listener will update the UI automatically
    } catch (error) {
      console.error('Error editing item:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const reorderItem = async (draggedId: string, targetId: string) => {
    const currentList = getSelectedList();
    if (!currentList || selectedUserId !== currentUser.id) return;

    const items = [...currentList.items];
    const draggedIndex = items.findIndex(item => item.id === draggedId);
    const targetIndex = items.findIndex(item => item.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove dragged item and insert at target position
    const [draggedItem] = items.splice(draggedIndex, 1);
    items.splice(targetIndex, 0, draggedItem);

    const updatedList = {
      ...currentList,
      items,
    };

    setIsSyncing(true);
    try {
      await createOrUpdateUserList(updatedList);
      // Real-time listener will update the UI automatically
    } catch (error) {
      console.error('Error reordering items:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleItemCheck = async (listOwnerId: string, itemId: string) => {
    setIsSyncing(true);
    try {
      const lists = await getAllLists();
      const listIndex = lists.findIndex(list => list.ownerId === listOwnerId);
      
      if (listIndex === -1) return;

      const list = lists[listIndex];
      const itemIndex = list.items.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) return;

      const item = list.items[itemIndex];
      const isCurrentlyChecked = item.checkedBy.includes(currentUser.id);

      if (isCurrentlyChecked) {
        item.checkedBy = item.checkedBy.filter(userId => userId !== currentUser.id);
        
        // If unchecking someone else's item, remove from gifts giving
        if (listOwnerId !== currentUser.id) {
          const updatedGifts = { ...giftsGiving };
          if (updatedGifts.gifts[listOwnerId]) {
            updatedGifts.gifts[listOwnerId] = updatedGifts.gifts[listOwnerId].filter(
              gift => gift.sourceItemId !== itemId
            );
            await saveGiftsGiving(currentUser.id, updatedGifts);
          }
        }
      } else {
        item.checkedBy.push(currentUser.id);
        
        // If checking someone else's item, add to gifts giving
        if (listOwnerId !== currentUser.id) {
          const giftItem: GiftItem = {
            id: generateId(),
            title: item.title,
            link: item.link,
            notes: item.notes,
            source: 'checked',
            sourceItemId: itemId,
            createdAt: Date.now()
          };
          const updatedGifts = { ...giftsGiving };
          if (!updatedGifts.gifts[listOwnerId]) {
            updatedGifts.gifts[listOwnerId] = [];
          }
          updatedGifts.gifts[listOwnerId].push(giftItem);
          await saveGiftsGiving(currentUser.id, updatedGifts);
        }
      }

      await createOrUpdateUserList(list);
      // Real-time listener will update the UI automatically
    } catch (error) {
      console.error('Error toggling item check:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Add a manual gift item to a specific recipient
  const addGiftItem = async (recipientId: string, title: string, link?: string, notes?: string) => {
    setIsSyncing(true);
    try {
      const giftItem: GiftItem = {
        id: generateId(),
        title: title.trim(),
        link: link?.trim() || undefined,
        notes: notes?.trim() || undefined,
        source: 'manual',
        createdAt: Date.now()
      };

      const updatedGifts = { ...giftsGiving };
      if (!updatedGifts.gifts[recipientId]) {
        updatedGifts.gifts[recipientId] = [];
      }
      updatedGifts.gifts[recipientId].push(giftItem);

      await saveGiftsGiving(currentUser.id, updatedGifts);
      // Real-time listener will update the UI automatically
    } catch (error) {
      console.error('Error adding gift item:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Edit a gift item for a specific recipient
  const editGiftItem = async (recipientId: string, giftItemId: string, updatedData: { title?: string; link?: string; notes?: string }) => {
    setIsSyncing(true);
    try {
      const updatedGifts = { ...giftsGiving };
      if (updatedGifts.gifts[recipientId]) {
        updatedGifts.gifts[recipientId] = updatedGifts.gifts[recipientId].map(gift => {
          if (gift.id === giftItemId) {
            const updated = { ...gift, ...updatedData };
            // Remove properties that are explicitly set to undefined
            if (updatedData.link === undefined) {
              delete updated.link;
            }
            if (updatedData.notes === undefined) {
              delete updated.notes;
            }
            return updated;
          }
          return gift;
        });
        await saveGiftsGiving(currentUser.id, updatedGifts);
        // Real-time listener will update the UI automatically
      }
    } catch (error) {
      console.error('Error editing gift item:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Delete a gift item from a specific recipient
  const deleteGiftItem = async (recipientId: string, giftItemId: string) => {
    setIsSyncing(true);
    try {
      const updatedGifts = { ...giftsGiving };
      if (updatedGifts.gifts[recipientId]) {
        // Find the gift to check if it came from checking their list
        const giftToDelete = updatedGifts.gifts[recipientId].find(gift => gift.id === giftItemId);
        
        updatedGifts.gifts[recipientId] = updatedGifts.gifts[recipientId].filter(
          gift => gift.id !== giftItemId
        );
        await saveGiftsGiving(currentUser.id, updatedGifts);
        
        // If this gift came from checking an item on their list, uncheck it
        if (giftToDelete && giftToDelete.source === 'checked' && giftToDelete.sourceItemId) {
          await toggleItemCheck(recipientId, giftToDelete.sourceItemId);
        }
        
        // Real-time listener will update the UI automatically
      }
    } catch (error) {
      console.error('Error deleting gift item:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Export the currently selected list to a printable window (user can save as PDF)
  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const exportListAsPDF = () => {
    const selectedList = getSelectedList();
    if (!selectedList) return;
    if (!selectedList.items || selectedList.items.length === 0) {
      // nothing to export
      alert('This list is empty — there is nothing to export.');
      return;
    }
    const selectedUser = getSelectedUser();

    const title = `${escapeHtml(selectedUser.name)} - Christmas List`;

    const itemsHtml = selectedList.items.map((it, i) => {
      const titleEsc = escapeHtml(it.title || '');
      const linkPart = it.link ? ` &middot; <a href="${escapeHtml(it.link)}">${escapeHtml(it.link)}</a>` : '';
      return `<li style="margin:8px 0; font-size:16px;">${i + 1}. ${titleEsc}${linkPart}</li>`;
    }).join('');

    const pageStyles = `
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding:24px; color:#222 }
      h1 { color: #c41e3a; margin-bottom: 12px }
      ul { padding-left: 0; list-style: none }
      a { color: #c41e3a; text-decoration: none }
    `;

    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>${title}</title>
          <style>${pageStyles}</style>
        </head>
        <body>
          <h1>${title}</h1>
          <p style="color:#555; margin-bottom:10px;">Exported from Christmas Lists</p>
          <ul>${itemsHtml}</ul>
        </body>
      </html>`;

    const newWin = window.open('', '_blank');
    if (!newWin) {
      // Popup blocked
      alert('Popup blocked. Please allow popups for this site to export the PDF.');
      return;
    }

    newWin.document.open();
    newWin.document.write(html);
    newWin.document.close();
    // Give the browser a moment to render before triggering print
    newWin.focus();
    setTimeout(() => {
      try {
        newWin.print();
      } catch (err) {
        console.error('Print failed:', err);
      }
    }, 200);
  };

  if (isLoading) {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <h1>🎄 Christmas Lists! 🎄</h1>
          <div className="user-info">
            <span>Merry Christmas, {currentUser.name}!</span>
            <button onClick={onSignOut} className="sign-out-button">Sign Out</button>
          </div>
        </header>
        <div className="loading-container">
          <div className="loading-spinner">🎄</div>
          <p>Loading Christmas lists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button 
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <h1>🎄 Christmas Lists! 🎄</h1>
          <div className="user-info">
          <span>Merry Christmas, {currentUser.name}!</span>
          <div className="status-indicators">
            {isSyncing && <span className="sync-indicator">🔄 Syncing...</span>}
          </div>
          <button
            ref={settingsButtonRef}
            className="settings-button"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            title="Settings"
            aria-haspopup="true"
            aria-expanded={isSettingsOpen}
            aria-label="Settings"
          >
            {React.createElement(BsFillGearFill as any)}
          </button>

          {isSettingsOpen && (
            <div ref={settingsMenuRef} className="dropdown-content settings-dropdown">
              <div className="dropdown-item toggle-row" role="group" aria-label="Settings">
                <span className="toggle-label">Secret Santas</span>
                <div className="tooltip-container">
                  <label
                    className="toggle-switch"
                    aria-describedby="anonymize-tooltip"
                  >
                    <input
                      type="checkbox"
                      checked={anonymizeGivers}
                      onChange={() => toggleAnonymize()}
                      aria-label="Anonymize Gift Givers"
                    />
                    <span className="toggle-slider" />
                  </label>
                  <span className="tooltip-text" role="tooltip" id="anonymize-tooltip">Hide who's giving what to whom</span>
                </div>
              </div>

              <button
                className="dropdown-item delete"
                onClick={() => {
                  setIsSettingsOpen(false);
                  onSignOut();
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="dashboard-layout">
        {/* Mobile backdrop */}
        {isMobileMenuOpen && (
          <div 
            className="mobile-backdrop" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        
        <aside className={`sidebar ${isMobileMenuOpen ? 'sidebar-mobile-open' : ''}`}>
          <nav className="sidebar-nav">
            <h3>All Lists</h3>
            {[currentUser, ...USERS.filter(user => user.id !== currentUser.id)].map(user => (
              <button 
                key={user.id}
                className={`sidebar-tab ${selectedUserId === user.id && viewMode === 'lists' ? 'active' : ''}`}
                onClick={() => {
                  setViewMode('lists');
                  setSelectedUserId(user.id);
                  setIsReorderMode(false);
                  setShowAddForm(false);
                  setIsMobileMenuOpen(false); // Close mobile menu after selection
                }}
              >
                {user.name === currentUser.name ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display: 'inline-block', marginRight: '8px', verticalAlign: 'middle'}}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    My List
                  </>
                ) : (
                  user.name
                )}
              </button>
            ))}
            
            {/* Divider */}
            <div className="sidebar-divider"></div>
            
            {/* Gifts I'm Giving button */}
            <button 
              className={`sidebar-tab gifts-giving-tab ${viewMode === 'giftsGiving' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('giftsGiving');
                setIsMobileMenuOpen(false);
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display: 'inline-block', marginRight: '8px', verticalAlign: 'middle'}}>
                <polyline points="20 12 20 22 4 22 4 12"></polyline>
                <rect x="2" y="7" width="20" height="5"></rect>
                <line x1="12" y1="22" x2="12" y2="7"></line>
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
              </svg>
              Gifts I'm Giving
            </button>
          </nav>
        </aside>

        <main className="main-content">
          {viewMode === 'lists' ? (() => {
            const selectedUser = getSelectedUser();
            const selectedList = getSelectedList();
            const isOwner = selectedUserId === currentUser.id;

            return (
              <div className="list-section">
                <div className="section-header">
                  <h2>{selectedUser.name === currentUser.name ? 'My Christmas List' : `${selectedUser.name}'s List`}</h2>
                  {isOwner && selectedList && (
                    <div className="header-buttons">
                      <button 
                        onClick={() => setShowAddForm(true)} 
                        className="add-item-button"
                        disabled={showAddForm || isSyncing || isReorderMode}
                      >
                        + Add Item
                      </button>
                      <button 
                        onClick={() => setIsReorderMode(!isReorderMode)} 
                        className={`reorder-button ${isReorderMode ? 'active' : ''}`}
                        disabled={showAddForm || isSyncing || !selectedList?.items?.length || selectedList.items.length < 2}
                      >
                        {isReorderMode ? '✓ Done' : '⇅ Change Order'}
                      </button>
                    </div>
                  )}
                </div>

                {!selectedList && isOwner ? (
                  <div className="empty-state">
                    <p>You haven't created your Christmas list yet!</p>
                    <button 
                      onClick={createNewList} 
                      className="create-list-button"
                      disabled={isSyncing}
                    >
                      Create My List
                    </button>
                  </div>
                ) : !selectedList ? (
                  <div className="empty-state">
                    <p>{selectedUser.name} hasn't created their Christmas list yet.</p>
                  </div>
                ) : (
                  <>
                    {showAddForm && isOwner && (
                      <div className="add-item-section">
                        <h3>Add New Item</h3>
                        <AddItemForm 
                          onAddItem={addItem}
                          onCancel={() => setShowAddForm(false)}
                        />
                      </div>
                    )}

                    <div className="items-list">
                      {selectedList.items.length === 0 ? (
                        <p className="no-items">{isOwner ? 'No items in your list yet. Add some above!' : `${selectedUser.name} hasn't added any items yet.`}</p>
                      ) : (
                        selectedList.items.map((item: ChristmasItem, index: number) => (
                          <ChristmasItemComponent
                            key={item.id}
                            item={item}
                            isOwner={isOwner}
                            currentUser={currentUser}
                            listOwner={selectedUser}
                            anonymizeGivers={anonymizeGivers}
                            onToggleCheck={isOwner ? () => {} : (itemId) => toggleItemCheck(selectedUserId, itemId)}
                            onDeleteItem={isOwner ? deleteItem : undefined}
                            onEditItem={isOwner ? editItem : undefined}
                            onReorderItem={isOwner ? reorderItem : undefined}
                            itemIndex={index}
                            totalItems={selectedList.items.length}
                            isReorderMode={isReorderMode}
                          />
                        ))
                      )}
                    </div>

                    {/* Export button just below the list, right-aligned */}
                    {selectedList && (
                      <div className="export-pdf-wrapper" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                        <button
                          className="export-pdf-button"
                          onClick={exportListAsPDF}
                          aria-label={`Export ${getSelectedUser().name} list as PDF`}
                          disabled={!selectedList.items || selectedList.items.length === 0}
                        >
                          Export as PDF
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })() : (
            <div className="gifts-giving-section">
              <div className="section-header">
                <h2>Gifts I'm Giving</h2>
              </div>
              
              {USERS.filter(user => user.id !== currentUser.id).map(recipient => {
                const gifts = giftsGiving.gifts[recipient.id] || [];
                const isFormOpen = activeGiftFormRecipient === recipient.id;
                
                return (
                  <div key={recipient.id} className="recipient-section">
                    <h3>{recipient.name}</h3>
                    
                    <button 
                      onClick={() => setActiveGiftFormRecipient(isFormOpen ? null : recipient.id)} 
                      className="add-item-button"
                      disabled={isSyncing}
                      style={{marginBottom: '12px'}}
                    >
                      {isFormOpen ? 'Cancel' : '+ Add Gift'}
                    </button>
                    
                    {isFormOpen && (
                      <div className="add-item-section" style={{marginBottom: '12px'}}>
                        <AddItemForm 
                          onAddItem={(itemData) => {
                            addGiftItem(recipient.id, itemData.title, itemData.link, itemData.notes);
                            setActiveGiftFormRecipient(null);
                          }}
                          onCancel={() => setActiveGiftFormRecipient(null)}
                        />
                      </div>
                    )}
                    
                    <div className="items-list" style={gifts.length === 0 ? {padding: '20px'} : undefined}>
                      {gifts.length === 0 ? (
                        <p className="no-items" style={{padding: 0, margin: 0}}>No gifts planned for {recipient.name} yet. Add a custom gift or check off an item from their list!</p>
                      ) : (
                        gifts.map((gift: GiftItem) => (
                          <GiftItemComponent
                            key={gift.id}
                            gift={gift}
                            recipientId={recipient.id}
                            onEditItem={editGiftItem}
                            onDeleteItem={deleteGiftItem}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;