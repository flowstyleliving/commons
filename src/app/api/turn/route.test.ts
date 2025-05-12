import { NextRequest } from 'next/server';
import { GET } from './route';
import { query } from '../../../../lib/db';

// Mock the database query
jest.mock('../../../../lib/db', () => ({
  query: jest.fn()
}));

describe('GET /api/turn', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  
  it('returns the current turn status', async () => {
    // Mock the query result
    (query as jest.Mock).mockResolvedValueOnce({
      rows: [{ current_turn: 'M', assistant_active: false }]
    });
    
    // Call the API endpoint
    const response = await GET();
    const data = await response.json();
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(data).toEqual({ current_turn: 'M', assistant_active: false });
    
    // Verify the query
    expect(query).toHaveBeenCalledWith(`
      SELECT current_turn, assistant_active FROM room_state 
      WHERE room_id = 'main-room'
    `);
  });
  
  it('returns 404 when room is not found', async () => {
    // Mock empty result
    (query as jest.Mock).mockResolvedValueOnce({
      rows: []
    });
    
    // Call the API endpoint
    const response = await GET();
    const data = await response.json();
    
    // Verify the response
    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Room not found' });
  });
  
  it('returns 500 when query fails', async () => {
    // Mock error
    (query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));
    
    // Call the API endpoint
    const response = await GET();
    const data = await response.json();
    
    // Verify the response
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch turn status' });
  });
}); 