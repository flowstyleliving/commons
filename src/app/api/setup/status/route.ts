import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
// import { auth } from '@clerk/nextjs/server'; // Assuming Clerk - REMOVED FOR NOW

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
      // No setup found, maybe initiate one or indicate an issue?
      // For now, let's signal that setup is needed.
      return NextResponse.json({ status: 'not_started' }); 
    }

    const setup = result.rows[0];
    const userAnswers = setup.answers?.[requestingUser] || null;

    return NextResponse.json({
      status: setup.status,
      questions: setup.questions,
      userAnswers: userAnswers, // Send back only the current user's answers if they exist
      summary: setup.summary // Include summary if generation is complete
    });

  } catch (error) {
    console.error('Error fetching setup status:', error);
    return NextResponse.json({ error: 'Failed to fetch setup status' }, { status: 500 });
  }
} 