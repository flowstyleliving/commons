import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';

// Get active users in the chat
export async function GET() {
  try {
    // Get the most recent message from each sender other than 'assistant'
    const result = await query(`
      SELECT DISTINCT ON (sender) sender, created_at
      FROM messages 
      WHERE room_id = 'main-room' AND sender != 'assistant'
      ORDER BY sender, created_at DESC
    `);
    
    // Get the list of senders (M or E)
    const activeUsers = result.rows.map(row => row.sender);
    
    return NextResponse.json({
      activeUsers,
      // Calculate which user is available (if M is active, E is available and vice versa)
      availableUser: activeUsers.includes('M') && !activeUsers.includes('E') ? 'E' : 
                     activeUsers.includes('E') && !activeUsers.includes('M') ? 'M' : 
                     null // Both or none are active
    });
  } catch (error) {
    console.error('Error fetching active users:', error);
    return NextResponse.json({ error: 'Failed to fetch active users' }, { status: 500 });
  }
} 