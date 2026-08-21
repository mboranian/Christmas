import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import { USERS } from './types';

beforeEach(() => {
  localStorage.clear();
});

test('shows the sign-in page when nobody is signed in', async () => {
  render(<App />);
  expect(await screen.findByText(/please select your name/i)).toBeInTheDocument();
});

test('lists every family member on the sign-in page', async () => {
  render(<App />);
  // Wait for the initial loading state to resolve before asserting.
  await screen.findByText(/please select your name/i);

  for (const user of USERS) {
    expect(screen.getByText(user.name)).toBeInTheDocument();
  }
});
