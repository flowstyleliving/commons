import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import openai, { ASSISTANT_ID } from '../../../../lib/openai';

export async function POST() {
  try {
    // Reset messages
    await query('DELETE FROM messages');
    
    // Reset room state - importantly, set thread_id to NULL to create a fresh thread
    await query(`
      INSERT INTO room_state (current_turn, assistant_active) 
      VALUES ('M', false) 
      ON CONFLICT (id) 
      DO UPDATE SET current_turn = 'M', assistant_active = false, thread_id = NULL
    `);
    
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