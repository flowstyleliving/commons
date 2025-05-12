import { Pool } from 'pg';

// Create a connection pool with appropriate configuration
const createPool = () => {
  // Check if DATABASE_URL is available
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ DATABASE_URL not found, database features will not work');
    // Return a mock pool for development
    return {
      query: async () => {
        return { rows: [], rowCount: 0 };
      },
      end: async () => {}
    } as unknown as Pool;
  }

  try {
    // Create actual pool when DATABASE_URL is available
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? 
        { rejectUnauthorized: false } : 
        process.env.DATABASE_URL.includes('sslmode=require')
    });
  } catch (error) {
    console.error('Error creating database pool:', error);
    // Return a mock pool on error
    return {
      query: async () => {
        return { rows: [], rowCount: 0 };
      },
      end: async () => {}
    } as unknown as Pool;
  }
};

// Create the pool
const pool = createPool();

// Helper function to run queries with error handling
export async function query(text: string, params?: any[]) {
  try {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error:', error);
    // Return a mock result to prevent app crashes
    return { rows: [], rowCount: 0 };
  }
}

export default pool; 