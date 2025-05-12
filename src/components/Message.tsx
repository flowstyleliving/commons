import React from 'react';

interface MessageProps {
  sender: string;
  content: string;
  timestamp: string;
  isCurrentUser?: boolean;
}

const Message: React.FC<MessageProps> = ({ sender, content, timestamp, isCurrentUser = false }) => {
  // Determine message styling based on sender
  const isAssistant = sender === 'assistant';
  
  // Different styling for different senders with warmer colors
  const messageStyles = {
    'M': 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900 border border-amber-200',
    'E': 'bg-gradient-to-br from-rose-50 to-rose-100 text-rose-900 border border-rose-200',
    'assistant': 'bg-gradient-to-br from-teal-50 to-teal-100 text-teal-900 border border-teal-200'
  };
  
  const avatarStyles = {
    'M': 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-md',
    'E': 'bg-gradient-to-br from-rose-400 to-rose-600 shadow-md',
    'assistant': 'bg-gradient-to-br from-teal-400 to-teal-600 shadow-md'
  };
  
  // Use isCurrentUser prop for alignment
  const alignmentStyles = isCurrentUser ? 'justify-end' : 'justify-start';
  
  return (
    <div className={`flex ${alignmentStyles} mb-4`}>
      <div className={`flex max-w-xs lg:max-w-md`}>
        {!isCurrentUser && (
          <div className={`flex-shrink-0 h-10 w-10 rounded-full ${avatarStyles[sender as keyof typeof avatarStyles]} flex items-center justify-center text-white font-bold mr-2 ring-2 ring-white`}>
            {sender === 'assistant' ? 'AI' : sender}
          </div>
        )}
        
        <div>
          <div className={`rounded-2xl px-4 py-3 ${messageStyles[sender as keyof typeof messageStyles]} shadow-sm backdrop-blur-sm`}>
            <p className="text-sm leading-relaxed">{content}</p>
          </div>
          <span className="text-xs text-gray-500 leading-none ml-2">
            {new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>
        </div>
        
        {isCurrentUser && (
          <div className={`flex-shrink-0 h-10 w-10 rounded-full ${avatarStyles[sender as keyof typeof avatarStyles]} flex items-center justify-center text-white font-bold ml-2 ring-2 ring-white`}>
            {sender}
          </div>
        )}
      </div>
    </div>
  );
};

export default Message; 