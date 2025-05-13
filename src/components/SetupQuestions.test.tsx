import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SetupQuestions from './SetupQuestions';
import { setupHandlers, resetSetupState } from '../mocks/setupHandlers';
import { setupServer } from 'msw/node';

// Set up request mocking
const server = setupServer(...setupHandlers);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  resetSetupState();
});
afterAll(() => server.close());

// Sample setup data for testing
const initialSetupData = {
  status: 'awaiting_M',
  questions: [
    "What is the primary issue or topic you are hoping to discuss or resolve today?",
    "Briefly, what is your perspective or feeling about this issue?",
    "What is one specific outcome you would consider a success for this session?",
    "Is there any important background information the other person or the facilitator should know about this issue?",
    "On a scale of 1-10, how open do you feel to exploring different solutions right now?"
  ],
  userAnswers: null,
  summary: null
};

describe('SetupQuestions Component', () => {
  it('renders the first question correctly for user M', () => {
    const mockOnSetupComplete = jest.fn();
    const mockOnAnswersSubmitted = jest.fn();
    
    render(
      <SetupQuestions
        initialSetupData={initialSetupData}
        currentUser="M"
        onSetupComplete={mockOnSetupComplete}
        onAnswersSubmitted={mockOnAnswersSubmitted}
      />
    );
    
    // Check component header
    expect(screen.getByText('Setup Questions for User M')).toBeInTheDocument();
    
    // Check progress indicator
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    
    // Check first question content
    expect(screen.getByText(initialSetupData.questions[0])).toBeInTheDocument();
    
    // Check navigation buttons
    expect(screen.getByText('Back')).toBeDisabled();
    expect(screen.getByText('Next')).toBeEnabled();
  });
  
  it('navigates through questions when clicking Next and Back', async () => {
    const user = userEvent.setup();
    render(
      <SetupQuestions
        initialSetupData={initialSetupData}
        currentUser="M"
        onSetupComplete={jest.fn()}
        onAnswersSubmitted={jest.fn()}
      />
    );
    
    // Start at question 1
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    expect(screen.getByText(initialSetupData.questions[0])).toBeInTheDocument();
    
    // Click Next
    await user.click(screen.getByText('Next'));
    
    // Should show question 2
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument();
    expect(screen.getByText(initialSetupData.questions[1])).toBeInTheDocument();
    
    // Back button should be enabled now
    expect(screen.getByText('Back')).toBeEnabled();
    
    // Click Back
    await user.click(screen.getByText('Back'));
    
    // Should show question 1 again
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    expect(screen.getByText(initialSetupData.questions[0])).toBeInTheDocument();
  });
  
  it('displays Submit button on last question', async () => {
    const user = userEvent.setup();
    render(
      <SetupQuestions
        initialSetupData={initialSetupData}
        currentUser="M"
        onSetupComplete={jest.fn()}
        onAnswersSubmitted={jest.fn()}
      />
    );
    
    // Navigate to the last question (5)
    await user.click(screen.getByText('Next')); // to Q2
    await user.click(screen.getByText('Next')); // to Q3
    await user.click(screen.getByText('Next')); // to Q4
    await user.click(screen.getByText('Next')); // to Q5
    
    // Should show question 5
    expect(screen.getByText('Question 5 of 5')).toBeInTheDocument();
    
    // Should show Submit button instead of Next
    expect(screen.queryByText('Next')).not.toBeInTheDocument();
    expect(screen.getByText('Submit All Answers')).toBeInTheDocument();
  });
  
  it('completes the full user M flow and submits answers', async () => {
    const user = userEvent.setup();
    const mockOnAnswersSubmitted = jest.fn();
    
    render(
      <SetupQuestions
        initialSetupData={initialSetupData}
        currentUser="M"
        onSetupComplete={jest.fn()}
        onAnswersSubmitted={mockOnAnswersSubmitted}
      />
    );
    
    // Fill in Q1
    await user.type(screen.getByRole('textbox'), 'Communication issues');
    await user.click(screen.getByText('Next'));
    
    // Fill in Q2
    await user.type(screen.getByRole('textbox'), 'I feel frustrated');
    await user.click(screen.getByText('Next'));
    
    // Fill in Q3
    await user.type(screen.getByRole('textbox'), 'Better understanding');
    await user.click(screen.getByText('Next'));
    
    // Fill in Q4
    await user.type(screen.getByRole('textbox'), 'We have tried counseling before');
    await user.click(screen.getByText('Next'));
    
    // Fill in Q5
    await user.type(screen.getByRole('textbox'), '7');
    
    // Submit all answers
    await user.click(screen.getByText('Submit All Answers'));
    
    // Should show loading state
    expect(screen.getByText('Submitting answers...')).toBeInTheDocument();
    
    // Should call onAnswersSubmitted with the user
    await waitFor(() => {
      expect(mockOnAnswersSubmitted).toHaveBeenCalledWith('M');
    });
  });
  
  it('shows waiting message when not user\'s turn', () => {
    render(
      <SetupQuestions
        initialSetupData={{
          ...initialSetupData,
          status: 'awaiting_E'
        }}
        currentUser="M"
        onSetupComplete={jest.fn()}
        onAnswersSubmitted={jest.fn()}
      />
    );
    
    // Should show waiting message
    expect(screen.getByText('Waiting for User E to answer the setup questions.')).toBeInTheDocument();
  });
  
  it('shows summary and proceed button when setup is complete', () => {
    const mockOnSetupComplete = jest.fn();
    
    render(
      <SetupQuestions
        initialSetupData={{
          ...initialSetupData,
          status: 'complete',
          summary: 'This is a test summary of the conversation.'
        }}
        currentUser="M"
        onSetupComplete={mockOnSetupComplete}
        onAnswersSubmitted={jest.fn()}
      />
    );
    
    // Should show the summary
    expect(screen.getByText('This is a test summary of the conversation.')).toBeInTheDocument();
    
    // Should have a button to proceed
    const proceedButton = screen.getByText('Proceed to Chat');
    expect(proceedButton).toBeInTheDocument();
    
    // Click the proceed button
    fireEvent.click(proceedButton);
    
    // Should call onSetupComplete
    expect(mockOnSetupComplete).toHaveBeenCalled();
  });
  
  it('persists answers when navigating between questions', async () => {
    const user = userEvent.setup();
    
    render(
      <SetupQuestions
        initialSetupData={initialSetupData}
        currentUser="M"
        onSetupComplete={jest.fn()}
        onAnswersSubmitted={jest.fn()}
      />
    );
    
    // Type an answer for question 1
    await user.type(screen.getByRole('textbox'), 'Answer for Q1');
    
    // Navigate to question 2
    await user.click(screen.getByText('Next'));
    
    // Type an answer for question 2
    await user.type(screen.getByRole('textbox'), 'Answer for Q2');
    
    // Navigate back to question 1
    await user.click(screen.getByText('Back'));
    
    // The answer for question 1 should still be there
    expect(screen.getByRole('textbox')).toHaveValue('Answer for Q1');
    
    // Navigate to question 2 again
    await user.click(screen.getByText('Next'));
    
    // The answer for question 2 should still be there
    expect(screen.getByRole('textbox')).toHaveValue('Answer for Q2');
  });
}); 