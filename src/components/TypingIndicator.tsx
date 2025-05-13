import React from 'react';

interface TypingIndicatorProps {
  isTyping: boolean;
  sender: string;
  isCurrentUser?: boolean;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isTyping, sender, isCurrentUser = false }) => {
  if (!isTyping) return null;

  // Different styling based on sender
  const isAssistant = sender === 'assistant' || sender === 'AI';
  
  const avatarStyles = {
    'M': 'bg-gradient-to-br from-amber-400 to-amber-600',
    'E': 'bg-gradient-to-br from-rose-400 to-rose-600',
    'AI': 'bg-gradient-to-br from-teal-400 to-teal-600',
    'assistant': 'bg-gradient-to-br from-teal-400 to-teal-600'
  };
  
  const textStyles = {
    'M': 'text-amber-700',
    'E': 'text-rose-700',
    'AI': 'text-teal-700',
    'assistant': 'text-teal-700'
  };
  
  const bgStyles = {
    'M': 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200',
    'E': 'bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200',
    'AI': 'bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200',
    'assistant': 'bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200'
  };
  
  const dotStyles = {
    'M': 'bg-amber-400',
    'E': 'bg-rose-400',
    'AI': 'bg-teal-400',
    'assistant': 'bg-teal-400'
  };
  
  // Display text based on sender
  const typingText = isAssistant ? 'thinking' : 'typing';
  
  // Determine alignment based on whether it's the current user
  const alignmentStyles = isCurrentUser ? 'justify-end' : 'justify-start';
  
  return (
    <div className={`flex ${alignmentStyles} my-3 mx-4`}>
      {!isCurrentUser && (
        <div className={`flex-shrink-0 h-8 w-8 rounded-full ${avatarStyles[sender as keyof typeof avatarStyles]} flex items-center justify-center text-white font-bold text-xs mr-2 ring-2 ring-white shadow-sm`}>
          {isAssistant ? 'AI' : sender}
        </div>
      )}
      
      <div className={`rounded-2xl px-3 py-2 ${bgStyles[sender as keyof typeof bgStyles]} shadow-sm backdrop-blur-sm`}>
        <div className="flex items-center space-x-1">
          <span className={`${textStyles[sender as keyof typeof textStyles]} text-xs`}>{typingText}</span>
          <div className="flex space-x-1">
            <div role="presentation" className={`w-1.5 h-1.5 ${dotStyles[sender as keyof typeof dotStyles]} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
            <div role="presentation" className={`w-1.5 h-1.5 ${dotStyles[sender as keyof typeof dotStyles]} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
            <div role="presentation" className={`w-1.5 h-1.5 ${dotStyles[sender as keyof typeof dotStyles]} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
      
      {isCurrentUser && (
        <div className={`flex-shrink-0 h-8 w-8 rounded-full ${avatarStyles[sender as keyof typeof avatarStyles]} flex items-center justify-center text-white font-bold text-xs ml-2 ring-2 ring-white shadow-sm`}>
          {sender}
        </div>
      )}
    </div>
  );
};

export default TypingIndicator; 