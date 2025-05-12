'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Loading fallback component
function HomeLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      <div className="p-8 rounded-xl bg-white/80 shadow-md backdrop-blur-sm">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-amber-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg font-medium text-amber-800">Loading Komensa...</span>
        </div>
      </div>
    </div>
  );
}

// Main component
function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedUser, setSelectedUser] = useState<'M' | 'E'>('M');
  const [availableUsers, setAvailableUsers] = useState<{M: boolean, E: boolean}>({M: true, E: true});
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const error = searchParams.get('error');

  // Fetch active users to determine availability
  useEffect(() => {
    const fetchActiveUsers = async () => {
      setLoading(true);
      try {
        // Try to initialize database if needed
        try {
          await fetch('/api/init-db');
        } catch (initError) {
          console.error('Error initializing database:', initError);
          // Continue anyway - this isn't critical
        }

        const response = await fetch('/api/users');
        
        if (!response.ok) {
          if (response.status === 500) {
            // Check if this might be a database error
            try {
              const dbCheckRes = await fetch('/api/db-check');
              const dbCheckData = await dbCheckRes.json();
              
              if (dbCheckData.status === 'error') {
                setDbError('Database connection issue. Please check your connection string.');
                console.error('Database error details:', dbCheckData);
              }
            } catch (dbCheckError) {
              console.error('Error checking database status:', dbCheckError);
              setDbError('Could not connect to the database. Please check your configuration.');
            }
          }
          
          setAvailableUsers({M: true, E: true});
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        
        if (data.activeUsers) {
          const activeUsers = data.activeUsers;
          setAvailableUsers({
            M: !activeUsers.includes('M'),
            E: !activeUsers.includes('E')
          });
          
          // If suggested user is available, select it
          if (data.availableUser && (data.availableUser === 'M' || data.availableUser === 'E')) {
            setSelectedUser(data.availableUser);
          } else if (!availableUsers.M && availableUsers.E) {
            // If M is taken but E is available, select E
            setSelectedUser('E');
          } else if (!availableUsers.E && availableUsers.M) {
            // If E is taken but M is available, select M
            setSelectedUser('M');
          }
        }
        
        setDbError(null);
      } catch (error) {
        console.error('Error fetching active users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveUsers();
    
    // Periodically check for active users
    const interval = setInterval(fetchActiveUsers, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Handle join button click
  const handleJoin = () => {
    router.push(`/chat?user=${selectedUser}`);
  };
  
  // JSX for database error UI
  const renderDbErrorUI = () => (
    <div className="flex flex-col items-center justify-center bg-amber-50 p-8 rounded-xl shadow-lg max-w-md w-full border border-amber-200 relative z-10">
      <div className="text-rose-600 text-4xl mb-4">⚠️</div>
      <h1 className="text-2xl font-bold text-amber-800 mb-4">Database Connection Error</h1>
      <p className="text-amber-700 mb-6">{dbError || 'Could not connect to the database. Please check your configuration.'}</p>
      
      <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mb-6 w-full">
        <p className="text-sm text-amber-800 font-medium mb-2">Development Options:</p>
        <ol className="list-decimal list-inside text-sm text-amber-700 space-y-1">
          <li>Continue without a database - the app has fallbacks for development</li>
          <li>Set up a local Postgres database</li>
          <li>Sign up for a free Neon PostgreSQL database</li>
        </ol>
      </div>
      
      <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mb-6 w-full">
        <p className="text-sm text-amber-800 font-medium mb-2">Troubleshooting Steps:</p>
        <ol className="list-decimal list-inside text-sm text-amber-700 space-y-1">
          <li>Check your <code className="bg-amber-100 px-1 rounded">.env.local</code> file has a valid <code className="bg-amber-100 px-1 rounded">DATABASE_URL</code></li>
          <li>Run <code className="bg-amber-100 px-1 rounded">npm run check-db</code> to diagnose issues</li>
          <li>Run <code className="bg-amber-100 px-1 rounded">npm run init-db</code> to initialize your database</li>
        </ol>
      </div>
      
      <div className="flex gap-3 w-full">
        <button 
          onClick={() => window.location.reload()} 
          className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white py-3 px-4 rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all shadow-sm"
        >
          Retry Connection
        </button>
        
        <button 
          onClick={() => setDbError(null)} 
          className="flex-1 bg-white text-amber-700 border border-amber-300 py-3 px-4 rounded-lg hover:bg-amber-50 transition-all shadow-sm"
        >
          Continue Anyway
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 relative">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-amber-200/20 to-amber-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-24 w-80 h-80 bg-gradient-to-br from-rose-300/20 to-rose-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-amber-300/20 to-orange-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-gradient-to-tl from-orange-200/20 to-amber-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-6xl mx-auto">
          <div className="h-full w-full bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.05)_0%,transparent_70%)]"></div>
        </div>
      </div>
      
      <header className="bg-gradient-to-r from-amber-500 to-amber-600 shadow-md p-4 text-white relative z-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold">Komensa</h1>
          <p className="text-amber-100 mt-1">AI-powered conversations between M and E</p>
        </div>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="max-w-md w-full">
          {dbError ? (
            renderDbErrorUI()
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-amber-100">
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white">
                <h2 className="text-2xl font-bold">Welcome to Komensa</h2>
                <p className="text-amber-100 mt-2">
                  Join the conversation with our AI assistant.
                </p>
              </div>
              
              <div className="p-6">
                {error === 'user_taken' && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-6 text-rose-700 text-sm">
                    The selected user is already active in the chat. Please choose another user.
                  </div>
                )}
                
                <div className="mb-6">
                  <label htmlFor="user" className="block text-amber-800 font-medium mb-2">
                    Choose Your Identity
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedUser('M')}
                      disabled={!availableUsers.M && loading === false}
                      className={`flex-1 py-4 rounded-lg border-2 transition-all ${
                        selectedUser === 'M'
                          ? 'bg-amber-50 border-amber-500 text-amber-800'
                          : 'border-gray-200 text-gray-700'
                      } ${
                        !availableUsers.M && loading === false
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:border-amber-300'
                      }`}
                    >
                      <span className="text-3xl block mb-1">M</span>
                      {!availableUsers.M && loading === false && (
                        <span className="text-xs text-rose-600">Already active</span>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setSelectedUser('E')}
                      disabled={!availableUsers.E && loading === false}
                      className={`flex-1 py-4 rounded-lg border-2 transition-all ${
                        selectedUser === 'E'
                          ? 'bg-rose-50 border-rose-500 text-rose-800'
                          : 'border-gray-200 text-gray-700'
                      } ${
                        !availableUsers.E && loading === false
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:border-rose-300'
                      }`}
                    >
                      <span className="text-3xl block mb-1">E</span>
                      {!availableUsers.E && loading === false && (
                        <span className="text-xs text-rose-600">Already active</span>
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-amber-800 font-medium mb-2">How it Works:</h3>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      M and E take turns chatting with the AI assistant
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      The AI responds after each message
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Chat history is saved for everyone to see
                    </li>
                  </ul>
                </div>
                
                <button
                  onClick={handleJoin}
                  disabled={loading || (!availableUsers.M && !availableUsers.E) || (selectedUser === 'M' && !availableUsers.M) || (selectedUser === 'E' && !availableUsers.E)}
                  className={`w-full py-3 px-4 rounded-lg text-white shadow-sm transition-all ${
                    loading || (!availableUsers.M && !availableUsers.E) || (selectedUser === 'M' && !availableUsers.M) || (selectedUser === 'E' && !availableUsers.E)
                      ? 'bg-gray-300 cursor-not-allowed'
                      : selectedUser === 'M'
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
                        : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </span>
                  ) : (!availableUsers.M && !availableUsers.E) ? (
                    'Both users are currently active'
                  ) : (
                    `Join as ${selectedUser}`
                  )}
                </button>
              </div>
              
              <div className="bg-amber-50/50 backdrop-blur-sm px-6 py-4 border-t border-amber-100">
                <p className="text-xs text-gray-500 text-center">
                  Powered by Vercel and Neon PostgreSQL
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Export with Suspense
export default function Home() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <HomePage />
    </Suspense>
  );
}
