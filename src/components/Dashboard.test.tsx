import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from './Dashboard';
import { ChristmasList, GiftsGiving, User,
  CURRENT_SEASON_YEAR, FIRST_SEASON_YEAR, SEASON_YEARS } from '../types';
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

  mocked.saveGiftsGiving.mockImplementation(async (_year, _userId, data) => {
    gifts = copy(data);
  });
  // Stands in for the Firestore transaction: the mutator always sees the
  // current server state, never a copy the component read earlier.
  mocked.updateUserList.mockImplementation(async (_year, ownerId, mutate) => {
    const current = lists.find((l) => l.ownerId === ownerId) ?? null;
    const next = mutate(current ? copy(current) : null);
    const i = lists.findIndex((l) => l.ownerId === ownerId);
    if (i >= 0) lists[i] = copy(next);
    else lists.push(copy(next));
  });

  mocked.subscribeToLists.mockImplementation((_year, cb) => {
    cb(copy(lists));
    return () => {};
  });
  mocked.subscribeToGiftsGiving.mockImplementation((_year, _userId, cb) => {
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

// --- helpers for the tests below -------------------------------------------

function setMatthewItems(items: { id: string; title: string; checkedBy?: string[] }[]) {
  lists = lists.map((l) =>
    l.ownerId !== 'matthew'
      ? l
      : { ...l, items: items.map((i, n) => ({ checkedBy: [], createdAt: n + 1, ...i })) }
  );
}

const matthewItems = () => lists.find((l) => l.ownerId === 'matthew')!.items;
const andyItems = () => lists.find((l) => l.ownerId === 'andy')!.items;

function renderDashboard() {
  return render(<Dashboard currentUser={MATTHEW} onSignOut={() => {}} />);
}

async function openFirstItemMenu() {
  fireEvent.click((await screen.findAllByTitle('More options'))[0]);
}

// --- own-list mutations ----------------------------------------------------

test('editing an item saves the new title and drops cleared fields', async () => {
  setMatthewItems([{ id: 'a', title: 'Gloves' }]);
  renderDashboard();
  await screen.findByText('Gloves');

  await openFirstItemMenu();
  fireEvent.click(await screen.findByText('Edit'));

  fireEvent.change(screen.getByPlaceholderText('Item name'), { target: { value: 'Warm gloves' } });
  fireEvent.click(screen.getByText('Save'));

  await waitFor(() => expect(matthewItems()[0].title).toBe('Warm gloves'));
  // Link and notes were left blank, so they must not be persisted as undefined —
  // Firestore rejects undefined values.
  expect('link' in matthewItems()[0]).toBe(false);
  expect('notes' in matthewItems()[0]).toBe(false);
});

test('deleting an item removes only that item', async () => {
  setMatthewItems([{ id: 'a', title: 'Gloves' }, { id: 'b', title: 'Scarf' }]);
  renderDashboard();
  await screen.findByText('Gloves');

  await openFirstItemMenu();
  fireEvent.click(await screen.findByText('Delete'));

  await waitFor(() => expect(matthewItems().map((i) => i.title)).toEqual(['Scarf']));
});

test('reordering moves the dragged item to the target position', async () => {
  setMatthewItems([
    { id: 'a', title: 'Gloves' },
    { id: 'b', title: 'Scarf' },
    { id: 'c', title: 'Boots' },
  ]);
  renderDashboard();
  await screen.findByText('Boots');

  fireEvent.click(screen.getByText(/change order/i));

  // Drag 'Boots' onto 'Gloves'.
  const rows = document.querySelectorAll('.christmas-item');
  fireEvent.drop(rows[0], { dataTransfer: { getData: () => 'c' } });

  await waitFor(() =>
    expect(matthewItems().map((i) => i.title)).toEqual(['Boots', 'Gloves', 'Scarf'])
  );
});

test('a reorder referencing a since-deleted item leaves the order alone', async () => {
  setMatthewItems([{ id: 'a', title: 'Gloves' }, { id: 'b', title: 'Scarf' }]);
  renderDashboard();
  await screen.findByText('Scarf');

  fireEvent.click(screen.getByText(/change order/i));
  const rows = document.querySelectorAll('.christmas-item');
  fireEvent.drop(rows[0], { dataTransfer: { getData: () => 'gone' } });

  await waitFor(() => expect(mocked.updateUserList).toHaveBeenCalled());
  expect(matthewItems().map((i) => i.title)).toEqual(['Gloves', 'Scarf']);
});

test('creating a list when none exists', async () => {
  lists = lists.filter((l) => l.ownerId !== 'matthew');
  renderDashboard();

  fireEvent.click(await screen.findByText(/create my list/i));

  await waitFor(() => expect(lists.some((l) => l.ownerId === 'matthew')).toBe(true));
  expect(lists.find((l) => l.ownerId === 'matthew')!.items).toEqual([]);
});

// --- checking someone else's list -> gifts-giving ---------------------------

async function openAndysList() {
  fireEvent.click(await screen.findByRole('button', { name: /^andy$/i }));
}

test("checking an item on someone else's list records a gift", async () => {
  gifts = { userId: 'matthew', gifts: {} };
  renderDashboard();
  await openAndysList();

  fireEvent.click(await screen.findByTitle(/getting this for Andy/i));

  await waitFor(() => expect(andyItems()[0].checkedBy).toEqual(['matthew']));
  await waitFor(() => {
    const mine = gifts.gifts.andy || [];
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ title: 'Wool socks', source: 'checked', sourceItemId: 'item-1' });
  });
});

