import { http, HttpResponse } from 'msw';

// Setup state
let setupState = {
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

// Store both users' answers
const userAnswers = {
  M: {},
  E: {}
};

// Reset setup state
export const resetSetupState = () => {
  setupState = {
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
  
  userAnswers.M = {};
  userAnswers.E = {};
};

export const setupHandlers = [
  // GET setup status
  http.get('/api/setup/status', ({ request }) => {
    const url = new URL(request.url);
    const user = url.searchParams.get('user') as 'M' | 'E' || 'M';
    
    // Return user-specific answers
    return HttpResponse.json({
      ...setupState,
      userAnswers: userAnswers[user] || null
    });
  }),
  
  // POST setup answer
  http.post('/api/setup/answer', async ({ request }) => {
    const url = new URL(request.url);
    const user = url.searchParams.get('user') as 'M' | 'E';
    const { answers } = await request.json();
    
    // Validate user
    if (!user || !['M', 'E'].includes(user)) {
      return new HttpResponse(
        JSON.stringify({ error: 'Valid user (M or E) must be specified' }), 
        { status: 400 }
      );
    }
    
    // Check if already complete
    if (['complete', 'summarizing', 'summarization_failed'].includes(setupState.status)) {
      return new HttpResponse(
        JSON.stringify({ error: 'Setup is already complete or in progress' }),
        { status: 400 }
      );
    }
    
    // Check if it's the user's turn
    if ((setupState.status === 'awaiting_M' && user !== 'M') || 
        (setupState.status === 'awaiting_E' && user !== 'E')) {
      return new HttpResponse(
        JSON.stringify({ error: 'Not your turn to answer setup questions' }),
        { status: 403 }
      );
    }
    
    // Save answers
    userAnswers[user] = answers;
    
    // Check if both users have answered
    const otherUser = user === 'M' ? 'E' : 'M';
    let nextStatus = setupState.status;
    let summary = null;
    
    if (Object.keys(userAnswers[otherUser]).length > 0) {
      // Both users have answered
      nextStatus = 'summarizing';
      
      // Simulate AI summary generation (would be async in real app)
      setTimeout(() => {
        setupState.summary = "This is a mock summary of the conversation topics and goals. It captures the key issues, perspectives, and desired outcomes from both participants based on their answers to the setup questions.";
        setupState.status = 'complete';
      }, 1500);
      
    } else {
      // Switch to the other user
      nextStatus = user === 'M' ? 'awaiting_E' : 'awaiting_M';
    }
    
    // Update the current status
    setupState.status = nextStatus;
    
    return HttpResponse.json({
      success: true,
      nextStatus,
      summary
    });
  })
];

// Include this in the main handlers
export const setupResetHandler = http.post('/api/reset', () => {
  resetSetupState();
  return HttpResponse.json({ success: true });
}); 