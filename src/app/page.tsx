'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SetupQuestions from '../components/SetupQuestions';

// Define SetupData interface (can be moved to a types file)
interface UserAnswers {
  [questionKey: string]: string;
}

interface SetupData {
  status: string;
  questions: string[];
  userAnswers: UserAnswers | null;
  summary?: string | null;
}

// Loading fallback component
function HomeLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 via-rose-50 to-stone-100">
      <div className="p-8 rounded-xl bg-white/80 shadow-md backdrop-blur-sm">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-teal-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg font-medium text-stone-800">Loading Chat...</span>
        </div>
      </div>
    </div>
  );
}

// Main component
function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedUser, setSelectedUser] = useState<'M' | 'E'>('E');
  const [availableUsers, setAvailableUsers] = useState<{M: boolean, E: boolean}>({M: true, E: true});
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const error = searchParams.get('error');
  const [isResetting, setIsResetting] = useState(false);

  // State for setup process
  const [setupState, setSetupState] = useState<SetupData | null>(null);
  const [setupLoading, setSetupLoading] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Fetch active users and setup status
  useEffect(() => {
    let isMounted = true; // Prevent state updates on unmounted component
    setLoading(true);
    setSetupLoading(true);

    const fetchInitialData = async () => {
      try {
        // Try to initialize database if needed
        try {
          await fetch('/api/init-db');
        } catch (initError) {
          console.warn('Non-critical error initializing database:', initError);
        }

        // Fetch active users
        let fetchedAvailableUsers = {M: true, E: true};
        let initiallySelectedUser: 'M' | 'E' = 'E'; // Default
        try {
            const usersResponse = await fetch('/api/users');
            if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                if (usersData.activeUsers) {
                  fetchedAvailableUsers = {
                    M: !usersData.activeUsers.includes('M'),
                    E: !usersData.activeUsers.includes('E'),
                  };
                  // Basic logic to select an available user
                  if (usersData.availableUser && (usersData.availableUser === 'M' || usersData.availableUser === 'E')) {
                    initiallySelectedUser = usersData.availableUser;
                  } else if (!fetchedAvailableUsers.M && fetchedAvailableUsers.E) {
                    initiallySelectedUser = 'E';
                  } else if (!fetchedAvailableUsers.E && fetchedAvailableUsers.M) {
                    initiallySelectedUser = 'M';
                  } // else default to 'E' or keep existing state
                } 
            } else {
                console.warn('Failed to fetch active users, assuming all available.')
            }
        } catch (userFetchError) {
            console.error('Error fetching active users:', userFetchError);
        }
        
        if (isMounted) {
            setAvailableUsers(fetchedAvailableUsers);
            setSelectedUser(initiallySelectedUser); // Set user before checking setup status
            setLoading(false); // User selection loading complete
        }

        // Fetch setup status (using the determined user)
        try {
          // Use the most likely available user for the status check
          const userForStatusCheck = initiallySelectedUser;
          const setupResponse = await fetch(`/api/setup/status?user=${userForStatusCheck}`);
          if (!setupResponse.ok) {
            const errorData = await setupResponse.json();
            throw new Error(errorData.error || `Failed to fetch setup status (${setupResponse.status})`);
          }
          const setupData = await setupResponse.json();
          if (isMounted) {
            setSetupState(setupData);
            setSetupError(null);
          }
        } catch (setupFetchError: any) {
          console.error('Error fetching setup status:', setupFetchError);
          if (isMounted) {
            setSetupError(setupFetchError.message || 'Could not load setup information.');
            setSetupState(null); // Ensure setup state is cleared on error
          }
        }

      } catch (error) {
        console.error('General error during initial data fetch:', error);
        // Handle general errors if necessary, maybe setDbError
      } finally {
        if (isMounted) {
          setLoading(false); // Combined loading state
          setSetupLoading(false);
        }
      }
    };

    fetchInitialData();
    
    // Optional: Add polling for setup status if needed, especially after submission
    // const setupInterval = setInterval(fetchInitialData, 10000); // e.g., every 10 seconds

    return () => {
      isMounted = false;
      // clearInterval(setupInterval);
    };
  }, []); // Run once on mount

  const refreshSetupStatus = async () => {
     setSetupLoading(true);
     setSetupError(null);
     try {
       const setupResponse = await fetch(`/api/setup/status?user=${selectedUser}`);
       if (!setupResponse.ok) {
         const errorData = await setupResponse.json();
         throw new Error(errorData.error || `Failed to refresh setup status (${setupResponse.status})`);
       }
       const setupData = await setupResponse.json();
       setSetupState(setupData);
     } catch (err: any) {
       console.error('Error refreshing setup status:', err);
       setSetupError(err.message || 'Could not refresh setup information.');
     } finally {
       setSetupLoading(false);
     }
  };

  // Handle callbacks from SetupQuestions component
  const handleSetupComplete = () => {
    // This function is called when SetupQuestions determines the process is fully complete
    // (e.g., after summary is shown). We update the state to show the user selection UI.
    setSetupState(prev => ({ ...prev!, status: 'complete' })); 
  };

  const handleAnswersSubmitted = (submittedByUser: 'M' | 'E') => {
    // When a user submits, we immediately refresh the status to see if 
    // the other user needs to answer, if summarization starts, or if it's complete.
    console.log(`User ${submittedByUser} submitted answers. Refreshing status...`);
    refreshSetupStatus();
  };

  // Handle join button click
  const handleJoin = () => {
    router.push(`/chat?user=${selectedUser}`);
  };
  
  // Handle chat reset
  const handleResetChat = async () => {
    if (!confirm('Are you sure you want to reset the chat? This will clear all messages and turn history.')) {
      return;
    }
    
    setIsResetting(true);
    
    try {
      const response = await fetch('/api/reset', {
        method: 'POST',
      });
      
      if (response.ok) {
        // Show success message
        alert('Chat has been reset successfully!');
        // Crucially, refresh setup status after reset
        refreshSetupStatus(); 
      } else {
        console.error('Failed to reset chat');
      }
    } catch (error) {
      console.error('Error resetting chat:', error);
    } finally {
      setIsResetting(false);
    }
  };
  
  // JSX for database error UI
  const renderDbErrorUI = () => (
    <div className="flex flex-col items-center justify-center bg-stone-50 p-8 rounded-xl shadow-lg max-w-md w-full border border-stone-200 relative z-10">
      <div className="text-rose-600 text-4xl mb-4">⚠️</div>
      <h1 className="text-2xl font-bold text-stone-800 mb-4">Database Connection Error</h1>
      <p className="text-stone-700 mb-6">{dbError || 'Could not connect to the database. Please check your configuration.'}</p>
      
      <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 mb-6 w-full">
        <p className="text-sm text-stone-800 font-medium mb-2">Development Options:</p>
        <ol className="list-decimal list-inside text-sm text-stone-700 space-y-1">
          <li>Continue without a database - the app has fallbacks for development</li>
          <li>Set up a local Postgres database</li>
          <li>Sign up for a free Neon PostgreSQL database</li>
        </ol>
      </div>
      
      <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 mb-6 w-full">
        <p className="text-sm text-stone-800 font-medium mb-2">Troubleshooting Steps:</p>
        <ol className="list-decimal list-inside text-sm text-stone-700 space-y-1">
          <li>Check your <code className="bg-stone-100 px-1 rounded">.env.local</code> file has a valid <code className="bg-stone-100 px-1 rounded">DATABASE_URL</code></li>
          <li>Run <code className="bg-stone-100 px-1 rounded">npm run check-db</code> to diagnose issues</li>
          <li>Run <code className="bg-stone-100 px-1 rounded">npm run init-db</code> to initialize your database</li>
        </ol>
      </div>
      
      <div className="flex gap-3 w-full">
        <button 
          onClick={() => window.location.reload()} 
          className="flex-1 bg-gradient-to-r from-teal-500 to-violet-600 text-white py-3 px-4 rounded-lg hover:from-violet-600 hover:to-violet-700 transition-all shadow-sm"
        >
          Retry Connection
        </button>
        
        <button 
          onClick={() => setDbError(null)} 
          className="flex-1 bg-white text-stone-700 border border-stone-300 py-3 px-4 rounded-lg hover:bg-stone-50 transition-all shadow-sm"
        >
          Continue Anyway
        </button>
      </div>
    </div>
  );

  // JSX for rendering the main content based on state
  const renderMainContent = () => {
    if (setupLoading || loading) {
      // Show a generic loading state initially
      return (
         <div className="p-8 rounded-xl bg-white/80 shadow-md backdrop-blur-sm">
            <div className="flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-teal-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-lg font-medium text-stone-800">Loading Komensa...</span>
            </div>
         </div>
      );
    }

    if (setupError) {
      return (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 max-w-md w-full">
            <p className="font-semibold">Error loading setup:</p>
            <p>{setupError}</p>
            <button 
                onClick={refreshSetupStatus} 
                className="mt-4 px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600"
            >
                Retry
            </button>
        </div>
      );
    }

    // If setup is needed (and we have the data), show the SetupQuestions component
    if (setupState && setupState.status !== 'complete') {
      return (
        <SetupQuestions 
          initialSetupData={setupState}
          currentUser={selectedUser} // Pass the currently selected user
          onSetupComplete={handleSetupComplete}
          onAnswersSubmitted={handleAnswersSubmitted}
        />
      );
    }

    // If setup is complete or not applicable, show the user selection UI
    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-stone-100">
            <div className="bg-gradient-to-r from-teal-700 to-violet-700 p-6 text-white">
                <h2 className="text-2xl font-bold">Ready to Chat!</h2>
                <p className="text-teal-100 mt-2">
                    Select your identity to join the conversation.
                </p>
            </div>
              
            <div className="p-6">
                {error === 'user_taken' && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-6 text-rose-700 text-sm">
                    The selected user is already active in the chat. Please choose another user.
                  </div>
                )}
                
                <div className="mb-6">
                  <label htmlFor="user" className="block text-stone-800 font-medium mb-2">
                    Choose Your Identity
                  </label>
                  <div className="flex gap-4">
                     {/* Button for E */}
                     <button
                      type="button"
                      onClick={() => setSelectedUser('E')}
                      disabled={!availableUsers.E} // Disable if not available
                      className={`flex-1 py-4 rounded-lg border-2 transition-all ${
                        selectedUser === 'E'
                          ? 'bg-rose-50 border-rose-500 text-rose-800'
                          : 'border-gray-200 text-gray-700'
                      } ${
                        !availableUsers.E
                          ? 'opacity-50 cursor-not-allowed' // Style for disabled
                          : 'hover:border-rose-300'
                      }`}
                     >
                       <span className="text-3xl block mb-1">E</span>
                       {!availableUsers.E && (
                         <span className="text-xs text-rose-600">Already active</span>
                       )}
                       {availableUsers.E && selectedUser !== 'E' && (
                          <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">Select E</span>
                        )}
                     </button>
                     
                     {/* Button for M */}
                     <button
                       type="button"
                       onClick={() => setSelectedUser('M')}
                       disabled={!availableUsers.M} // Disable if not available
                       className={`flex-1 py-4 rounded-lg border-2 transition-all ${
                         selectedUser === 'M'
                           ? 'bg-stone-50 border-stone-500 text-stone-800'
                           : 'border-gray-200 text-gray-700'
                       } ${
                         !availableUsers.M
                           ? 'opacity-50 cursor-not-allowed' // Style for disabled
                           : 'hover:border-stone-300'
                       }`}
                     >
                       <span className="text-3xl block mb-1">M</span>
                       {!availableUsers.M && (
                         <span className="text-xs text-rose-600">Already active</span>
                       )}
                       {availableUsers.M && selectedUser !== 'M' && (
                          <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">Select M</span>
                        )}
                     </button>
                   </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-stone-800 font-medium mb-2">How it Works:</h3>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-teal-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      M and E take turns chatting with the AI assistant
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-teal-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      The AI responds after each message
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-teal-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Chat history is saved for everyone to see
                    </li>
                  </ul>
                </div>
                
                <button
                  onClick={handleJoin}
                  disabled={loading || (selectedUser === 'M' && !availableUsers.M) || (selectedUser === 'E' && !availableUsers.E)} // Also disable if selected user is unavailable
                  className={`w-full py-3 px-4 rounded-lg text-white shadow-sm transition-all ${
                    loading || (selectedUser === 'M' && !availableUsers.M) || (selectedUser === 'E' && !availableUsers.E)
                      ? 'bg-gray-300 cursor-not-allowed'
                      : selectedUser === 'M'
                        ? 'bg-gradient-to-r from-teal-500 to-violet-600 hover:from-violet-600 hover:to-violet-700'
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
                  ) : (
                    `Join as ${selectedUser}`
                  )}
                </button>
            </div>
              
            <div className="bg-stone-50/50 backdrop-blur-sm px-6 py-4 border-t border-stone-100">
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  Powered by Vercel and Neon PostgreSQL
                </p>
                
                <button
                  onClick={handleResetChat}
                  disabled={isResetting}
                  className="text-xs text-gray-400 hover:text-teal-600 transition-colors flex items-center"
                  title="Reset all chat history"
                >
                  {isResetting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Resetting...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset Chat
                    </span>
                  )}
                </button>
              </div>
            </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-stone-50 via-rose-50 to-stone-100 relative">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-stone-200/20 to-stone-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-24 w-80 h-80 bg-gradient-to-br from-rose-300/20 to-rose-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-stone-300/20 to-rose-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-gradient-to-tl from-rose-200/20 to-stone-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-6xl mx-auto">
          <div className="h-full w-full bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.05)_0%,transparent_70%)]"></div>
        </div>
      </div>
      
      <header className="bg-gradient-to-r from-teal-700 to-violet-700 shadow-md p-4 text-white relative z-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold">Komensa</h1>
          <p className="text-teal-100 mt-1">AI-powered conversations between M and E</p>
        </div>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="max-w-md w-full">
          {dbError ? renderDbErrorUI() : renderMainContent()}
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
