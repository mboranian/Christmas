import React, { useState, useEffect } from 'react';
import { ChristmasList, ChristmasItem, User, USERS } from '../types';
import { getUserList, createOrUpdateUserList, generateId, getAllLists, subscribeToLists, unsubscribeFromLists } from '../utils/storage';
import AddItemForm from './AddItemForm';
import ChristmasItemComponent from './ChristmasItemComponent';

interface DashboardProps {
  currentUser: User;
  onSignOut: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, onSignOut }) => {
  const [currentList, setCurrentList] = useState<ChristmasList | null>(null);
  const [allLists, setAllLists] = useState<ChristmasList[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'my-list' | 'all-lists'>('my-list');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    loadData();
    
    // Set up real-time listener
    const unsubscribe = subscribeToLists((lists) => {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('📡 Real-time update received');
      }
      setAllLists(lists);
      // Update current user's list if it changed
      const userList = lists.find(list => list.ownerId === currentUser.id);
      setCurrentList(userList || null);
      setIsOnline(true); // If we're getting updates, we're online
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
      const [userList, lists] = await Promise.all([
        getUserList(currentUser.id),
        getAllLists()
      ]);
      setCurrentList(userList || null);
      setAllLists(lists);
      setIsOnline(true);
    } catch (error) {
      console.error('Error loading data:', error);
      setIsOnline(false);
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
    setCurrentList(newList);
    setIsSyncing(true);
    try {
      await createOrUpdateUserList(newList);
      // Don't need to call loadData - real-time listener will update automatically
    } catch (error) {
      console.error('Error creating list:', error);
      setIsOnline(false);
    } finally {
      setIsSyncing(false);
    }
  };

  const addItem = async (itemData: Omit<ChristmasItem, 'id' | 'checkedBy' | 'createdAt'>) => {
    if (!currentList) return;

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

    setCurrentList(updatedList);
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
    if (!currentList) return;

    const updatedList = {
      ...currentList,
      items: currentList.items.filter(item => item.id !== itemId),
    };

    setCurrentList(updatedList);
    setIsSyncing(true);
    try {
      await createOrUpdateUserList(updatedList);
      // Real-time listener will update the UI automatically
    } catch (error) {
      console.error('Error deleting item:', error);
      setIsOnline(false);
    } finally {
      setIsSyncing(false);
    }
  };

  const editItem = async (itemId: string, updatedData: { title: string; link?: string }) => {
    if (!currentList) return;

    const updatedList = {
      ...currentList,
      items: currentList.items.map(item => 
        item.id === itemId 
          ? { ...item, ...updatedData }
          : item
      ),
    };

    setCurrentList(updatedList);
    setIsSyncing(true);
    try {
      await createOrUpdateUserList(updatedList);
      // Real-time listener will update the UI automatically
    } catch (error) {
      console.error('Error editing item:', error);
      setIsOnline(false);
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
      setIsOnline(false);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <h1>🎄 Christmas List Manager</h1>
          <div className="user-info">
            <span>Welcome, {currentUser.name}!</span>
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
        <h1>🎄 Christmas List Manager</h1>
        <div className="user-info">
          <span>Welcome, {currentUser.name}!</span>
          <div className="status-indicators">
            {isSyncing && <span className="sync-indicator">🔄 Syncing...</span>}
            <span className={`connection-indicator ${isOnline ? 'online' : 'offline'}`}>
              {isOnline ? '🌐 Online' : '📴 Offline'}
            </span>
          </div>
          <button onClick={onSignOut} className="sign-out-button">Sign Out</button>
        </div>
      </header>

      <nav className="dashboard-nav">
        <button 
          className={`nav-tab ${activeTab === 'my-list' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-list')}
        >
          My List
        </button>
        <button 
          className={`nav-tab ${activeTab === 'all-lists' ? 'active' : ''}`}
          onClick={() => setActiveTab('all-lists')}
        >
          Everyone's Lists
        </button>
      </nav>

      <main className="dashboard-content">
        {activeTab === 'my-list' && (
          <div className="my-list-section">
            <div className="section-header">
              <h2>My Christmas List</h2>
              {currentList && (
                <button 
                  onClick={() => setShowAddForm(true)} 
                  className="add-item-button"
                  disabled={showAddForm || isSyncing}
                >
                  + Add Item
                </button>
              )}
            </div>

            {!currentList ? (
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
            ) : (
              <>
                {showAddForm && (
                  <div className="add-item-section">
                    <h3>Add New Item</h3>
                    <AddItemForm 
                      onAddItem={addItem}
                      onCancel={() => setShowAddForm(false)}
                    />
                  </div>
                )}

                <div className="items-list">
                  {currentList.items.length === 0 ? (
                    <p className="no-items">No items in your list yet. Add some above!</p>
                  ) : (
                    currentList.items.map(item => (
                      <ChristmasItemComponent
                        key={item.id}
                        item={item}
                        isOwner={true}
                        currentUser={currentUser}
                        onToggleCheck={() => {}} // Owner can't check their own items
                        onDeleteItem={deleteItem}
                        onEditItem={editItem}
                      />
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'all-lists' && (
          <div className="all-lists-section">
            <h2>Everyone's Christmas Lists</h2>
            {allLists.filter(list => list.ownerId !== currentUser.id).length === 0 ? (
              <p className="no-lists">No other users have created lists yet.</p>
            ) : (
              <div className="users-lists">
                {USERS.filter(user => user.id !== currentUser.id).map(user => {
                  const userList = allLists.find(list => list.ownerId === user.id);
                  
                  return (
                    <div key={user.id} className="user-list-section">
                      <h3>{user.name}'s List</h3>
                      {!userList || userList.items.length === 0 ? (
                        <p className="no-items">{user.name} hasn't added any items yet.</p>
                      ) : (
                        <div className="items-list">
                          {userList.items.map(item => (
                            <ChristmasItemComponent
                              key={item.id}
                              item={item}
                              isOwner={false}
                              currentUser={currentUser}
                              onToggleCheck={(itemId) => toggleItemCheck(user.id, itemId)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;