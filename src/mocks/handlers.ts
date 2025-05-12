import { http, HttpResponse } from 'msw';

// Message type definition
interface MessageRequest {
  sender: string;
  content: string;
}

// Sample message data
const messages = [
  {
    id: '1',
    sender: 'M',
    content: 'Hello there!',
    created_at: new Date().toISOString(),
    room_id: 'main-room'
  },
  {
    id: '2',
    sender: 'assistant',
    content: 'Hi M! How can I help you today?',
    created_at: new Date().toISOString(),
    room_id: 'main-room'
  },
  {
    id: '3',
    sender: 'E',
    content: 'I have a question.',
    created_at: new Date().toISOString(),
    room_id: 'main-room'
  }
];

// Room state
let roomState = {
  current_turn: 'M',
  assistant_active: false
};

export const handlers = [
  // GET messages
  http.get('/api/messages', () => {
    return HttpResponse.json(messages);
  }),

  // POST messages
  http.post('/api/messages', async ({ request }) => {
    const { sender, content } = await request.json() as MessageRequest;

    // Validate user's turn
    if (sender !== roomState.current_turn || roomState.assistant_active) {
      return new HttpResponse(
        JSON.stringify({ error: 'Not your turn' }),
        { status: 403 }
      );
    }

    // Create new user message
    const newUserMessage = {
      id: String(messages.length + 1),
      sender,
      content,
      created_at: new Date().toISOString(),
      room_id: 'main-room'
    };
    
    // Add message to array
    messages.push(newUserMessage);

    // Set assistant as active
    roomState.assistant_active = true;

    // Create AI response
    const assistantMessage = {
      id: String(messages.length + 1),
      sender: 'assistant',
      content: `I'm responding to "${content}"`,
      created_at: new Date().toISOString(),
      room_id: 'main-room'
    };
    
    // Add AI message
    messages.push(assistantMessage);

    // Update turn to other user
    const nextTurn = sender === 'M' ? 'E' : 'M';
    roomState.current_turn = nextTurn;
    roomState.assistant_active = false;

    return HttpResponse.json({
      messages,
      currentTurn: nextTurn
    });
  }),

  // GET turn status
  http.get('/api/turn', () => {
    return HttpResponse.json(roomState);
  })
]; 