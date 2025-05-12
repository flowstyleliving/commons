# Komensa

A chat application for two users (M and E) to converse with an AI assistant, built with:

- Next.js for the frontend and API routes
- Neon PostgreSQL for database storage
- OpenAI API for the assistant
- Vercel for deployment

## Features

- Beautiful, warm UI with user-specific styling
- Turn-based conversation system
- User availability tracking (prevents user conflicts)
- Typing indicators when the AI is responding
- Persistent chat history
- Error handling and fallbacks for database issues

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 18.x or later
- [Neon PostgreSQL](https://neon.tech/) account
- [OpenAI API](https://platform.openai.com/) key
- [Vercel](https://vercel.com/) account (for deployment)

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/flowstyleliving/komensa5.git
   cd komensa5
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with your environment variables:
   ```
   DATABASE_URL=postgresql://username:password@your-neon-db-url/database?sslmode=require
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser

### Setting up Neon PostgreSQL

1. Create a Neon account at [neon.tech](https://neon.tech)
2. Create a new project
3. Create a database inside your project
4. Get your connection string from the Neon dashboard
5. Add the connection string to your `.env.local` file as `DATABASE_URL`

The database tables will be automatically created when you first run the application.

### Deploying to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in the Vercel dashboard:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string
   - `OPENAI_API_KEY`: Your OpenAI API key
4. Deploy your application

## How It Works

1. The home page allows users to select either 'M' or 'E' based on availability
2. Once a user joins, they are taken to the chat page with their selected identity
3. Users take turns sending messages, with the AI responding after each message
4. Chat history is persisted across sessions
5. If the selected user is already active, you'll be redirected back to select another

## Troubleshooting

### Database Connectivity

If you encounter database connection errors:

1. Verify your Neon database is active
2. Check that your `DATABASE_URL` is correct and includes `?sslmode=require`
3. Visit `/api/db-check` endpoint to see detailed database diagnostics
4. Visit `/api/init-db` to initialize the database schema if needed

### OpenAI API Issues

If the AI is not responding:

1. Check that your OpenAI API key is correct
2. Verify you have credit/usage available on your OpenAI account
3. Check server logs for specific API errors

## License

MIT
