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

console.log('🔌 Connecting to database...');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

const createTables = async () => {
  try {
    // Create messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(50) NOT NULL,
        sender VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Messages table created or already exists');
    
    // Create room_state table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS room_state (
        room_id VARCHAR(50) PRIMARY KEY,
        current_turn VARCHAR(1) NOT NULL,
        assistant_active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Room state table created or already exists');
    
    // Check if room_state has the main room
    const roomExists = await pool.query(`
      SELECT COUNT(*) FROM room_state WHERE room_id = 'main-room'
    `);
    
    // Insert main room if it doesn't exist with random first turn (M or E)
    if (parseInt(roomExists.rows[0].count) === 0) {
      // Randomly choose M or E for first turn
      const firstTurn = Math.random() < 0.5 ? 'M' : 'E';
      
      await pool.query(`
        INSERT INTO room_state (room_id, current_turn, assistant_active)
        VALUES ('main-room', $1, false)
      `, [firstTurn]);
      
      // Add welcome message from assistant
      await pool.query(`
        INSERT INTO messages (room_id, sender, content)
        VALUES ('main-room', 'assistant', 'Welcome to Komensa Chat! I''m your AI assistant. M and E can take turns chatting with me. Who would like to start?')
      `);
      
      console.log(`✅ Main room created with ${firstTurn} going first`);
    } else {
      console.log('ℹ️ Main room already exists');
    }
    
    // Get current state of the database
    const messagesCount = await pool.query(`SELECT COUNT(*) FROM messages`);
    const roomState = await pool.query(`SELECT * FROM room_state WHERE room_id = 'main-room'`);
    
    console.log('📊 Database Status:');
    console.log(`   Messages count: ${messagesCount.rows[0].count}`);
    console.log(`   Current turn: ${roomState.rows[0]?.current_turn || 'unknown'}`);
    console.log(`   Assistant active: ${roomState.rows[0]?.assistant_active ? 'yes' : 'no'}`);
    
    console.log('\n🎉 Database initialization complete!');
    console.log('🚀 You can now run "npm run dev" to start the application');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

createTables(); 