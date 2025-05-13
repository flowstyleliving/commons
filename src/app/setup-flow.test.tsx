import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from './page';
import { handlers } from '../mocks/handlers';
import { setupHandlers, resetSetupState } from '../mocks/setupHandlers';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

// Set up request mocking
const server = setupServer(...handlers, ...setupHandlers);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  resetSetupState();
});
afterAll(() => server.close());

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe('Setup Flow Integration', () => {
  it('shows setup questions for user M when setup is not complete', async () => {
    render(<Home />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading Komensa...')).not.toBeInTheDocument();
    });
    
    // Should show setup questions
    await waitFor(() => {
      expect(screen.getByText(/Setup Questions for User/)).toBeInTheDocument();
    });
    
    // Should show first question
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
  });
  
  it('allows a user to complete the setup flow and proceed to chat', async () => {
    const user = userEvent.setup();
    render(<Home />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading Komensa...')).not.toBeInTheDocument();
    });
    
    // Complete all questions
    // Q1
    await user.type(screen.getByRole('textbox'), 'Communication issues');
    await user.click(screen.getByText('Next'));
    
    // Q2
    await user.type(screen.getByRole('textbox'), 'I feel frustrated');
    await user.click(screen.getByText('Next'));
    
    // Q3
    await user.type(screen.getByRole('textbox'), 'Better understanding');
    await user.click(screen.getByText('Next'));
    
    // Q4
    await user.type(screen.getByRole('textbox'), 'We have tried counseling before');
    await user.click(screen.getByText('Next'));
    
    // Q5
    await user.type(screen.getByRole('textbox'), '7');
    
    // Submit
    await user.click(screen.getByText('Submit All Answers'));
    
    // Should show waiting for other user (after submission)
    await waitFor(() => {
      expect(screen.getByText(/Waiting for User/)).toBeInTheDocument();
    });
    
    // TODO: In a real test with more control over the mock,
    // we would simulate the other user answering and check for the summary
  });
  
  it('shows chat interface after setup is complete', async () => {
    // Mock the setup as complete
    server.use(
      // Override the status endpoint to return complete status
      http.get('/api/setup/status', () => {
        return HttpResponse.json({
          status: 'complete',
          questions: ["question 1", "question 2"],
          userAnswers: null,
          summary: "This is a completed summary."
        });
      })
    );
    
    render(<Home />);
    
    // Should eventually show the user selection UI
    await waitFor(() => {
      expect(screen.getByText('Ready to Chat!')).toBeInTheDocument();
    });
    
    // Should show the user selection buttons
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();
  });
}); 