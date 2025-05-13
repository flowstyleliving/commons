import { Pool } from 'pg';

// Use environment variables for connection details
const DATABASE_URL = process.env.DATABASE_URL;

// Log connection details (without sensitive info)
console.log('Database configuration:', {
  usingConnectionString: Boolean(DATABASE_URL),
  sslConfig: DATABASE_URL ? { rejectUnauthorized: false } : false,
  provider: 'Neon PostgreSQL on Vercel'
});

// Create a connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Query helper function
export async function query(text: string, params?: any[]) {
  try {
    console.log(`Executing database query: ${text.slice(0, 100)}${text.length > 100 ? '...' : ''}`);
    const result = await pool.query(text, params);
    console.log(`Query successful, rows returned: ${result.rowCount || 0}`);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Health check function
export async function checkConnection() {
  try {
    console.log('Checking database connection...');
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0].now);
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