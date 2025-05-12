import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
if (!process.env.DATABASE_URL) {
  dotenv.config(); // Try default .env as fallback
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not defined. Please set it in your .env.local file.');
  process.exit(1);
}

console.log('🔍 Checking database connection...');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

const checkDatabase = async () => {
  try {
    // Check database connection
    const connectionResult = await pool.query('SELECT NOW() as time');
    console.log('✅ Connected to database');
    console.log(`   Server time: ${connectionResult.rows[0].time}`);
    console.log(`   Connection string: ${DATABASE_URL.substring(0, 20)}...`);
    
    // Check if tables exist
    console.log('\n📋 Checking database tables...');
    
    try {
      // Check messages table
      const messagesResult = await pool.query(`
        SELECT COUNT(*) FROM messages
      `);
      console.log(`✅ Messages table exists with ${messagesResult.rows[0].count} records`);
      
      // Show sample messages
      if (parseInt(messagesResult.rows[0].count) > 0) {
        const sampleMessages = await pool.query(`
          SELECT * FROM messages ORDER BY created_at DESC LIMIT 3
        `);
        
        console.log('\n📝 Recent messages:');
        sampleMessages.rows.forEach(message => {
          console.log(`   [${message.sender}]: ${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`);
          console.log(`   Time: ${message.created_at}`);
          console.log('   ---');
        });
      }
      
    } catch (error: any) {
      console.error('❌ Error checking messages table:', error.message);
      console.log('💡 You may need to initialize the database with: npm run init-db');
    }
    
    try {
      // Check room_state table
      const roomResult = await pool.query(`
        SELECT * FROM room_state
      `);
      
      const rowCount = roomResult.rowCount || 0;
      console.log(`✅ Room state table exists with ${rowCount} records`);
      
      if (rowCount > 0) {
        console.log('\n🏠 Room states:');
        roomResult.rows.forEach(room => {
          console.log(`   Room ID: ${room.room_id}`);
          console.log(`   Current turn: ${room.current_turn}`);
          console.log(`   Assistant active: ${room.assistant_active ? 'yes' : 'no'}`);
          console.log(`   Created: ${room.created_at}`);
          console.log('   ---');
        });
      }
      
    } catch (error: any) {
      console.error('❌ Error checking room_state table:', error.message);
      console.log('💡 You may need to initialize the database with: npm run init-db');
    }
    
  } catch (error: any) {
    console.error('❌ Error connecting to database:', error.message);
    
    // Provide additional guidance based on error type
    if (error.code === 'ENOTFOUND') {
      console.error('💡 Possible causes:');
      console.error('   - Database hostname is incorrect');
      console.error('   - Network connectivity issues');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Possible causes:');
      console.error('   - Database server is not running');
      console.error('   - Firewall is blocking the connection');
    } else if (error.code === '28P01') {
      console.error('💡 Authentication failed: Check your username and password');
    } else if (error.code === '3D000') {
      console.error('💡 Database does not exist: Check your database name');
    }
    
    console.error('\n🔧 Troubleshooting steps:');
    console.error('1. Verify your DATABASE_URL in .env.local is correct');
    console.error('2. Make sure your Neon PostgreSQL database is active');
    console.error('3. Check that SSL is enabled in your connection string (?sslmode=require)');
    console.error('4. Try the Neon web console to verify your database is accessible');
    
    process.exit(1);
  } finally {
    await pool.end();
  }
};

checkDatabase(); 