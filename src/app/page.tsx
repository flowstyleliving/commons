'use client';

import React, { useState, useEffect, useRef } from 'react';
import Message from '../components/Message';
import TypingIndicator from '../components/TypingIndicator';

interface MessageType {
  id: string;
  sender: string;
  content: string;
  created_at: string;
}

export default function Home() {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [user, setUser] = useState<'M' | 'E'>('M');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch messages and turn status on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch messages
        const messagesRes = await fetch('/api/messages');
        const messagesData = await messagesRes.json();
        setMessages(messagesData);
        
        // Fetch turn status
        const turnRes = await fetch('/api/turn');
        const turnData = await turnRes.json();
        setCurrentTurn(turnData.current_turn);
        setIsAssistantTyping(turnData.assistant_active);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    
    fetchInitialData();
    
    // Poll for updates every 2 seconds
    const interval = setInterval(async () => {
      try {
        const turnRes = await fetch('/api/turn');
        const turnData = await turnRes.json();
        
        // If there's a turn change, refresh messages
        if (turnData.current_turn !== currentTurn || turnData.assistant_active !== isAssistantTyping) {
          setCurrentTurn(turnData.current_turn);
          setIsAssistantTyping(turnData.assistant_active);
          
          // If assistant is not typing, fetch new messages
          if (!turnData.assistant_active) {
            const messagesRes = await fetch('/api/messages');
            const messagesData = await messagesRes.json();
            setMessages(messagesData);
          }
        }
      } catch (error) {
        console.error('Error polling for updates:', error);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [currentTurn, isAssistantTyping]);
  
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
        setMessages(data.messages);
        setCurrentTurn(data.currentTurn);
        setInputMessage('');
        setIsAssistantTyping(true);
      } else {
        console.error('Error sending message:', data.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  // Toggle between users
  const toggleUser = () => {
    setUser(prev => prev === 'M' ? 'E' : 'M');
  };
  
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800">Komensa Chat</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Current Turn: <span className="font-bold">{currentTurn || '...'}</span>
            </span>
            <button
              onClick={toggleUser}
              className={`px-3 py-1 rounded-full text-white ${
                user === 'M' ? 'bg-blue-500' : 'bg-purple-500'
              }`}
            >
              You are: {user}
            </button>
          </div>
        </div>
      </header>
      
      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center p-8">
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
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
      <div className="bg-white border-t border-gray-200 p-4">
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
              className="flex-1 rounded-l-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={currentTurn !== user || isAssistantTyping || !inputMessage.trim()}
              className={`px-4 py-2 rounded-r-lg text-white ${
                currentTurn === user && !isAssistantTyping && inputMessage.trim()
                  ? user === 'M' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-purple-500 hover:bg-purple-600'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              Send
            </button>
          </form>
          
          {currentTurn !== user && !isAssistantTyping && (
            <p className="text-sm text-gray-500 mt-2">
              Waiting for {currentTurn} to take their turn...
            </p>
          )}
          
          {isAssistantTyping && (
            <p className="text-sm text-gray-500 mt-2">
              AI is thinking and responding...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
