import { http, HttpResponse } from 'msw';
import { setupHandlers, setupResetHandler } from './setupHandlers';

// Message type definition
interface MessageRequest {
  sender: string;
  content: string;
}

interface TypingRequest {
  user: string;
  isTyping: boolean;
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

// Typing state
const typingUsers: string[] = [];

// Reset chat data
const resetChatData = () => {
  // Clear messages
  messages.length = 0;
  
  // Add initial message
  messages.push({
    id: '1',
    sender: 'assistant',
    content: 'Chat has been reset. Welcome to Komensa!',
    created_at: new Date().toISOString(),
    room_id: 'main-room'
  });
  
  // Reset room state
  roomState = {
    current_turn: 'M',
    assistant_active: false
  };
  
  // Also clear typing status
  typingUsers.length = 0;
  
  return { success: true, message: 'Chat reset successfully' };
};

export const handlers = [
  // Setup handlers
  ...setupHandlers,
  
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
  }),
  
  // POST reset chat
  http.post('/api/reset', () => {
    const result = resetChatData();
    // Also reset setup state from setupHandlers
    return HttpResponse.json(result);
  }),

  // POST typing status
  http.post('/api/typing', async ({ request }) => {
    const { user, isTyping } = await request.json() as TypingRequest;
    
    // Update typing status
    const existingIndex = typingUsers.indexOf(user);
    
    if (isTyping && existingIndex === -1) {
      // Add to typing users
      typingUsers.push(user);
    } else if (!isTyping && existingIndex !== -1) {
      // Remove from typing users
      typingUsers.splice(existingIndex, 1);
    }
    
    return HttpResponse.json({ success: true });
  }),
  
  // GET typing status
  http.get('/api/typing', () => {
    return HttpResponse.json({ typingUsers });
  })
]; 