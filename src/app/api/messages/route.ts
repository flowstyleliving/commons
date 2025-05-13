import { NextRequest, NextResponse } from 'next/server';
import { query } from '@lib/db';
import OpenAI from 'openai';
import openai, { ASSISTANT_ID } from '@lib/openai';

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

// Define the structure for the state (can be refined)
interface StructuredState {
  current_issues: string[];
  points_of_contention: { [key: string]: string };
  partner_perspectives: {
    [key in 'M' | 'E']: {
      feels: string[];
      needs: string[];
      views: { [key: string]: string }; // e.g., views_chores_as: "unfair"
    }
  };
  agreements_reached: Array<{ issue: string; agreement: string }>;
  goals_for_session: string[];
  summary_of_session_progress: string;
}

// Default empty state
const defaultStructuredState: StructuredState = {
  current_issues: [],
  points_of_contention: {},
  partner_perspectives: {
    M: { feels: [], needs: [], views: {} },
    E: { feels: [], needs: [], views: {} }
  },
  agreements_reached: [],
  goals_for_session: [],
  summary_of_session_progress: ""
};

// Function to format the state for the prompt
function formatStateForPrompt(state: StructuredState | null | undefined): string {
  // If state is completely null/undefined, use a completely fresh defaultStructuredState
  if (!state) {
    return `<Current State>
Current Issues: 
Points of Contention: {}
M's Perspective: Feels: ; Needs: ; Views: {}
E's Perspective: Feels: ; Needs: ; Views: {}
Agreements Reached: []
Goals: 
Summary: Just started.
</Current State>`;
  }

  try {
    // Create safe getters that handle null/undefined at every level
    const safeGet = (obj: any, ...path: string[]) => {
      let current = obj;
      for (const key of path) {
        if (current === null || current === undefined) return undefined;
        current = current[key];
      }
      return current;
    };

    const safeJoin = (arr: any[] | null | undefined) => {
      if (!arr || !Array.isArray(arr)) return '';
      return arr.join(', ');
    };

    const safeStringify = (obj: any | null | undefined) => {
      if (!obj) return '{}';
      try {
        return JSON.stringify(obj);
      } catch (e) {
        return '{}';
      }
    };

    // Safely get values with fallbacks
    const issues = safeGet(state, 'current_issues') || [];
    const contention = safeGet(state, 'points_of_contention') || {};
    
    // M's perspective with fallbacks
    const mFeels = safeGet(state, 'partner_perspectives', 'M', 'feels') || [];
    const mNeeds = safeGet(state, 'partner_perspectives', 'M', 'needs') || [];
    const mViews = safeGet(state, 'partner_perspectives', 'M', 'views') || {};
    
    // E's perspective with fallbacks
    const eFeels = safeGet(state, 'partner_perspectives', 'E', 'feels') || [];
    const eNeeds = safeGet(state, 'partner_perspectives', 'E', 'needs') || [];
    const eViews = safeGet(state, 'partner_perspectives', 'E', 'views') || {};
    
    const agreements = safeGet(state, 'agreements_reached') || [];
    const goals = safeGet(state, 'goals_for_session') || [];
    const summary = safeGet(state, 'summary_of_session_progress') || 'Just started.';

    // Build the string safely
    return `<Current State>
Current Issues: ${safeJoin(issues)}
Points of Contention: ${safeStringify(contention)}
M's Perspective: Feels: ${safeJoin(mFeels)}; Needs: ${safeJoin(mNeeds)}; Views: ${safeStringify(mViews)}
E's Perspective: Feels: ${safeJoin(eFeels)}; Needs: ${safeJoin(eNeeds)}; Views: ${safeStringify(eViews)}
Agreements Reached: ${safeStringify(agreements)}
Goals: ${safeJoin(goals)}
Summary: ${summary}
</Current State>`;
  } catch (error) {
    console.error("Error formatting state for prompt:", error);
    // Return a minimal valid state if anything goes wrong
    return `<Current State>
Current Issues: 
Points of Contention: {}
M's Perspective: Feels: ; Needs: ; Views: {}
E's Perspective: Feels: ; Needs: ; Views: {}
Agreements Reached: []
Goals: 
Summary: Just started.
</Current State>`;
  }
}

