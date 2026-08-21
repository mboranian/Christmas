import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignInPage from './SignInPage';
import { USERS, USER_PASSWORD_HASHES } from '../types';
import { hashPassword } from '../utils/hash';

// Web Crypto isn't reliably available under jsdom, and the real passwords
// aren't in the repo — only their hashes. Stubbing the hash lets us drive both
// the matching and non-matching paths without knowing any password.
jest.mock('../utils/hash');
const mockedHash = hashPassword as jest.MockedFunction<typeof hashPassword>;

const ANDY_HASH = USER_PASSWORD_HASHES.andy;

beforeEach(() => jest.clearAllMocks());

test('lists every family member', () => {
  render(<SignInPage onSignIn={() => {}} />);
  for (const user of USERS) {
    expect(screen.getByText(user.name)).toBeInTheDocument();
  }
});

test('choosing a name opens that person’s password prompt', () => {
  render(<SignInPage onSignIn={() => {}} />);
  fireEvent.click(screen.getByText('Andy'));
  expect(screen.getByText(/welcome, andy/i)).toBeInTheDocument();
});

test('a matching password signs the user in', async () => {
  mockedHash.mockResolvedValue(ANDY_HASH);
  const onSignIn = jest.fn();

  render(<SignInPage onSignIn={onSignIn} />);
  fireEvent.click(screen.getByText('Andy'));
  fireEvent.change(screen.getByLabelText(/enter your password/i), { target: { value: 'whatever' } });
  fireEvent.click(screen.getByRole('button', { name: /enter/i }));

  await waitFor(() => expect(onSignIn).toHaveBeenCalledWith({ id: 'andy', name: 'Andy' }));
});

test('a wrong password shows an error and does not sign in', async () => {
  mockedHash.mockResolvedValue('0'.repeat(64));
  const onSignIn = jest.fn();

  render(<SignInPage onSignIn={onSignIn} />);
  fireEvent.click(screen.getByText('Andy'));
  fireEvent.change(screen.getByLabelText(/enter your password/i), { target: { value: 'nope' } });
  fireEvent.click(screen.getByRole('button', { name: /enter/i }));

  expect(await screen.findByText(/incorrect password/i)).toBeInTheDocument();
  expect(onSignIn).not.toHaveBeenCalled();
});

test("one person's password cannot sign in as another", async () => {
  // Hand back Andy's hash while Elena is selected.
  mockedHash.mockResolvedValue(ANDY_HASH);
  const onSignIn = jest.fn();

  render(<SignInPage onSignIn={onSignIn} />);
  fireEvent.click(screen.getByText('Elena'));
  fireEvent.change(screen.getByLabelText(/enter your password/i), { target: { value: 'andys-password' } });
  fireEvent.click(screen.getByRole('button', { name: /enter/i }));

  expect(await screen.findByText(/incorrect password/i)).toBeInTheDocument();
  expect(onSignIn).not.toHaveBeenCalled();
});

test('typing again clears the error', async () => {
  mockedHash.mockResolvedValue('0'.repeat(64));

  render(<SignInPage onSignIn={() => {}} />);
  fireEvent.click(screen.getByText('Andy'));
  const input = screen.getByLabelText(/enter your password/i);
  fireEvent.change(input, { target: { value: 'nope' } });
  fireEvent.click(screen.getByRole('button', { name: /enter/i }));
  await screen.findByText(/incorrect password/i);

  fireEvent.change(input, { target: { value: 'nope2' } });
  expect(screen.queryByText(/incorrect password/i)).not.toBeInTheDocument();
});

test('every name in the roster has a password hash', () => {
  // A missing hash would lock that person out entirely, and nothing else in the
  // app would tell you.
  for (const user of USERS) {
    expect(USER_PASSWORD_HASHES[user.id]).toMatch(/^[0-9a-f]{64}$/);
  }
});
