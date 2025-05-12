import { promises as fs } from 'fs';
import path from 'path';
import pool from '../lib/db';

async function initDb() {
  try {
    console.log('Initializing database...');
    
    // Read the schema.sql file
    const schemaFile = path.resolve('./lib/schema.sql');
    const schema = await fs.readFile(schemaFile, 'utf-8');
    
    // Execute the schema SQL
    await pool.query(schema);
    console.log('Schema created successfully');

    // Check if the room already exists
    const roomCheck = await pool.query(`
      SELECT * FROM room_state WHERE room_id = 'main-room'
    `);

    if (roomCheck.rowCount === 0) {
      // Determine first turn with coin flip
      const firstTurn = Math.random() < 0.5 ? 'M' : 'E';
      
      // Create the main room
      await pool.query(`
        INSERT INTO room_state (room_id, current_turn)
        VALUES ('main-room', $1)
      `, [firstTurn]);
      
      console.log(`Room created with ${firstTurn} going first`);
    } else {
      console.log('Room already exists');
    }
    
    console.log('Database initialization complete');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await pool.end();
  }
}

initDb(); 