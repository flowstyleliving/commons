'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Message from '../../components/Message';
import TypingIndicator from '../../components/TypingIndicator';
import { useSearchParams, useRouter } from 'next/navigation';

interface MessageType {
  id: string;
  sender: string;
  content: string;
  created_at: string;
}

// Loading fallback component
function ChatLoading() {
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

// Main chat component
function ChatComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedUser = searchParams.get('user') as 'M' | 'E';
  
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [user, setUser] = useState<'M' | 'E'>(selectedUser || 'M');
  const [availableUsers, setAvailableUsers] = useState<{M: boolean, E: boolean}>({M: true, E: true});
  const [dbError, setDbError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const otherUser = user === 'M' ? 'E' : 'M';
  
  // Redirect to home if no user is selected
  useEffect(() => {
    if (!selectedUser) {
      router.replace('/');
    }
  }, [selectedUser, router]);
  
  // Fetch active users
  const fetchActiveUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      
      if (response.ok) {
        const activeUsers = data.activeUsers || [];
        const available = {
          M: !activeUsers.includes('M') || activeUsers.includes('M') && selectedUser === 'M',
          E: !activeUsers.includes('E') || activeUsers.includes('E') && selectedUser === 'E'
        };
        setAvailableUsers(available);
        
        // Check if the selected user is already taken by someone else
        if ((selectedUser === 'M' && activeUsers.includes('M') && !available.M) || 
            (selectedUser === 'E' && activeUsers.includes('E') && !available.E)) {
          // Selected user is already taken, redirect to home
          router.replace('/?error=user_taken');
        }
      }
    } catch (error) {
      console.error('Error fetching active users:', error);
    }
  };
  
  // Fetch messages and turn status on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Try to initialize database if needed
        try {
          await fetch('/api/init-db');
        } catch (initError) {
          console.error('Error initializing database:', initError);
          // Continue anyway - this isn't critical
        }
        
        // Fetch active users first
        await fetchActiveUsers();
        
        // Fetch messages
        try {
          const messagesRes = await fetch('/api/messages');
          
          if (!messagesRes.ok) {
            console.warn(`Messages API responded with status: ${messagesRes.status}`);
            setMessages([]);
            
            // Check if this might be a database error
            if (messagesRes.status === 500) {
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
            
            return;
          }
          
          // Clear any previous DB errors if we successfully connected
          setDbError(null);
          
          const messagesData = await messagesRes.json();
          console.log('Debug - Messages API Response:', messagesData);
          
          // Ensure messages is an array with proper fallbacks
          let messagesList = [];
          if (Array.isArray(messagesData)) {
            messagesList = messagesData;
            setMessages(messagesData);
          } else if (messagesData && messagesData.messages && Array.isArray(messagesData.messages)) {
            messagesList = messagesData.messages;
            setMessages(messagesData.messages);
          } else {
            // Handle empty or invalid response gracefully
            console.warn('Invalid messages format:', messagesData);
            setMessages([]);
          }
          
          // If there are no messages, check if setup is complete before redirecting
          if (messagesList.length === 0) {
            try {
              const setupResponse = await fetch(`/api/setup/status?user=${selectedUser}`);
              if (setupResponse.ok) {
                const setupData = await setupResponse.json();
                
                // If setup is still in progress, redirect to setup
                if (setupData.status !== 'complete') {
                  router.replace(`/setup?user=${selectedUser}`);
                  return;
                } 
                
                // If setup is complete but no messages, try to create a welcome message
                // but don't reload or enter a loop
                console.log('Setup complete but no messages yet, creating welcome message');
                
                try {
                  // Create a welcome message directly without reloading
                  const welcomeResponse = await fetch('/api/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      sender: 'assistant',
                      content: setupData.summary 
                        ? `Welcome to your chat! Based on your setup answers about: ${setupData.summary}\n\nM can start the conversation, then E can reply after I respond. How would you like to begin?` 
                        : 'Welcome to your chat! You can start your conversation now. M goes first, then E can join after I respond to M.',
                    }),
                  });
                  
                  if (welcomeResponse.ok) {
                    const welcomeData = await welcomeResponse.json();
                    // Update messages state directly instead of reloading
                    if (welcomeData.messages && Array.isArray(welcomeData.messages)) {
                      setMessages(welcomeData.messages);
                      setCurrentTurn('M'); // Ensure M goes first
                      console.log('Successfully created welcome message');
                    }
                  }
                } catch (welcomeError) {
                  console.error('Error creating welcome message:', welcomeError);
                  // Continue with empty messages rather than creating a reload loop
                }
                
                // Don't redirect or reload - just show empty state if needed
              } else {
                // If we can't check setup status, default to redirecting to setup
                router.replace(`/setup?user=${selectedUser}`);
                return;
              }
            } catch (setupError) {
              console.error('Error checking setup status:', setupError);
              router.replace(`/setup?user=${selectedUser}`);
              return;
            }
          }
        } catch (messageError) {
          console.error('Error fetching messages:', messageError);
          setMessages([]);
          // Still redirect to setup on error as we couldn't load messages
          router.replace(`/setup?user=${selectedUser}`);
          return;
        }
        
        // Fetch turn status
        try {
          const turnRes = await fetch('/api/turn');
          const turnData = await turnRes.json();
          setCurrentTurn(turnData.current_turn);
          setIsAssistantTyping(turnData.assistant_active);
        } catch (turnError) {
          console.error('Error fetching turn status:', turnError);
          // Default values if turn status can't be fetched
          setCurrentTurn('M');
          setIsAssistantTyping(false);
        }
      } catch (error) {
        console.error('Error in fetchInitialData:', error);
        setMessages([]);
      }
    };
    
    if (selectedUser) {
      fetchInitialData();
    }
    
    // Poll for updates every 2 seconds
    const interval = setInterval(async () => {
      if (!selectedUser) return;
      
      try {
        // Try to fetch turn status
        let turnData;
        try {
          const turnRes = await fetch('/api/turn');
          turnData = await turnRes.json();
        } catch (turnError) {
          console.error('Error polling turn status:', turnError);
          return; // Exit early if we can't get turn data
        }
        
        // Check for active users periodically
        await fetchActiveUsers();
        
        // If there's a turn change, refresh messages
        if (turnData.current_turn !== currentTurn || turnData.assistant_active !== isAssistantTyping) {
          setCurrentTurn(turnData.current_turn);
          setIsAssistantTyping(turnData.assistant_active);
          
          // If assistant is not typing, fetch new messages
          if (!turnData.assistant_active) {
            try {
              const messagesRes = await fetch('/api/messages');
              
              if (!messagesRes.ok) {
                console.warn(`Messages API responded with status: ${messagesRes.status}`);
                return;
              }
              
              const messagesData = await messagesRes.json();
              console.log('Debug - Poll Messages Response:', messagesData);
              
              // Ensure messages is an array with proper fallbacks
              if (Array.isArray(messagesData)) {
                setMessages(messagesData);
              } else if (messagesData && messagesData.messages && Array.isArray(messagesData.messages)) {
                setMessages(messagesData.messages);
              } else {
                // Log warning but don't update messages if format is invalid
                console.warn('Invalid messages format in poll:', messagesData);
              }
            } catch (messageError) {
              console.error('Error polling messages:', messageError);
            }
          }
        }
      } catch (error) {
        console.error('Error in polling interval:', error);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [currentTurn, isAssistantTyping, selectedUser, router]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Add effect to poll for typing status
  useEffect(() => {
    // Function to check if other users are typing
    const checkTypingStatus = async () => {
      try {
        const response = await fetch('/api/typing');
        
        if (response.ok) {
          const data = await response.json();
          const typingUsers = data.typingUsers || [];
          
          // Check if the other user is typing
          setOtherUserTyping(typingUsers.includes(otherUser));
        }
      } catch (error) {
        console.error('Error checking typing status:', error);
      }
    };
    
    // Poll for typing status every second
    const interval = setInterval(checkTypingStatus, 1000);
    
    return () => clearInterval(interval);
  }, [otherUser]);
  
  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || currentTurn !== user || isAssistantTyping) return;
    
    try {
      // Send message to API
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: user,
          content: inputMessage,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Ensure messages is an array
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages);
        } else {
          console.error('Invalid messages format in response:', data);
        }
        
        setCurrentTurn(data.currentTurn);
        setInputMessage('');
        setIsAssistantTyping(true);
        
        // Update available users after sending a message
        fetchActiveUsers();
      } else {
        console.error('Error sending message:', data.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
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
        // Reload messages and turn status
        fetchActiveUsers();
        setMessages([]);
        setCurrentTurn('M');
        setIsAssistantTyping(false);
      } else {
        console.error('Failed to reset chat');
      }
    } catch (error) {
      console.error('Error resetting chat:', error);
    } finally {
      setIsResetting(false);
    }
  };
  
  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputMessage(value);
    
    // Only show typing indicator if we're allowed to send messages
    if (currentTurn === user && !isAssistantTyping) {
      // Set user typing flag
      setIsUserTyping(true);
      
      // Clear previous timeout if it exists
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Set a new timeout to stop the typing indicator after 1.5 seconds of inactivity
      const timeout = setTimeout(() => {
        setIsUserTyping(false);
        
        // Tell the API we stopped typing
        fetch('/api/typing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user,
            isTyping: false
          }),
        }).catch(error => console.error('Error updating typing status:', error));
        
      }, 1500);
      
      setTypingTimeout(timeout);
      
      // Tell the API we're typing - Moved outside timeout setup
      fetch('/api/typing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user,
          isTyping: true
        }),
      }).catch(error => console.error('Error updating typing status:', error));
    }
  };
  
  // Add cleanup for typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [typingTimeout]);
  
  // Guard against messages not being an array
  const messageList = Array.isArray(messages) ? messages : [];
  
  // JSX for database error UI
  const renderDbErrorUI = () => (
    <div className="flex flex-col h-screen items-center justify-center bg-stone-50 p-8">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full border border-stone-200">
        <div className="text-rose-600 text-4xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-stone-800 mb-4">Database Connection Error</h1>
        <p className="text-stone-700 mb-6">{dbError || 'Could not connect to the database. Please check your configuration.'}</p>
        <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 mb-6">
          <p className="text-sm text-stone-800 font-medium mb-2">Troubleshooting Steps:</p>
          <ol className="list-decimal list-inside text-sm text-stone-700 space-y-1">
            <li>Ensure your DATABASE_URL environment variable is set correctly</li>
            <li>Check that your database server is running</li>
            <li>Verify your network connection to the database</li>
            <li>Make sure SSL is enabled if required by your database provider</li>
          </ol>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="w-full bg-gradient-to-r from-teal-500 to-violet-600 text-white py-3 px-4 rounded-lg hover:from-violet-600 hover:to-violet-700 transition-all shadow-sm"
        >
          Retry Connection
        </button>
      </div>
    </div>
  );
  
  // Display database error UI if there's a problem
  if (dbError) {
    return renderDbErrorUI();
  }
  
  return (
    <div className="flex flex-col h-screen bg-transparent relative z-10">
      {/* Header */}
      <header className="bg-gradient-to-r from-teal-700 to-violet-700 shadow-md p-4 text-white">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold">Komensa Chat</h1>
            <button 
              onClick={handleResetChat}
              disabled={isResetting}
              className="text-sm px-3 py-1 bg-white/20 hover:bg-white/30 rounded-md transition-colors flex items-center"
            >
              {isResetting ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Resetting...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset Chat
                </>
              )}
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm">
              Current Turn: <span className="font-bold bg-white/20 px-2 py-1 rounded-md">{currentTurn || '...'}</span>
            </span>
            <div className="flex items-center">
              <span className="text-sm mr-2">You are:</span>
              <div 
                className={`px-3 py-1 rounded-full text-white ${
                  user === 'M' ? 'bg-teal-600 ring-2 ring-teal-300' : 'bg-violet-500 ring-2 ring-violet-300'
                } shadow-md`}
              >
                {user}
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          {messageList.length === 0 ? (
            <div className="text-center p-8 bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-stone-200 my-8">
              <p className="text-stone-800">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messageList.map((message) => (
              <Message
                key={message.id}
                sender={message.sender}
                content={message.content}
                timestamp={message.created_at}
                isCurrentUser={message.sender === user}
              />
            ))
          )}
          
          {/* Typing Indicators Container */}
          <div className="h-16 flex flex-col justify-end mt-2">
            {/* AI typing indicator */}
            {isAssistantTyping && <TypingIndicator isTyping={true} sender="AI" />}
            
            {/* User typing indicator - show if current user is typing */}
            {isUserTyping && <TypingIndicator isTyping={true} sender={user} isCurrentUser={true} />}
            
            {/* Other user typing indicator */}
            {otherUserTyping && <TypingIndicator isTyping={true} sender={otherUser} />}
          </div>
          
          {/* For auto-scrolling */}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Message Input */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-stone-200 p-4 shadow-inner">
        <div className="max-w-4xl mx-auto">
          {/* Status Messages */}
          <div className="mb-2">
            {currentTurn !== user && !isAssistantTyping && (
              <p className="text-sm text-stone-700 ml-2">
                Waiting for {currentTurn} to take their turn...
              </p>
            )}
            
            {isAssistantTyping && (
              <p className="text-sm text-teal-700 ml-2">
                AI is thinking and responding...
              </p>
            )}
          </div>
          
          <form onSubmit={handleSendMessage} className="flex">
            <textarea
              value={inputMessage}
              onChange={handleInputChange}
              placeholder={
                currentTurn === user 
                  ? "Type your message..." 
                  : `Waiting for ${currentTurn} to send a message...`
              }
              disabled={currentTurn !== user || isAssistantTyping}
              className="flex-1 rounded-l-lg border-stone-300 focus:ring-teal-500 focus:border-teal-500 shadow-sm py-3 px-4 bg-white/90 text-black min-h-[50px] max-h-36 resize-y"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={currentTurn !== user || isAssistantTyping || !inputMessage.trim()}
              className={`px-6 py-3 rounded-r-lg text-white shadow-sm transition-all ${
                currentTurn === user && !isAssistantTyping && inputMessage.trim()
                  ? user === 'M' ? 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700' : 'bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Export with Suspense
export default function ChatPage() {
  return (
    <Suspense fallback={<ChatLoading />}>
      <ChatComponent />
    </Suspense>
  );
}