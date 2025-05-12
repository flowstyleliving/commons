'use client';

import React, { useState, useEffect, useRef } from 'react';
import Message from '../../components/Message';
import TypingIndicator from '../../components/TypingIndicator';
import { useSearchParams, useRouter } from 'next/navigation';

interface MessageType {
  id: string;
  sender: string;
  content: string;
  created_at: string;
}

export default function ChatPage() {
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
          if (Array.isArray(messagesData)) {
            setMessages(messagesData);
          } else if (messagesData && messagesData.messages && Array.isArray(messagesData.messages)) {
            setMessages(messagesData.messages);
          } else {
            // Handle empty or invalid response gracefully
            console.warn('Invalid messages format:', messagesData);
            setMessages([]);
          }
        } catch (messageError) {
          console.error('Error fetching messages:', messageError);
          setMessages([]);
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
  
  // Guard against messages not being an array
  const messageList = Array.isArray(messages) ? messages : [];
  
  // JSX for database error UI
  const renderDbErrorUI = () => (
    <div className="flex flex-col h-screen items-center justify-center bg-amber-50 p-8">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full border border-amber-200">
        <div className="text-rose-600 text-4xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-amber-800 mb-4">Database Connection Error</h1>
        <p className="text-amber-700 mb-6">{dbError || 'Could not connect to the database. Please check your configuration.'}</p>
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mb-6">
          <p className="text-sm text-amber-800 font-medium mb-2">Troubleshooting Steps:</p>
          <ol className="list-decimal list-inside text-sm text-amber-700 space-y-1">
            <li>Ensure your DATABASE_URL environment variable is set correctly</li>
            <li>Check that your database server is running</li>
            <li>Verify your network connection to the database</li>
            <li>Make sure SSL is enabled if required by your database provider</li>
          </ol>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white py-3 px-4 rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all shadow-sm"
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
      <header className="bg-gradient-to-r from-amber-500 to-amber-600 shadow-md p-4 text-white">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Komensa Chat</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm">
              Current Turn: <span className="font-bold bg-white/20 px-2 py-1 rounded-md">{currentTurn || '...'}</span>
            </span>
            <div className="flex items-center">
              <span className="text-sm mr-2">You are:</span>
              <div 
                className={`px-3 py-1 rounded-full text-white ${
                  user === 'M' ? 'bg-amber-600 ring-2 ring-amber-300' : 'bg-rose-500 ring-2 ring-rose-300'
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
            <div className="text-center p-8 bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-amber-200 my-8">
              <p className="text-amber-800">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messageList.map((message) => (
              <Message
                key={message.id}
                sender={message.sender}
                content={message.content}
                timestamp={message.created_at}
              />
            ))
          )}
          
          {isAssistantTyping && <TypingIndicator isTyping={true} sender="AI" />}
          
          {/* For auto-scrolling */}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Message Input */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-amber-200 p-4 shadow-inner">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                currentTurn === user 
                  ? "Type your message..." 
                  : `Waiting for ${currentTurn} to send a message...`
              }
              disabled={currentTurn !== user || isAssistantTyping}
              className="flex-1 rounded-l-full border-amber-200 focus:ring-amber-500 focus:border-amber-500 shadow-sm py-3 px-4 bg-white/90"
            />
            <button
              type="submit"
              disabled={currentTurn !== user || isAssistantTyping || !inputMessage.trim()}
              className={`px-6 py-3 rounded-r-full text-white shadow-sm transition-all ${
                currentTurn === user && !isAssistantTyping && inputMessage.trim()
                  ? user === 'M' ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700' : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              Send
            </button>
          </form>
          
          {currentTurn !== user && !isAssistantTyping && (
            <p className="text-sm text-amber-700 mt-2 ml-2">
              Waiting for {currentTurn} to take their turn...
            </p>
          )}
          
          {isAssistantTyping && (
            <p className="text-sm text-teal-700 mt-2 ml-2">
              AI is thinking and responding...
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 