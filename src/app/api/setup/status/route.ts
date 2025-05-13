import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
// import { auth } from '@clerk/nextjs/server'; // Assuming Clerk - REMOVED FOR NOW

const DEFAULT_QUESTIONS = [
  "What is the primary issue or topic you are hoping to discuss or resolve today?",
  "Briefly, what is your perspective or feeling about this issue?",
  "What is one specific outcome you would consider a success for this session?",
  "Is there any important background information the other person or the facilitator should know about this issue?",
  "On a scale of 1-10, how open do you feel to exploring different solutions right now?"
];

export async function GET(request: NextRequest) {
  // TODO: Add proper authentication/session management to securely identify user M or E.
  // Relying on query parameters alone is insecure.
  const searchParams = request.nextUrl.searchParams;
  const requestingUser = searchParams.get('user') as 'M' | 'E'; 

  if (!requestingUser || !['M', 'E'].includes(requestingUser)) {
    return NextResponse.json({ error: 'Valid user (M or E) must be specified' }, { status: 400 });
  }

  try {
    const result = await query(`
      SELECT setup_id, questions, answers, status, summary 
      FROM conversation_setup
      WHERE room_id = 'main-room'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      // No setup found, let's create a new one
      try {
        const insertResult = await query(`
          INSERT INTO conversation_setup (room_id, questions, status)
          VALUES ('main-room', $1, 'awaiting_M')
          RETURNING setup_id
        `, [DEFAULT_QUESTIONS]);
        
        // Return the default setup data
        return NextResponse.json({
          status: 'awaiting_M',
          questions: DEFAULT_QUESTIONS,
          userAnswers: null
        });
      } catch (insertError) {
        console.error('Error creating new setup:', insertError);
        
        // Even if DB insert fails, return default questions so UI works
        return NextResponse.json({
          status: 'awaiting_M',
          questions: DEFAULT_QUESTIONS,
          userAnswers: null
        });
      }
    }

    const setup = result.rows[0];
    const userAnswers = setup.answers?.[requestingUser] || null;

    return NextResponse.json({
      status: setup.status,
      questions: setup.questions || DEFAULT_QUESTIONS, // Fallback to default questions if null
      userAnswers: userAnswers, // Send back only the current user's answers if they exist
      summary: setup.summary // Include summary if generation is complete
    });

  } catch (error) {
    console.error('Error fetching setup status:', error);
    
    // Return default questions even if there's a database error
    return NextResponse.json({
      status: 'awaiting_M',
      questions: DEFAULT_QUESTIONS,
      userAnswers: null
    });
  }
} 