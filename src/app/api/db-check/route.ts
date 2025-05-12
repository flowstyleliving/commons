import { NextResponse } from 'next/server';
import pool, { query } from '../../../../lib/db';

export async function GET() {
  try {
    // Check database connection
    const connectionResult = await pool.query('SELECT NOW() as time');
    
    // If we got here, connection is working
    let tablesExist = false;
    let messageCount = 0;
    let roomState = null;
    
    try {
      // Check if messages table exists and has data
      const messagesResult = await query(`
        SELECT COUNT(*) FROM messages
      `);
      messageCount = parseInt(messagesResult.rows[0].count);
      tablesExist = true;
    } catch (tableError) {
      console.error('Error checking messages table:', tableError);
    }
    
    try {
      // Check room state
      const roomResult = await query(`
        SELECT * FROM room_state WHERE room_id = 'main-room'
      `);
      roomState = roomResult.rows[0];
    } catch (roomError) {
      console.error('Error checking room state:', roomError);
    }
    
    // Return diagnostics
    return NextResponse.json({
      status: 'connected',
      connectionTime: connectionResult.rows[0].time,
      databaseUrl: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 20)}...` : 'not set',
      tablesExist,
      messageCount,
      roomState,
      environment: process.env.NODE_ENV
    });
    
  } catch (error: any) {
    console.error('Database connection error:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      databaseUrl: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 20)}...` : 'not set',
      environment: process.env.NODE_ENV
    }, { status: 500 });
  }
} 