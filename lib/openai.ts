import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Assistant ID for the Komensa AI assistant
// This should be set in the environment variables after creating an Assistant in the OpenAI console
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

export { ASSISTANT_ID };
export default openai; 