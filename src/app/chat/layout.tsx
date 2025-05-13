import React from 'react';

export const metadata = {
  title: 'Chat - Komensa',
  description: 'AI-powered conversations between M and E',
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen bg-gradient-to-br from-stone-50 via-rose-50 to-stone-100 overflow-hidden relative">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-teal-200/10 to-violet-300/10 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute top-1/3 -left-24 w-80 h-80 bg-gradient-to-br from-violet-300/10 to-teal-200/10 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-stone-300/10 to-rose-300/10 rounded-full blur-3xl opacity-60"></div>
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-gradient-to-tl from-rose-200/10 to-stone-300/10 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-6xl mx-auto">
          <div className="h-full w-full bg-[radial-gradient(circle_at_center,rgba(100,116,139,0.04)_0%,transparent_70%)]"></div>
        </div>
      </div>
      
      {children}
    </div>
  );
} 