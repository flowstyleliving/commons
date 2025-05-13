import { NextResponse } from 'next/server';

// In-memory store for typing status (in a real app, this would be in Redis or similar)
type TypingStatus = {
  user: string;
  isTyping: boolean;
  timestamp: number;
};

// Global typing status for all users
let typingStatuses: TypingStatus[] = [];

// Clear typing status after 3 seconds
const TYPING_TIMEOUT = 3000;

// Periodically clean up stale typing indicators
setInterval(() => {
  const now = Date.now();
  typingStatuses = typingStatuses.filter(status => {
    return status.isTyping && (now - status.timestamp < TYPING_TIMEOUT);
  });
}, 1000);

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { user, isTyping } = data;
    
    if (!user) {
      return NextResponse.json({ error: 'User is required' }, { status: 400 });
    }
    
    // Update typing status
    const existingIndex = typingStatuses.findIndex(status => status.user === user);
    
    if (existingIndex >= 0) {
      // Update existing status
      typingStatuses[existingIndex] = {
        user,
        isTyping: Boolean(isTyping),
        timestamp: Date.now()
      };
    } else {
      // Add new status
      typingStatuses.push({
        user,
        isTyping: Boolean(isTyping),
        timestamp: Date.now()
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating typing status:', error);
    return NextResponse.json({ error: 'Failed to update typing status' }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Clean expired typing statuses before returning
    const now = Date.now();
    const activeTypingStatuses = typingStatuses.filter(status => {
      return status.isTyping && (now - status.timestamp < TYPING_TIMEOUT);
    });
    
    return NextResponse.json({ 
      typingUsers: activeTypingStatuses.map(status => status.user)
    });
  } catch (error) {
    console.error('Error getting typing status:', error);
    return NextResponse.json({ error: 'Failed to get typing status' }, { status: 500 });
  }
} 