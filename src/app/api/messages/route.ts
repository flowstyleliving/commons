import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get all messages
export async function GET() {
  try {
    const result = await query(`
      SELECT * FROM messages 
      WHERE room_id = 'main-room' 
      ORDER BY created_at ASC
    `);
    
    // Always return an array, even if no results
    return NextResponse.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching messages:', error);
    // Return an empty array instead of error object to avoid client-side parsing issues
    return NextResponse.json([]);
  }
}

// Mock message data - used as fallback when database is unavailable
const MOCK_MESSAGES = [
  {
    id: "1",
    room_id: "main-room",
    sender: "assistant",
    content: "Welcome to Komensa Chat! I'm your AI assistant. M and E can take turns chatting with me. Who would like to start?",
    created_at: new Date().toISOString()
  }
];

// Add a new message
export async function POST(request: NextRequest) {
  try {
    const { sender, content } = await request.json();
    
    if (!sender || !content) {
      return NextResponse.json({ error: 'Sender and content are required' }, { status: 400 });
    }
    
    try {
      // Check if it's the user's turn
      const roomState = await query(`
        SELECT current_turn, assistant_active FROM room_state 
        WHERE room_id = 'main-room'
      `);
      
      if (roomState.rows.length === 0) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }
      
      const { current_turn, assistant_active } = roomState.rows[0];
      
      // Check if it's the user's turn
      if (current_turn !== sender || assistant_active) {
        return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
      }
      
      // Add the message to the database
      const result = await query(`
        INSERT INTO messages (room_id, sender, content)
        VALUES ('main-room', $1, $2)
        RETURNING *
      `, [sender, content]);
      
      // Set AI as active and update turn
      await query(`
        UPDATE room_state 
        SET assistant_active = true 
        WHERE room_id = 'main-room'
      `);
      
      // Get conversation history for the AI
      const messageHistory = await query(`
        SELECT sender, content FROM messages 
        WHERE room_id = 'main-room' 
        ORDER BY created_at ASC
      `);
      
      // Format messages for OpenAI with proper types
      const formattedMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = messageHistory.rows.map((msg: any) => {
        if (msg.sender === 'assistant') {
          return {
            role: 'assistant',
            content: msg.content
          };
        } else {
          return {
            role: 'user',
            content: `[${msg.sender}]: ${msg.content}`
          };
        }
      });
      
      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant in a chat between two users, M and E. Be warm, loving and respectful. Keep responses concise but helpful."
          },
          ...formattedMessages
        ],
      });
      
      const assistantMessage = completion.choices[0].message.content;
      
      // Save the assistant's response
      await query(`
        INSERT INTO messages (room_id, sender, content)
        VALUES ('main-room', 'assistant', $1)
      `, [assistantMessage]);
      
      // Update turn to the other user
      const nextTurn = sender === 'M' ? 'E' : 'M';
      await query(`
        UPDATE room_state 
        SET current_turn = $1, assistant_active = false
        WHERE room_id = 'main-room'
      `, [nextTurn]);
      
      // Get all messages after assistant response
      const allMessages = await query(`
        SELECT * FROM messages 
        WHERE room_id = 'main-room' 
        ORDER BY created_at ASC
      `);
      
      return NextResponse.json({
        messages: allMessages.rows,
        currentTurn: nextTurn
      });
    } catch (dbError) {
      console.error('Database error processing message:', dbError);
      
      // If we can't connect to the database, simulate a response
      // This is just for development - in production you'd want proper error handling
      const mockNextTurn = sender === 'M' ? 'E' : 'M';
      
      return NextResponse.json({
        messages: [
          ...MOCK_MESSAGES,
          {
            id: "user_" + Date.now(),
            room_id: "main-room",
            sender: sender,
            content: content,
            created_at: new Date().toISOString()
          },
          {
            id: "ai_" + Date.now(),
            room_id: "main-room",
            sender: "assistant",
            content: "I'm sorry, but I'm having trouble connecting to the database right now. Please try again later.",
            created_at: new Date().toISOString()
          }
        ],
        currentTurn: mockNextTurn
      });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    return NextResponse.json({ 
      error: 'Failed to process message',
      messages: MOCK_MESSAGES,
      currentTurn: 'M'
    }, { status: 500 });
  }
} 