test('unchecking removes the gift it created', async () => {
  lists = lists.map((l) =>
    l.ownerId !== 'andy' ? l : { ...l, items: [{ ...l.items[0], checkedBy: ['matthew'] }] }
  );
  renderDashboard();
  await openAndysList();

  fireEvent.click(await screen.findByTitle(/not getting this/i));

  await waitFor(() => expect(andyItems()[0].checkedBy).toEqual([]));
  await waitFor(() => expect(gifts.gifts.andy || []).toEqual([]));
});

test('a check does not write undefined link or notes to Firestore', async () => {
  gifts = { userId: 'matthew', gifts: {} };
  renderDashboard();
  await openAndysList();

  fireEvent.click(await screen.findByTitle(/getting this for Andy/i));

  await waitFor(() => expect(gifts.gifts.andy).toHaveLength(1));
  const gift = gifts.gifts.andy[0];
  expect('link' in gift).toBe(false);
  expect('notes' in gift).toBe(false);
});

// --- gifts-giving view -----------------------------------------------------

async function openGiftsGiving() {
  fireEvent.click(await screen.findByRole('button', { name: /gifts i'm giving/i }));
}

test('adding a manual gift stores it against the recipient', async () => {
  gifts = { userId: 'matthew', gifts: {} };
  renderDashboard();
  await openGiftsGiving();

  fireEvent.click((await screen.findAllByText('+ Add Gift'))[0]);
  fireEvent.change(screen.getByLabelText(/item name/i), { target: { value: 'A book' } });
  fireEvent.click(screen.getByRole('button', { name: /^add item$/i }));

  await waitFor(() => {
    const forAndy = gifts.gifts.andy || [];
    expect(forAndy).toHaveLength(1);
    expect(forAndy[0]).toMatchObject({ title: 'A book', source: 'manual' });
  });
});

// --- settings --------------------------------------------------------------

test('the anonymize toggle persists and hides giver names', async () => {
  lists = lists.map((l) =>
    l.ownerId !== 'andy' ? l : { ...l, items: [{ ...l.items[0], checkedBy: ['elena'] }] }
  );
  renderDashboard();
  await openAndysList();

  // Named by default.
  expect(await screen.findByText(/Elena's got this/i)).toBeInTheDocument();

  fireEvent.click(screen.getByLabelText('Settings'));
  fireEvent.click(screen.getByLabelText('Anonymize Gift Givers'));

  await waitFor(() =>
    expect(mocked.saveUserPrefs).toHaveBeenCalledWith('matthew', { anonymizeGivers: true })
  );
  expect(await screen.findByText(/Santa's got this/i)).toBeInTheDocument();
  expect(screen.queryByText(/Elena's got this/i)).not.toBeInTheDocument();
});

// --- PDF export ------------------------------------------------------------

function stubPrintWindow() {
  const written: string[] = [];
  const fake = {
    document: { open: () => {}, write: (h: string) => written.push(h), close: () => {} },
    focus: () => {},
    print: jest.fn(),
  };
  jest.spyOn(window, 'open').mockReturnValue(fake as unknown as Window);
  return { written, fake };
}

test('exporting builds a printable page listing every item', async () => {
  setMatthewItems([{ id: 'a', title: 'Gloves' }, { id: 'b', title: 'Scarf' }]);
  const { written } = stubPrintWindow();

  renderDashboard();
  fireEvent.click(await screen.findByText(/export as pdf/i));

  const html = written.join('');
  expect(html).toContain('Matthew - Christmas List');
  expect(html).toContain('1. Gloves');
  expect(html).toContain('2. Scarf');
});

test('exporting escapes titles so a list cannot inject markup', async () => {
  setMatthewItems([{ id: 'a', title: '<script>alert(1)</script>' }]);
  const { written } = stubPrintWindow();

  renderDashboard();
  fireEvent.click(await screen.findByText(/export as pdf/i));

  const html = written.join('');
  expect(html).not.toContain('<script>alert(1)</script>');
  expect(html).toContain('&lt;script&gt;');
});

test('exporting an empty list warns instead of opening a window', async () => {
  setMatthewItems([]);
  const openSpy = jest.spyOn(window, 'open');
  const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

  renderDashboard();
  await screen.findByText(/no items in your list yet/i);

  // The button is disabled for an empty list, so drive the handler directly.
  const button = screen.getByRole('button', { name: /export .* as pdf/i });
  expect(button).toBeDisabled();
  expect(openSpy).not.toHaveBeenCalled();
  alertSpy.mockRestore();
});

test('a blocked popup is reported rather than failing silently', async () => {
  setMatthewItems([{ id: 'a', title: 'Gloves' }]);
  jest.spyOn(window, 'open').mockReturnValue(null);
  const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

  renderDashboard();
  fireEvent.click(await screen.findByText(/export as pdf/i));

  expect(alertSpy).toHaveBeenCalledWith(expect.stringMatching(/popup blocked/i));
  alertSpy.mockRestore();
});

// --- seasons ---------------------------------------------------------------
//
// Years come from the constants, never literals, so these keep meaning after
// the calendar rolls over.

const ARCHIVE_YEAR = FIRST_SEASON_YEAR;

test('the picker offers every season, newest first, defaulting to this one', async () => {
  renderDashboard();
  const picker = (await screen.findByLabelText('Christmas year')) as HTMLSelectElement;

  expect(Array.from(picker.options).map((o) => Number(o.value))).toEqual(SEASON_YEARS);
  expect(Number(picker.value)).toBe(CURRENT_SEASON_YEAR);
  expect(SEASON_YEARS[0]).toBe(CURRENT_SEASON_YEAR);
});

test('choosing a season loads that season’s data', async () => {
  renderDashboard();
  await screen.findByText('Gloves');
  expect(mocked.getAllLists).toHaveBeenCalledWith(CURRENT_SEASON_YEAR);

  fireEvent.change(screen.getByLabelText('Christmas year'), {
    target: { value: String(ARCHIVE_YEAR) },
  });

  await waitFor(() => expect(mocked.getAllLists).toHaveBeenCalledWith(ARCHIVE_YEAR));
  await waitFor(() => expect(mocked.subscribeToLists).toHaveBeenCalledWith(ARCHIVE_YEAR, expect.any(Function)));
});

describe('an archived season is read-only', () => {
  beforeEach(() => {
    // Guard against a clock where there is no past season to test.
    expect(ARCHIVE_YEAR).toBeLessThan(CURRENT_SEASON_YEAR);
  });

  async function viewArchive() {
    renderDashboard();
    await screen.findByText('Gloves');
    fireEvent.change(screen.getByLabelText('Christmas year'), {
      target: { value: String(ARCHIVE_YEAR) },
    });
    await screen.findByText(new RegExp(`viewing the ${ARCHIVE_YEAR} lists`, 'i'));
  }

  test('says so, and drops the add and reorder controls', async () => {
    await viewArchive();

    expect(screen.getByText(/can't be changed/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add item/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/change order/i)).not.toBeInTheDocument();
  });

  test('own items offer no edit or delete menu', async () => {
    await viewArchive();
    expect(screen.queryAllByTitle('More options')).toHaveLength(0);
  });

  test("another person's items cannot be checked off", async () => {
    await viewArchive();
    fireEvent.click(screen.getByRole('button', { name: /^andy$/i }));

    await screen.findByText('Wool socks');
    expect(screen.queryByTitle(/getting this for Andy/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/not getting this/i)).not.toBeInTheDocument();
  });

  test('no gifts can be added', async () => {
    await viewArchive();
    fireEvent.click(await screen.findByRole('button', { name: /gifts i'm giving/i }));

    // 'Andy' also matches the sidebar tab; scope to the recipient heading.
    await screen.findByRole('heading', { name: 'Andy' });
    expect(screen.queryAllByText('+ Add Gift')).toHaveLength(0);
  });

  test('the list is still readable and exportable', async () => {
    const { written } = stubPrintWindow();
    await viewArchive();

    expect(screen.getByText('Gloves')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/export as pdf/i));
    expect(written.join('')).toContain('Gloves');
  });

  test('no write reaches storage even if one were attempted', async () => {
    await viewArchive();
    expect(mocked.updateUserList).not.toHaveBeenCalled();
    expect(mocked.saveGiftsGiving).not.toHaveBeenCalled();
  });
});
