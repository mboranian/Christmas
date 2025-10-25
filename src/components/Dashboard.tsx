import React, { useState, useEffect } from 'react';
import { ChristmasList, ChristmasItem, User, USERS } from '../types';
import { createOrUpdateUserList, generateId, getAllLists, subscribeToLists, unsubscribeFromLists } from '../utils/storage';
import AddItemForm from './AddItemForm';
import ChristmasItemComponent from './ChristmasItemComponent';

interface DashboardProps {
  currentUser: User;
  onSignOut: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, onSignOut }) => {
  const [allLists, setAllLists] = useState<ChristmasList[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Helper to get the currently selected list
  const getSelectedList = () => {
    return allLists.find(list => list.ownerId === selectedUserId) || null;
  };

  // Helper to get the selected user
  const getSelectedUser = () => {
    return USERS.find(user => user.id === selectedUserId) || currentUser;
  };

  useEffect(() => {
    loadData();
    
    // Set up real-time listener
    const unsubscribe = subscribeToLists((lists) => {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('📡 Real-time update received');
      }
      setAllLists(lists);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
      unsubscribeFromLists();
    };
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setIsLoading(true);
    try {
      const lists = await getAllLists();
      setAllLists(lists);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
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

  const editItem = async (itemId: string, updatedData: { title: string; link?: string }) => {
    const currentList = getSelectedList();
    if (!currentList || selectedUserId !== currentUser.id) return;

    const updatedList = {
      ...currentList,
      items: currentList.items.map((item: ChristmasItem) => 
        item.id === itemId 
          ? { ...item, ...updatedData }
          : item
      ),
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
      } else {
        item.checkedBy.push(currentUser.id);
      }

      await createOrUpdateUserList(list);
      // Real-time listener will update the UI automatically
    } catch (error) {
      console.error('Error toggling item check:', error);
    } finally {
      setIsSyncing(false);
    }
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
          <button onClick={onSignOut} className="sign-out-button">Sign Out</button>
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
                className={`sidebar-tab ${selectedUserId === user.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedUserId(user.id);
                  setIsReorderMode(false);
                  setShowAddForm(false);
                  setIsMobileMenuOpen(false); // Close mobile menu after selection
                }}
              >
                {user.name === currentUser.name ? '👤 My List' : `🎁 ${user.name}`}
              </button>
            ))}
          </nav>
        </aside>

        <main className="main-content">
          {(() => {
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
                            onToggleCheck={isOwner ? () => {} : (itemId) => toggleItemCheck(selectedUserId, itemId)}
                            onDeleteItem={isOwner ? deleteItem : undefined}
                            onEditItem={isOwner ? editItem : undefined}
                            onReorderItem={isOwner ? reorderItem : undefined}
                            itemIndex={index}
                            isReorderMode={isReorderMode}
                          />
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;