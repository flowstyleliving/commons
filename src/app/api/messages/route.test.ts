import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from './route';
import { query } from '../../../../lib/db';
import openai from '../../../../lib/openai';

// Mock the database query and OpenAI client
jest.mock('../../../../lib/db', () => ({
  query: jest.fn()
}));

jest.mock('../../../../lib/openai', () => ({
  default: {
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }
}));

describe('GET /api/messages', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  
  it('returns all messages for the main room', async () => {
    // Sample messages
    const sampleMessages = [
      { id: '1', sender: 'M', content: 'Hello' },
      { id: '2', sender: 'assistant', content: 'Hi there' }
    ];
    
    // Mock the query result
    (query as jest.Mock).mockResolvedValueOnce({
      rows: sampleMessages
    });
    
    // Call the API endpoint
    const response = await GET();
    const data = await response.json();
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(data).toEqual(sampleMessages);
    
    // Verify the query
    expect(query).toHaveBeenCalledWith(`
      SELECT * FROM messages 
      WHERE room_id = 'main-room' 
      ORDER BY created_at ASC
    `);
  });
  
  it('returns 500 when query fails', async () => {
    // Mock error
    (query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));
    
    // Call the API endpoint
    const response = await GET();
    const data = await response.json();
    
    // Verify the response
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch messages' });
  });
});

describe('POST /api/messages', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  
  it('adds a new message and returns updated messages', async () => {
    // Create a mock request
    const request = {
      json: () => Promise.resolve({ sender: 'M', content: 'Hello world' })
    } as unknown as NextRequest;
    
    // Mock room state query
    (query as jest.Mock).mockResolvedValueOnce({
      rows: [{ current_turn: 'M', assistant_active: false }]
    });
    
    // Mock adding the message
    (query as jest.Mock).mockResolvedValueOnce({
      rows: [{ id: '1', sender: 'M', content: 'Hello world' }]
    });
    
    // Mock setting AI as active
    (query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
    
    // Mock getting message history
    (query as jest.Mock).mockResolvedValueOnce({
      rows: [{ sender: 'M', content: 'Hello world' }]
    });
    
    // Mock OpenAI response
    (openai.chat.completions.create as jest.Mock).mockResolvedValueOnce({
      choices: [{ message: { content: 'Hi there, how can I help?' } }]
    });
    
    // Mock saving assistant response
    (query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
    
    // Mock updating turn
    (query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
    
    // Mock getting all messages
    const updatedMessages = [
      { id: '1', sender: 'M', content: 'Hello world' },
      { id: '2', sender: 'assistant', content: 'Hi there, how can I help?' }
    ];
    (query as jest.Mock).mockResolvedValueOnce({
      rows: updatedMessages
    });
    
    // Call the API endpoint
    const response = await POST(request);
    const data = await response.json();
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(data).toEqual({
      messages: updatedMessages,
      currentTurn: 'E'
    });
  });
  
  it('returns 400 if sender or content is missing', async () => {
    // Create a mock request with missing fields
    const request = {
      json: () => Promise.resolve({ sender: 'M' }) // Missing content
    } as unknown as NextRequest;
    
    // Call the API endpoint
    const response = await POST(request);
    const data = await response.json();
    
    // Verify the response
    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Sender and content are required' });
  });
  
  it('returns 403 if it is not the user\'s turn', async () => {
    // Create a mock request
    const request = {
      json: () => Promise.resolve({ sender: 'M', content: 'Hello world' })
    } as unknown as NextRequest;
    
    // Mock room state query with different current turn
    (query as jest.Mock).mockResolvedValueOnce({
      rows: [{ current_turn: 'E', assistant_active: false }]
    });
    
    // Call the API endpoint
    const response = await POST(request);
    const data = await response.json();
    
    // Verify the response
    expect(response.status).toBe(403);
    expect(data).toEqual({ error: 'Not your turn' });
  });
}); 