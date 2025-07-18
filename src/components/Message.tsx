import React from 'react';

interface MessageProps {
  sender: string;
  content: string;
  timestamp: string;
  isCurrentUser?: boolean;
}

// Helper function to format text with proper paragraph breaks and formatting
const formatText = (text: string) => {
  // Split text by double newlines for paragraphs
  const paragraphs = text.split(/\n\n+/);
  
  return (
    <>
      {paragraphs.map((paragraph, index) => {
        // Handle lists (lines starting with - or * or numbers)
        if (paragraph.trim().match(/^[-*]\s+/) || paragraph.trim().match(/^\d+\.\s+/)) {
          // This is a list-like paragraph
          const listItems = paragraph.split('\n').filter(line => line.trim());
          return (
            <ul key={index} className="list-disc pl-5 mb-3 space-y-1">
              {listItems.map((item, itemIndex) => (
                <li key={itemIndex}>{item.replace(/^[-*]\s+/, '')}</li>
              ))}
            </ul>
          );
        }
        
        // Handle code blocks (indented text or text between backticks)
        if (paragraph.trim().startsWith('```') && paragraph.trim().endsWith('```')) {
          const code = paragraph.trim().replace(/^```[\w]*\n/, '').replace(/```$/, '');
          return (
            <pre key={index} className="bg-gray-800 text-gray-100 p-3 rounded-md overflow-x-auto mb-3 text-xs">
              <code>{code}</code>
            </pre>
          );
        }
        
        // Process inline code (text between single backticks)
        const processedText = paragraph.split('`').map((segment, segIndex) => {
          // Even indices are normal text, odd indices are code
          if (segIndex % 2 === 0) {
            return segment;
          } else {
            return <code key={segIndex} className="bg-gray-100 text-rose-600 px-1 py-0.5 rounded font-mono text-xs">{segment}</code>;
          }
        });
        
        // Standard paragraph
        return (
          <p key={index} className="mb-3 last:mb-0">
            {processedText}
          </p>
        );
      })}
    </>
  );
};

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
  
  // Determine alignment based on sender
  // AI messages are centered, user messages are left/right aligned based on isCurrentUser
  const alignmentStyles = isAssistant 
    ? 'justify-center' 
    : (isCurrentUser ? 'justify-end' : 'justify-start');
  
  // Detect if the message is long and should be expanded
  const isLongMessage = content.length > 150 || content.includes('\n');
  const userWidthClass = isLongMessage ? 'max-w-sm md:max-w-lg' : 'max-w-xs lg:max-w-md';
  
  return (
    <div className={`flex ${alignmentStyles} mb-4`}>
      <div className={`flex ${isAssistant ? 'flex-col items-center' : userWidthClass}`}>
        {isAssistant && (
          <div className={`flex-shrink-0 h-10 w-10 rounded-full ${avatarStyles.assistant} flex items-center justify-center text-white font-bold mb-2 ring-2 ring-white`}>
            AI
          </div>
        )}
        
        {!isCurrentUser && !isAssistant && (
          <div className={`flex-shrink-0 h-10 w-10 rounded-full ${avatarStyles[sender as keyof typeof avatarStyles]} flex items-center justify-center text-white font-bold mr-2 ring-2 ring-white`}>
            {sender}
          </div>
        )}
        
        <div className={`${isAssistant ? 'text-center' : ''}`}>
          <div className={`rounded-2xl px-4 py-3 ${messageStyles[sender as keyof typeof messageStyles]} shadow-sm backdrop-blur-sm ${isAssistant ? 'max-w-2xl w-full text-left' : ''}`}>
            <div className="text-sm leading-relaxed">
              {formatText(content)}
            </div>
          </div>
          <span className={`text-xs text-gray-500 leading-none ${isAssistant ? 'mt-1' : 'ml-2'}`}>
            {new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>
        </div>
        
        {isCurrentUser && !isAssistant && (
          <div className={`flex-shrink-0 h-10 w-10 rounded-full ${avatarStyles[sender as keyof typeof avatarStyles]} flex items-center justify-center text-white font-bold ml-2 ring-2 ring-white`}>
            {sender}
          </div>
        )}
      </div>
    </div>
  );
};

export default Message; 