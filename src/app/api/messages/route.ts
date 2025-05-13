import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import openai, { ASSISTANT_ID } from '../../../../lib/openai';

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
      
      let assistantMessage = "";
      
      try {
        // Check if there's an assistant ID configured
        if (!ASSISTANT_ID) {
          throw new Error("No assistant ID configured");
        }
        
        // Create a Thread or retrieve an existing Thread ID from the database
        let threadId;
        const existingThread = await query(`
          SELECT thread_id FROM room_state 
          WHERE room_id = 'main-room'
        `);
        
        if (existingThread.rows.length > 0 && existingThread.rows[0].thread_id) {
          threadId = existingThread.rows[0].thread_id;
        } else {
          // Create a new thread
          const thread = await openai.beta.threads.create();
          threadId = thread.id;
          
          // Save thread ID to database
          await query(`
            UPDATE room_state 
            SET thread_id = $1
            WHERE room_id = 'main-room'
          `, [threadId]);
        }
        
        // Add the new message to the thread
        await openai.beta.threads.messages.create(
          threadId,
          {
            role: "user",
            content: `[${sender}]: ${content}`
          }
        );
        
        // Run the assistant
        const run = await openai.beta.threads.runs.create(
          threadId,
          {
            assistant_id: ASSISTANT_ID,
          }
        );
        
        // Poll for the result
        let runStatus = await openai.beta.threads.runs.retrieve(
          threadId,
          run.id
        );
        
        // Check for run completion (with timeout)
        let attempts = 0;
        while (runStatus.status !== "completed" && attempts < 30) {
          // Wait for 1 second
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check status again
          runStatus = await openai.beta.threads.runs.retrieve(
            threadId,
            run.id
          );
          
          attempts++;
        }
        
        if (runStatus.status !== "completed") {
          throw new Error("Assistant run timed out");
        }
        
        // Get the assistant's messages
        const messages = await openai.beta.threads.messages.list(
          threadId
        );
        
        // Find the latest assistant message
        const latestAssistantMessage = messages.data
          .filter(msg => msg.role === "assistant")
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        
        if (latestAssistantMessage && latestAssistantMessage.content[0].type === 'text') {
          assistantMessage = latestAssistantMessage.content[0].text.value;
        } else {
          throw new Error("No valid assistant message found");
        }
      } catch (aiError) {
        console.error('Error using OpenAI Assistant:', aiError);
        
        // Fallback to regular chat completions
        const formattedMessages = messageHistory.rows.map((msg: any) => {
          if (msg.sender === 'assistant') {
            return {
              role: 'assistant' as const,
              content: msg.content
            };
          } else {
            return {
              role: 'user' as const,
              content: `[${msg.sender}]: ${msg.content}`
            };
          }
        });
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: "You are a helpful AI assistant in a chat between two users, M and E. Be warm, loving and respectful. Keep responses concise but helpful."
            },
            ...formattedMessages
          ],
        });
        
        assistantMessage = completion.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
      }
      
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