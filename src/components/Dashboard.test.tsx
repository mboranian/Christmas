import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from './Dashboard';
import { ChristmasList, GiftsGiving, User } from '../types';
import * as storage from '../utils/storage';

jest.mock('../utils/storage');

const mocked = storage as jest.Mocked<typeof storage>;
const MATTHEW: User = { id: 'matthew', name: 'Matthew' };

let lists: ChristmasList[];
let gifts: GiftsGiving;

// Firestore hands back fresh objects on every read; mimic that so the component
// can't accidentally mutate our fixtures in place.
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

beforeEach(() => {
  jest.clearAllMocks();

  // Andy's list has an item that NOBODY has checked...
  lists = [
    {
      id: 'list-matthew',
      ownerId: 'matthew',
      ownerName: 'Matthew',
      createdAt: 1,
      items: [{ id: 'mine-1', title: 'Gloves', checkedBy: [], createdAt: 1 }],
    },
    {
      id: 'list-andy',
      ownerId: 'andy',
      ownerName: 'Andy',
      createdAt: 1,
      items: [{ id: 'item-1', title: 'Wool socks', checkedBy: [], createdAt: 1 }],
    },
  ];

  // ...yet Matthew still has a gift recorded as coming from that item. This is
  // the drift state that a delete has to handle without re-creating anything.
  gifts = {
    userId: 'matthew',
    gifts: {
      andy: [
        {
          id: 'gift-1',
          title: 'Wool socks',
          source: 'checked',
          sourceItemId: 'item-1',
          createdAt: 1,
        },
      ],
    },
  };

  mocked.getAllLists.mockImplementation(async () => copy(lists));
  mocked.getGiftsGiving.mockImplementation(async () => copy(gifts));
  mocked.getUserPrefs.mockImplementation(async () => ({}));
  mocked.saveUserPrefs.mockImplementation(async () => {});
  mocked.generateId.mockImplementation(() => 'generated-id');

  mocked.saveGiftsGiving.mockImplementation(async (_userId, data) => {
    gifts = copy(data);
  });
  // Stands in for the Firestore transaction: the mutator always sees the
  // current server state, never a copy the component read earlier.
  mocked.updateUserList.mockImplementation(async (ownerId, mutate) => {
    const current = lists.find((l) => l.ownerId === ownerId) ?? null;
    const next = mutate(current ? copy(current) : null);
    const i = lists.findIndex((l) => l.ownerId === ownerId);
    if (i >= 0) lists[i] = copy(next);
    else lists.push(copy(next));
  });

  mocked.subscribeToLists.mockImplementation((cb) => {
    cb(copy(lists));
    return () => {};
  });
  mocked.subscribeToGiftsGiving.mockImplementation((_userId, cb) => {
    cb(copy(gifts));
    return () => {};
  });
  mocked.subscribeToUserPrefs.mockImplementation((_userId, cb) => {
    cb({});
    return () => {};
  });
});

async function openGiftsGivingAndRemoveTheGift() {
  render(<Dashboard currentUser={MATTHEW} onSignOut={() => {}} />);

  fireEvent.click(await screen.findByRole('button', { name: /gifts i'm giving/i }));

  // Open the gift's "..." menu, then hit Remove.
  const menuButtons = await screen.findAllByTitle('More options');
  fireEvent.click(menuButtons[0]);
  fireEvent.click(await screen.findByText('Remove'));

  await waitFor(() => expect(mocked.saveGiftsGiving).toHaveBeenCalled());
}

test('removing a gift does not re-check the source item', async () => {
  await openGiftsGivingAndRemoveTheGift();

  // The source item was already unchecked, so there is nothing to write back.
  // The old toggle-based code flipped it to CHECKED here.
  await waitFor(() => {
    const andysItem = lists[0].items[0];
    expect(andysItem.checkedBy).toEqual([]);
  });
});

test('removing a gift does not resurrect it as a new gift', async () => {
  await openGiftsGivingAndRemoveTheGift();

  await waitFor(() => {
    expect(gifts.gifts.andy ?? []).toEqual([]);
  });
});

test('an edit builds on server state, not the copy the page loaded with', async () => {
  render(<Dashboard currentUser={MATTHEW} onSignOut={() => {}} />);
  await screen.findByText('Gloves');

  // Another device adds an item after this page rendered. The component's own
  // state still shows one item; the server now has two.
  lists = lists.map((l) =>
    l.ownerId !== 'matthew'
      ? l
      : { ...l, items: [...l.items, { id: 'mine-2', title: 'Scarf', checkedBy: [], createdAt: 2 }] }
  );

  fireEvent.click(screen.getByRole('button', { name: /add item/i }));
  fireEvent.change(screen.getByLabelText(/item name/i), { target: { value: 'Boots' } });
  fireEvent.click(screen.getByRole('button', { name: /^add item$/i }));

  await waitFor(() => expect(mocked.updateUserList).toHaveBeenCalled());

  // All three survive. Writing back a stale local copy would have lost 'Scarf'.
  await waitFor(() => {
    const titles = lists.find((l) => l.ownerId === 'matthew')!.items.map((i) => i.title);
    expect(titles).toEqual(['Gloves', 'Scarf', 'Boots']);
  });
});

test('a failed write tells the user instead of looking saved', async () => {
  mocked.updateUserList.mockRejectedValue(new Error('offline'));

  render(<Dashboard currentUser={MATTHEW} onSignOut={() => {}} />);
  await screen.findByText('Gloves');

  fireEvent.click(screen.getByRole('button', { name: /add item/i }));
  fireEvent.change(screen.getByLabelText(/item name/i), { target: { value: 'Boots' } });
  fireEvent.click(screen.getByRole('button', { name: /^add item$/i }));

  expect(await screen.findByText(/wasn't saved/i)).toBeInTheDocument();
});
