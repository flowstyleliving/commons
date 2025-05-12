import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from './page';
import { handlers } from '../mocks/handlers';
import { setupServer } from 'msw/node';

// Set up request mocking
const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe('Home Page', () => {
  it('renders the user interface correctly', async () => {
    render(<Home />);
    
    // Check for header elements
    expect(screen.getByText('Komensa Chat')).toBeInTheDocument();
    expect(screen.getByText(/current turn/i)).toBeInTheDocument();
    expect(screen.getByText(/you are/i)).toBeInTheDocument();
    
    // Check for initial empty state
    await waitFor(() => {
      expect(screen.queryByText('No messages yet')).not.toBeInTheDocument();
    });
    
    // Should show the messages loaded from the mock
    expect(screen.getByText('Hello there!')).toBeInTheDocument();
    expect(screen.getByText('Hi M! How can I help you today?')).toBeInTheDocument();
    expect(screen.getByText('I have a question.')).toBeInTheDocument();
  });
  
  it('toggles between users M and E', async () => {
    render(<Home />);
    
    // Default should be user M
    const toggleButton = screen.getByText('You are: M');
    expect(toggleButton).toBeInTheDocument();
    
    // Toggle to user E
    await userEvent.click(toggleButton);
    expect(screen.getByText('You are: E')).toBeInTheDocument();
    
    // Toggle back to user M
    await userEvent.click(screen.getByText('You are: E'));
    expect(screen.getByText('You are: M')).toBeInTheDocument();
  });
  
  it('allows sending messages when it is the current user\'s turn', async () => {
    render(<Home />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Hello there!')).toBeInTheDocument();
    });
    
    // Input field and button should be enabled for user M (current turn in our mock)
    const inputField = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');
    
    expect(inputField).toBeEnabled();
    expect(sendButton).toBeDisabled(); // Initially disabled because input is empty
    
    // Type a message
    await userEvent.type(inputField, 'This is my message');
    expect(sendButton).toBeEnabled();
    
    // Send the message
    await userEvent.click(sendButton);
    
    // Should show a typing indicator while assistant is responding
    await waitFor(() => {
      expect(screen.getByText('AI is thinking and responding...')).toBeInTheDocument();
    });
    
    // Should show the sent message and AI response
    await waitFor(() => {
      expect(screen.getByText('This is my message')).toBeInTheDocument();
      expect(screen.getByText('I\'m responding to "This is my message"')).toBeInTheDocument();
    });
    
    // Turn should switch to user E
    await waitFor(() => {
      expect(screen.getByText('Waiting for E to take their turn...')).toBeInTheDocument();
    });
    
    // Input field should now be disabled for user M
    expect(inputField).toBeDisabled();
  });
  
  it('prevents sending messages when it is not the current user\'s turn', async () => {
    render(<Home />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Hello there!')).toBeInTheDocument();
    });
    
    // Switch to user E (who doesn't have the current turn in our mock)
    await userEvent.click(screen.getByText('You are: M'));
    
    // Input field should be disabled for user E
    const inputField = screen.getByPlaceholderText(/waiting for/i);
    expect(inputField).toBeDisabled();
    
    // Send button should be disabled
    const sendButton = screen.getByText('Send');
    expect(sendButton).toBeDisabled();
  });
}); 