import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';

// Get current turn
export async function GET() {
  try {
    const result = await query(`
      SELECT current_turn, assistant_active FROM room_state 
      WHERE room_id = 'main-room'
    `);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching turn status:', error);
    return NextResponse.json({ error: 'Failed to fetch turn status' }, { status: 500 });
  }
} 