import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { HttpResponse, http } from 'msw';
import { useRouter, useSearchParams } from 'next/navigation';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe('Setup Flow', () => {
  // Define setup endpoints
  const setupEndpoints = [
    http.get('/api/setup/status', ({ request }) => {
      const url = new URL(request.url);
      const user = url.searchParams.get('user');
      
      return HttpResponse.json({
        status: 'awaiting_M',
        questions: [
          'What is the primary issue or topic you are hoping to discuss or resolve today?',
          'Briefly, what is your perspective or feeling about this issue?',
          'What is one specific outcome you would consider a success for this session?',
          'Is there any important background information the other person or the facilitator should know about this issue?',
          'On a scale of 1-10, how open do you feel to exploring different solutions right now?'
        ],
        userAnswers: null
      });
    }),
    http.post('/api/setup/answer', async () => {
      return HttpResponse.json({ success: true, nextStatus: 'awaiting_E' });
    })
  ];
  
  const server = setupServer(...setupEndpoints);
  
  // Setup before tests
  beforeAll(() => server.listen());
  
  // Reset handlers after each test
  afterEach(() => {
    server.resetHandlers();
    jest.clearAllMocks();
  });
  
  // Close server after all tests
  afterAll(() => server.close());
  
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
  };
  
  const mockSearchParams = {
    get: jest.fn(),
  };
  
  beforeEach(() => {
    // Set up router mock
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    // Set up search params mock
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });
  
  it('redirects to setup page when chat has no messages', async () => {
    // Define our server mock handlers for this test
    server.use(
      http.get('/api/messages', () => {
        return HttpResponse.json([]);
      }),
      http.get('/api/users', () => {
        return HttpResponse.json({ activeUsers: [], availableUser: 'M' });
      })
    );
    
    // Load the chat page with user M
    mockSearchParams.get.mockImplementation(key => key === 'user' ? 'M' : null);
    
    // Import and render the chat page
    const { default: ChatPage } = await import('./chat/page');
    render(<ChatPage />);
    
    // Wait for the logic to execute and verify the redirect happened
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/setup?user=M');
    });
  });
  
  it('allows user to select identity on main page', async () => {
    // Define handlers for this test
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json({ activeUsers: [], availableUser: null });
      })
    );
    
    mockSearchParams.get.mockImplementation(key => null);
    
    // Import and render the main page
    const { default: HomePage } = await import('./page');
    render(<HomePage />);
    
    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText('Ready to Chat!')).toBeInTheDocument();
    });
    
    // Click on M button
    fireEvent.click(screen.getByText('M'));
    
    // Click the Join button
    fireEvent.click(screen.getByText('Join as M'));
    
    // Check that router.push was called with the correct route
    expect(mockRouter.push).toHaveBeenCalledWith('/chat?user=M');
  });
  
  it('shows setup questions in proper sequence', async () => {
    // Define handlers for setup page test
    server.use(
      http.get('/api/setup/status', () => {
        return HttpResponse.json({
          status: 'awaiting_M',
          questions: [
            'What is the primary issue or topic you are hoping to discuss or resolve today?',
            'Briefly, what is your perspective or feeling about this issue?',
            'What is one specific outcome you would consider a success for this session?',
            'Is there any important background information the other person or the facilitator should know about this issue?',
            'On a scale of 1-10, how open do you feel to exploring different solutions right now?'
          ],
          userAnswers: null
        });
      })
    );
    
    mockSearchParams.get.mockImplementation(key => key === 'user' ? 'M' : null);
    
    // Import and render the setup page
    const { default: SetupPage } = await import('./setup/page');
    render(<SetupPage />);
    
    // Wait for setup questions to load
    await waitFor(() => {
      expect(screen.getByText('Setup Questions for User M')).toBeInTheDocument();
    });
    
    // First question should be visible
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('What is the primary issue or topic you are hoping to discuss or resolve today?')).toBeInTheDocument();
    
    // Enter an answer for the first question
    const textarea = screen.getByPlaceholderText('Your answer here...');
    fireEvent.change(textarea, { target: { value: 'This is my answer to question 1' } });
    
    // Go to the next question
    fireEvent.click(screen.getByText('Next'));
    
    // Second question should be visible
    await waitFor(() => {
      expect(screen.getByText('Question 2 of 5')).toBeInTheDocument();
      expect(screen.getByText('Briefly, what is your perspective or feeling about this issue?')).toBeInTheDocument();
    });
  });
  
  it('redirects to chat after both users complete setup', async () => {
    // Mock setup status as complete
    server.use(
      http.get('/api/setup/status', () => {
        return HttpResponse.json({
          status: 'complete',
          questions: [
            'Question 1',
            'Question 2',
            'Question 3',
            'Question 4',
            'Question 5'
          ],
          userAnswers: {
            q1: 'Answer 1',
            q2: 'Answer 2',
            q3: 'Answer 3',
            q4: 'Answer 4',
            q5: 'Answer 5'
          },
          summary: 'This is a summary of both users answers.'
        });
      })
    );
    
    mockSearchParams.get.mockImplementation(key => key === 'user' ? 'E' : null);
    
    // Import and render the setup page
    const { default: SetupPage } = await import('./setup/page');
    render(<SetupPage />);
    
    // Expect redirect to chat
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/chat?user=E');
    });
  });
}); 