// Function to parse state update JSON from AI response
function parseStateUpdate(responseText: string): Partial<StructuredState> | null {
  try {
    // Handle null/undefined response text
    if (!responseText) {
      console.warn("Empty response text passed to parseStateUpdate");
      return null;
    }
    
    const marker = 'STATE_UPDATE_JSON:';
    const jsonStart = responseText.lastIndexOf(marker);
    
    if (jsonStart === -1) {
      return null;
    }
    
    // Extract JSON string, handling potential issues
    const jsonString = responseText.substring(jsonStart + marker.length).trim();
    
    if (!jsonString || jsonString.length < 2) {
      console.warn("Empty or too short JSON string found after marker:", jsonString);
      return null;
    }
    
    // Basic validation: Check for opening and closing braces
    if (!jsonString.startsWith('{') || !jsonString.endsWith('}')) {
      console.warn("Potential malformed JSON for state update:", jsonString);
      return null;
    }
    
    try {
      const parsed = JSON.parse(jsonString);
      
      // Validate that it's an object
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        console.warn("Parsed JSON is not a valid object:", parsed);
        return null;
      }
      
      // Validate core structure minimally
      if (parsed.partner_perspectives) {
        // Ensure M and E exist if partner_perspectives exists
        parsed.partner_perspectives.M = parsed.partner_perspectives.M || { feels: [], needs: [], views: {} };
        parsed.partner_perspectives.E = parsed.partner_perspectives.E || { feels: [], needs: [], views: {} };
      }
      
      // Add more validation based on StructuredState interface if needed
      return parsed as Partial<StructuredState>;
    } catch (error) {
      console.error("Error parsing state update JSON:", error, "\nJSON String:", jsonString);
      return null;
    }
  } catch (error) {
    console.error("Unexpected error in parseStateUpdate:", error);
    return null;
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
      // Fetch room state including the new structured_state
      const roomStateResult = await query(`
        SELECT current_turn, assistant_active, thread_id, structured_state 
        FROM room_state 
        WHERE room_id = 'main-room'
      `);
      
      if (roomStateResult.rows.length === 0) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }
      
      const { current_turn, assistant_active, thread_id: currentThreadId, structured_state: currentStructuredState } = roomStateResult.rows[0];
      
      // Check if it's the user's turn
      if (current_turn !== sender || assistant_active) {
        return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
      }
      
      // Add the user's message to the database
      const result = await query(`
        INSERT INTO messages (room_id, sender, content)
        VALUES ('main-room', $1, $2)
        RETURNING *
      `, [sender, content]);
      
      // Set AI as active (will be unset after response)
      await query(`
        UPDATE room_state 
        SET assistant_active = true, updated_at = CURRENT_TIMESTAMP 
        WHERE room_id = 'main-room'
      `);
      
      // --- State Injection & AI Call ---
      const statePrompt = formatStateForPrompt(currentStructuredState);
      const stateUpdateInstruction = `
IMPORTANT: After your conversational response, you MUST output the updated structured state JSON for the conversation, enclosed within a marker. Use the exact format:
STATE_UPDATE_JSON:
{ "current_issues": [...], "points_of_contention": {...}, "partner_perspectives": {...}, "agreements_reached": [...], "goals_for_session": [...], "summary_of_session_progress": "..." }
Update the JSON based ONLY on the latest user message and the provided context. Ensure the JSON is valid.`;
      
      let assistantResponseText = "";
      let threadId = currentThreadId; // Use existing thread ID if available
      let newStructuredState: Partial<StructuredState> | null = null;
      
      // Add a 1.5 second delay BEFORE calling the AI
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      try {
        if (!ASSISTANT_ID) throw new Error("No assistant ID configured");
        
        // Get or create thread
        if (!threadId) {
          const thread = await openai.beta.threads.create();
          threadId = thread.id;
          await query(`
            UPDATE room_state SET thread_id = $1 WHERE room_id = 'main-room'
          `, [threadId]);
        }
        
        // **Inject state into user message for Assistant API**
        const messageContentWithState = `${statePrompt}\n\n[${sender}]: ${content}`;
        
        await openai.beta.threads.messages.create(threadId, {
          role: "user",
          content: messageContentWithState
        });
        
        // Run the assistant with state update instructions
        const run = await openai.beta.threads.runs.create(threadId, {
          assistant_id: ASSISTANT_ID,
          // Add instructions here if overriding Assistant's default instructions
          // instructions: `Your original instructions... ${stateUpdateInstruction}` // Example override
        });
        
        // Poll for completion... (keep existing polling logic)
        let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
        let attempts = 0;
        while (["queued", "in_progress", "cancelling"].includes(runStatus.status) && attempts < 30) {
           await new Promise(resolve => setTimeout(resolve, 1000));
           runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
           attempts++;
        }
        
        if (runStatus.status !== "completed") {
           // Handle run failure (timeout, error, etc.)
           console.error("Assistant run failed or timed out:", runStatus);
           // Potentially try the fallback WITHOUT state update logic? Or just error out.
           // For now, let's proceed to the fallback if the run didn't complete successfully.
           throw new Error(`Assistant run did not complete. Status: ${runStatus.status}`);
        }
        
        // Get messages AFTER successful run
        const messages = await openai.beta.threads.messages.list(threadId, { order: 'desc', limit: 1 }); // Get only the latest message
        
        if (messages.data.length > 0 && messages.data[0].role === 'assistant' && messages.data[0].content[0].type === 'text') {
          const fullResponse = messages.data[0].content[0].text.value;
          
          // Parse state update
          newStructuredState = parseStateUpdate(fullResponse);
          
          // Extract the conversational part (everything before the marker)
          const markerIndex = fullResponse.lastIndexOf('STATE_UPDATE_JSON:');
          assistantResponseText = markerIndex !== -1 ? fullResponse.substring(0, markerIndex).trim() : fullResponse.trim();
          
        } else {
           // This case should ideally not happen if the run completed
           console.error("No valid assistant message found after completed run.");
           assistantResponseText = "I seem to have encountered an issue generating a response.";
           // Potentially throw to trigger fallback?
        }
        
      } catch (aiError) {
        console.error('Error using OpenAI Assistant (or run failed):', aiError);
        
        // --- Fallback to Chat Completions ---
        const messageHistory = await query(`
            SELECT sender, content FROM messages 
            WHERE room_id = 'main-room' ORDER BY created_at ASC
        `);
        
        const formattedMessages = messageHistory.rows.map((msg: any) => ({
          role: msg.sender === 'assistant' ? 'assistant' as const : 'user' as const,
          content: msg.sender === 'assistant' ? msg.content : `[${msg.sender}]: ${msg.content}`
        }));
        
        // **Inject state as system message for Chat Completions**
        const completion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: statePrompt }, // Inject state here
            { role: "system", content: stateUpdateInstruction }, // Also instruct fallback model
            ...formattedMessages
            // Note: The last user message is already in formattedMessages from DB query
          ],
        });
        
        const fullResponse = completion.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
        
        // Parse state update from fallback response
        newStructuredState = parseStateUpdate(fullResponse);
        
        // Extract conversational part from fallback response
        const markerIndex = fullResponse.lastIndexOf('STATE_UPDATE_JSON:');
        assistantResponseText = markerIndex !== -1 ? fullResponse.substring(0, markerIndex).trim() : fullResponse.trim();
      }
      
      // --- Save Assistant Response and Update State ---
      
      // Ensure we have some text to save
      if (!assistantResponseText) {
          assistantResponseText = "Sorry, I encountered an error processing that.";
      }
      
      // Save the conversational part of the assistant's response
      await query(`
        INSERT INTO messages (room_id, sender, content)
        VALUES ('main-room', 'assistant', $1)
      `, [assistantResponseText]);
      
      // **Update structured state in DB if parsed successfully**
      let finalStructuredState = currentStructuredState || defaultStructuredState; // Start with current or default
      if (newStructuredState) {
          // Merge the partial update into the current state
          // This is a shallow merge; deeper merge might be needed depending on structure
          finalStructuredState = { ...finalStructuredState, ...newStructuredState };
          console.log("Saving updated structured state:", finalStructuredState); // Log state being saved
      } else {
          console.log("No valid state update parsed from AI response.");
      }
      
      // Update turn and state, unset assistant_active
      const nextTurn = sender === 'M' ? 'E' : 'M';
      await query(`
        UPDATE room_state 
        SET current_turn = $1, 
            assistant_active = false, 
            structured_state = $2::jsonb,
            updated_at = CURRENT_TIMESTAMP
        WHERE room_id = 'main-room'
      `, [nextTurn, JSON.stringify(finalStructuredState)]); // Stringify the final state object
      
      // Get all messages for the response
      const allMessages = await query(`
        SELECT * FROM messages 
        WHERE room_id = 'main-room' ORDER BY created_at ASC
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