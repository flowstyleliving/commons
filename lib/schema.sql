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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
); 