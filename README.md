# Komensa Chat

A simple chat application for two users (M and E) to talk with an AI assistant. Features include:

- Turn-based conversation with coin flip to decide who goes first
- Typing indicators
- Persistent chat history using Neon PostgreSQL
- OpenAI-powered assistant that maintains context
- Clean, modern UI

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables:
   Create a `.env` file with the following:
   ```
   DATABASE_URL="postgresql://username:password@your-neon-db-url:5432/database?sslmode=require"
   OPENAI_API_KEY="your-openai-api-key"
   ```

4. Initialize the database:
   ```
   npm run init-db
   ```

5. Run the development server:
   ```
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) with your browser

## Database Schema

The application uses a simple schema with two tables:

```sql
-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  sender TEXT NOT NULL,         -- 'M', 'E', or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Current turn tracking
CREATE TABLE room_state (
  room_id TEXT PRIMARY KEY,
  current_turn TEXT NOT NULL,   -- 'M', 'E', or 'assistant'
  assistant_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## How It Works

1. Upon initialization, the app creates a "main-room" with a random first turn (M or E)
2. Users can switch between M and E using the toggle button
3. Only the user whose turn it is can send a message
4. After a user sends a message, the AI assistant responds
5. The turn passes to the other user
6. The conversation continues with context maintained

## Troubleshooting

### Database Issues

If you encounter database-related errors or no messages appear:

1. Make sure your Neon PostgreSQL database is set up correctly
2. Check your `.env` file contains the correct `DATABASE_URL`
3. Run the database check script to verify connection and data:
   ```
   npm run check-db
   ```
4. If issues persist, reinitialize the database:
   ```
   npm run init-db
   ```

### API Errors

If you see error messages in the console when sending messages:

1. Verify your OpenAI API key is valid in the `.env` file
2. Check the browser console for specific error messages
3. Restart the development server

### TypeErrors with `.map()`

If you encounter `TypeError: messages.map is not a function` or similar errors:

1. This typically means the messages array is not properly initialized
2. Try reinitializing the database with `npm run init-db`
3. Restart the development server

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# komensa5
