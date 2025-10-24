import React, { useState, useEffect } from 'react';
import { ChristmasList, ChristmasItem, User, USERS } from '../types';
import { getUserList, createOrUpdateUserList, generateId, getAllLists } from '../utils/storage';
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

  useEffect(() => {
    loadData();
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = () => {
    const userList = getUserList(currentUser.id);
    setCurrentList(userList || null);
    setAllLists(getAllLists());
  };

  const createNewList = () => {
    const newList: ChristmasList = {
      id: generateId(),
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      items: [],
      createdAt: Date.now(),
    };
    setCurrentList(newList);
    createOrUpdateUserList(newList);
    loadData();
  };

  const addItem = (itemData: Omit<ChristmasItem, 'id' | 'checkedBy' | 'createdAt'>) => {
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
    createOrUpdateUserList(updatedList);
    setShowAddForm(false);
    loadData();
  };

  const deleteItem = (itemId: string) => {
    if (!currentList) return;

    const updatedList = {
      ...currentList,
      items: currentList.items.filter(item => item.id !== itemId),
    };

    setCurrentList(updatedList);
    createOrUpdateUserList(updatedList);
    loadData();
  };

  const toggleItemCheck = (listOwnerId: string, itemId: string) => {
    const lists = getAllLists();
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

    lists[listIndex] = list;
    createOrUpdateUserList(list);
    loadData();
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🎄 Christmas List Manager</h1>
        <div className="user-info">
          <span>Welcome, {currentUser.name}!</span>
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
                  disabled={showAddForm}
                >
                  + Add Item
                </button>
              )}
            </div>

            {!currentList ? (
              <div className="empty-state">
                <p>You haven't created your Christmas list yet!</p>
                <button onClick={createNewList} className="create-list-button">
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