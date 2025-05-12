import React from 'react';

interface MessageProps {
  sender: string;
  content: string;
  timestamp: string;
}

const Message: React.FC<MessageProps> = ({ sender, content, timestamp }) => {
  // Determine message styling based on sender
  const isAssistant = sender === 'assistant';
  const isM = sender === 'M';
  
  // Different styling for different senders
  const messageStyles = {
    'M': 'bg-blue-100 text-blue-800',
    'E': 'bg-purple-100 text-purple-800',
    'assistant': 'bg-green-100 text-green-800'
  };
  
  const avatarStyles = {
    'M': 'bg-blue-500',
    'E': 'bg-purple-500',
    'assistant': 'bg-green-500'
  };
  
  const alignmentStyles = isAssistant 
    ? 'justify-start' 
    : (isM ? 'justify-end' : 'justify-start');
  
  return (
    <div className={`flex ${alignmentStyles} mb-4`}>
      <div className={`flex max-w-xs lg:max-w-md`}>
        {!isM && (
          <div className={`flex-shrink-0 h-10 w-10 rounded-full ${avatarStyles[sender as keyof typeof avatarStyles]} flex items-center justify-center text-white font-bold mr-2`}>
            {sender === 'assistant' ? 'AI' : sender}
          </div>
        )}
        
        <div>
          <div className={`rounded-lg px-4 py-2 ${messageStyles[sender as keyof typeof messageStyles]}`}>
            <p className="text-sm">{content}</p>
          </div>
          <span className="text-xs text-gray-500 leading-none">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        </div>
        
        {isM && (
          <div className={`flex-shrink-0 h-10 w-10 rounded-full ${avatarStyles[sender as keyof typeof avatarStyles]} flex items-center justify-center text-white font-bold ml-2`}>
            {sender}
          </div>
        )}
      </div>
    </div>
  );
};

export default Message; 