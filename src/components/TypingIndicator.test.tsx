import React from 'react';
import { render, screen } from '@testing-library/react';
import TypingIndicator from './TypingIndicator';

describe('TypingIndicator Component', () => {
  it('renders typing indicator when isTyping is true', () => {
    render(<TypingIndicator isTyping={true} sender="AI" />);
    
    expect(screen.getByText('AI is typing')).toBeInTheDocument();
    
    // Check for animation dots
    const dots = screen.getAllByRole('presentation', { hidden: true });
    expect(dots.length).toBe(3);
  });
  
  it('does not render anything when isTyping is false', () => {
    const { container } = render(<TypingIndicator isTyping={false} sender="AI" />);
    
    // Container should be empty
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('AI is typing')).not.toBeInTheDocument();
  });
  
  it('displays different sender names correctly', () => {
    const { rerender } = render(<TypingIndicator isTyping={true} sender="AI" />);
    expect(screen.getByText('AI is typing')).toBeInTheDocument();
    
    rerender(<TypingIndicator isTyping={true} sender="M" />);
    expect(screen.getByText('M is typing')).toBeInTheDocument();
    
    rerender(<TypingIndicator isTyping={true} sender="E" />);
    expect(screen.getByText('E is typing')).toBeInTheDocument();
  });
}); 