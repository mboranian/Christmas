import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

const Boom = ({ message }: { message: string }) => {
  throw new Error(message);
};

beforeEach(() => {
  // React logs caught errors itself; keep the test output readable.
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

test('renders children when nothing throws', () => {
  render(
    <ErrorBoundary>
      <p>All fine</p>
    </ErrorBoundary>
  );
  expect(screen.getByText('All fine')).toBeInTheDocument();
});

test('shows a message instead of a blank page when a child throws', () => {
  render(
    <ErrorBoundary>
      <Boom message="checkedBy is undefined" />
    </ErrorBoundary>
  );

  expect(screen.getByRole('alert')).toBeInTheDocument();
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  // Reassures the user their data survived, which is the actual worry.
  expect(screen.getByText(/your lists are saved/i)).toBeInTheDocument();
  // Surfaces the cause so a screenshot is enough to diagnose it.
  expect(screen.getByText('checkedBy is undefined')).toBeInTheDocument();
});

test('offers a reload that actually reloads', () => {
  const reload = jest.fn();
  Object.defineProperty(window, 'location', {
    value: { ...window.location, reload },
    writable: true,
  });

  render(
    <ErrorBoundary>
      <Boom message="kaboom" />
    </ErrorBoundary>
  );

  fireEvent.click(screen.getByRole('button', { name: /reload/i }));
  expect(reload).toHaveBeenCalled();
});

test('logs the error for anyone who does open the console', () => {
  const spy = jest.spyOn(console, 'error');
  render(
    <ErrorBoundary>
      <Boom message="kaboom" />
    </ErrorBoundary>
  );
  expect(spy).toHaveBeenCalledWith(
    'Unhandled render error:',
    expect.objectContaining({ message: 'kaboom' }),
    expect.anything()
  );
});
