import { Pool } from 'pg';

// Use environment variables for connection details
const DATABASE_URL = process.env.DATABASE_URL;

// Create a connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Query helper function
export async function query(text: string, params?: any[]) {
  try {
    return await pool.query(text, params);
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Health check function
export async function checkConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    return { 
      status: 'connected', 
      timestamp: result.rows[0].now 
    };
  } catch (error) {
    console.error('Database connection error:', error);
    return { 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export default pool; 