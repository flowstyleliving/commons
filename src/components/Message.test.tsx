import React from 'react';
import { render, screen } from '@testing-library/react';
import Message from './Message';

describe('Message Component', () => {
  it('renders message from user M', () => {
    render(
      <Message 
        sender="M" 
        content="Hello, this is a test message" 
        timestamp="2024-05-12T12:00:00Z" 
      />
    );
    
    expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
  });
  
  it('renders message from user E', () => {
    render(
      <Message 
        sender="E" 
        content="Hi there!" 
        timestamp="2024-05-12T12:05:00Z" 
      />
    );
    
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();
  });
  
  it('renders message from assistant', () => {
    render(
      <Message 
        sender="assistant" 
        content="I'm an AI assistant" 
        timestamp="2024-05-12T12:10:00Z" 
      />
    );
    
    expect(screen.getByText('I\'m an AI assistant')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
  });
  
  it('applies correct styling based on sender', () => {
    const { rerender } = render(
      <Message 
        sender="M" 
        content="Blue styling" 
        timestamp="2024-05-12T12:00:00Z" 
      />
    );
    
    // M should have blue styling
    const mMessage = screen.getByText('Blue styling').closest('div');
    expect(mMessage).toHaveClass('bg-blue-100');
    
    // E should have purple styling
    rerender(
      <Message 
        sender="E" 
        content="Purple styling" 
        timestamp="2024-05-12T12:05:00Z" 
      />
    );
    
    const eMessage = screen.getByText('Purple styling').closest('div');
    expect(eMessage).toHaveClass('bg-purple-100');
    
    // Assistant should have green styling
    rerender(
      <Message 
        sender="assistant" 
        content="Green styling" 
        timestamp="2024-05-12T12:10:00Z" 
      />
    );
    
    const assistantMessage = screen.getByText('Green styling').closest('div');
    expect(assistantMessage).toHaveClass('bg-green-100');
  });
}); 