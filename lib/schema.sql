-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  sender TEXT NOT NULL,         -- 'M', 'E', or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Current turn tracking
CREATE TABLE IF NOT EXISTS room_state (
  room_id TEXT PRIMARY KEY,
  current_turn TEXT NOT NULL,   -- 'M', 'E', or 'assistant'
  assistant_active BOOLEAN DEFAULT false,
  thread_id TEXT DEFAULT NULL, -- Added previously for Assistant API state
  structured_state JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table for pre-conversation setup questions and answers
CREATE TABLE IF NOT EXISTS conversation_setup (
  setup_id SERIAL PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES room_state(room_id) ON DELETE CASCADE,
  questions TEXT[],
  answers JSONB DEFAULT '{}'::jsonb, -- Store answers like {"M": {"q1": "ans1", ...}, "E": {"q1": "ans1", ...}}
  summary TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- e.g., pending, awaiting_M, awaiting_E, summarizing, complete
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (room_id) -- Ensure only one setup per room
); 