'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SetupQuestions from '../../components/SetupQuestions';

// Define SetupData interface (same as in main page)
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
function SetupLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 via-rose-50 to-stone-100">
      <div className="p-8 rounded-xl bg-white/80 shadow-md backdrop-blur-sm">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-teal-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg font-medium text-stone-800">Loading Setup...</span>
        </div>
      </div>
    </div>
  );
}

// Main Setup component
function SetupComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedUser = searchParams.get('user') as 'M' | 'E';
  
  const [setupState, setSetupState] = useState<SetupData | null>(null);
  const [setupLoading, setSetupLoading] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);
  
  // Redirect to home if no user is selected
  useEffect(() => {
    if (!selectedUser) {
      router.replace('/');
    }
  }, [selectedUser, router]);
  
  // Fetch setup status
  useEffect(() => {
    let isMounted = true;
    
    const fetchSetupStatus = async () => {
      try {
        setSetupLoading(true);
        
        const setupResponse = await fetch(`/api/setup/status?user=${selectedUser}`);
        
        if (!setupResponse.ok) {
          const errorData = await setupResponse.json();
          throw new Error(errorData.error || `Failed to fetch setup status (${setupResponse.status})`);
        }
        
        const setupData = await setupResponse.json();
        
        if (isMounted) {
          setSetupState(setupData);
          setSetupError(null);
        }
      } catch (err: any) {
        console.error('Error fetching setup status:', err);
        if (isMounted) {
          setSetupError(err.message || 'Could not load setup information.');
          setSetupState(null);
        }
      } finally {
        if (isMounted) {
          setSetupLoading(false);
        }
      }
    };
    
    if (selectedUser) {
      fetchSetupStatus();
    }
    
    // Poll for setup status every 3 seconds
    const interval = setInterval(fetchSetupStatus, 3000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedUser]);
  
  // Handle refreshing setup status
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
    router.replace(`/chat?user=${selectedUser}`);
  };
  
  const handleAnswersSubmitted = (submittedByUser: 'M' | 'E') => {
    // When a user submits, we immediately refresh the status
    console.log(`User ${submittedByUser} submitted answers. Refreshing status...`);
    refreshSetupStatus();
  };

  if (setupLoading) {
    return (
      <div className="p-8 rounded-xl bg-white/80 shadow-md backdrop-blur-sm">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-teal-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg font-medium text-stone-800">Loading Setup...</span>
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
  
  if (setupState?.status === 'complete') {
    // If setup is complete, redirect to chat
    router.replace(`/chat?user=${selectedUser}`);
    return (
      <div className="p-8 rounded-xl bg-white/80 shadow-md backdrop-blur-sm">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-teal-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg font-medium text-stone-800">Setup complete! Redirecting to chat...</span>
        </div>
      </div>
    );
  }
  
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
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Komensa</h1>
            <p className="text-teal-100 mt-1">Setup Questions</p>
          </div>
          <button
            onClick={() => router.replace('/')}
            className="text-sm px-3 py-1 bg-white/20 hover:bg-white/30 rounded-md transition-colors flex items-center"
          >
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>
        </div>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="max-w-md w-full">
          {setupState && (
            <SetupQuestions 
              initialSetupData={setupState}
              currentUser={selectedUser}
              onSetupComplete={handleSetupComplete}
              onAnswersSubmitted={handleAnswersSubmitted}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// Export with Suspense
export default function SetupPage() {
  return (
    <Suspense fallback={<SetupLoading />}>
      <SetupComponent />
    </Suspense>
  );
} 