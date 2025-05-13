import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import openai, { ASSISTANT_ID } from '../../../../lib/openai';

const PREDEFINED_SETUP_QUESTIONS = [
  "What is the primary issue or topic you are hoping to discuss or resolve today?",
  "Briefly, what is your perspective or feeling about this issue?",
  "What is one specific outcome you would consider a success for this session?",
  "Is there any important background information the other person or the facilitator should know about this issue?",
  "On a scale of 1-10, how open do you feel to exploring different solutions right now?"
];

export async function POST() {
  try {
    // Reset messages
    await query('DELETE FROM messages WHERE room_id = \'main-room\'');
    
    // Reset room state - importantly, set thread_id to NULL and clear structured_state
    await query(`
      UPDATE room_state 
      SET 
        current_turn = \'M\', 
        assistant_active = false, 
        thread_id = NULL, 
        structured_state = \'{}\'::jsonb,
        updated_at = CURRENT_TIMESTAMP
      WHERE room_id = \'main-room\'
    `);
    // If room_state doesn't exist for main-room, this won't do anything, which is fine for a reset.
    // A more robust way would be INSERT ... ON CONFLICT ... DO UPDATE, already implemented in init-db.

    // Clear any existing setup for the room and create a new one
    await query('DELETE FROM conversation_setup WHERE room_id = \'main-room\'');
    await query(`
      INSERT INTO conversation_setup (room_id, questions, status)
      VALUES (\'main-room\', $1, \'awaiting_M\')
    `, [PREDEFINED_SETUP_QUESTIONS]);
    
    // Reset active users
    await query('DELETE FROM active_users');
    
    // Create a new thread and get the first message from the assistant
    try {
      if (!ASSISTANT_ID) {
        throw new Error("No assistant ID configured");
      }
      
      // Create a new thread
      const thread = await openai.beta.threads.create();
      const threadId = thread.id;
      
      // Save thread ID to database
      await query(`
        UPDATE room_state 
        SET thread_id = $1
        WHERE room_id = 'main-room'
      `, [threadId]);
      
      // Run the assistant to get an initial message
      const run = await openai.beta.threads.runs.create(
        threadId,
        { assistant_id: ASSISTANT_ID }
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
      
      // Get the assistant's greeting message
      const messages = await openai.beta.threads.messages.list(threadId);
      
      // Find the latest assistant message
      const assistantMessage = messages.data
        .filter(msg => msg.role === "assistant")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      
      if (assistantMessage && assistantMessage.content[0].type === 'text') {
        // Save the assistant's greeting to the database
        await query(`
          INSERT INTO messages (room_id, sender, content)
          VALUES ('main-room', 'assistant', $1)
        `, [assistantMessage.content[0].text.value]);
      } else {
        // Fallback in case there's no valid message
        await query(`
          INSERT INTO messages (room_id, sender, content)
          VALUES ('main-room', 'assistant', 'Welcome to Komensa Chat!')
        `);
      }
    } catch (aiError) {
      console.error('Error getting initial message from OpenAI Assistant:', aiError);
      
      // Fallback if the assistant fails
      await query(`
        INSERT INTO messages (room_id, sender, content)
        VALUES ('main-room', 'assistant', 'Welcome to Komensa Chat!')
      `);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Chat reset successfully' 
    });
  } catch (error) {
    console.error('Error resetting chat:', error);
    
    // Return mock success response for development when DB is not available
    if (!process.env.DATABASE_URL || process.env.NODE_ENV === 'development') {
      return NextResponse.json({ 
        success: true, 
        message: 'Chat reset successfully (mock response)' 
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to reset chat' },
      { status: 500 }
    );
  }
} 