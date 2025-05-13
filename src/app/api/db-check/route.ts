import { NextResponse } from 'next/server';
import { checkConnection } from '../../../../lib/db';

export async function GET() {
  try {
    // Check if environment variables are properly set
    const databaseUrl = process.env.DATABASE_URL;
    
    // Check database connection
    const connectionStatus = await checkConnection();
    
    // Build response with sanitized info
    return NextResponse.json({
      status: connectionStatus.status,
      timestamp: connectionStatus.status === 'connected' ? connectionStatus.timestamp : null,
      error: connectionStatus.status === 'error' ? connectionStatus.message : null,
      config: {
        // Only return sanitized config info
        databaseConfigured: Boolean(databaseUrl),
        databaseProvider: 'Neon PostgreSQL',
        isDeployedEnvironment: process.env.VERCEL_ENV ? true : false,
        environment: process.env.VERCEL_ENV || 'development',
        nodeEnv: process.env.NODE_ENV,
      }
    });
  } catch (error) {
    console.error('Error in db-check endpoint:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      config: {
        databaseConfigured: Boolean(process.env.DATABASE_URL),
        environment: process.env.VERCEL_ENV || 'development',
        nodeEnv: process.env.NODE_ENV,
      }
    }, { status: 500 });
  }
} 