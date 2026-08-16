-- 0005_help_tickets.sql — human escalation path for the public AI assistant.
-- When the assistant can't help (or the user asks for a person), it opens a
-- help ticket that a real human sees and responds to. This is the anti-pattern
-- fix: a ticket must never be closed silently, and every status change is
-- recorded with a note.

CREATE TABLE IF NOT EXISTS help_tickets (
  id             text PRIMARY KEY,
  status         text NOT NULL DEFAULT 'open',   -- open | in_progress | resolved
  name           text,                           -- optional, resident's name
  contact        text,                           -- email or phone for follow-up
  topic          text,                           -- short category: roof, insurance, general, etc.
  summary        text NOT NULL,                  -- what the resident needs
  conversation   text,                           -- optional: the chat that led here
  resolution_note text,                          -- how a human resolved it
  created_at     timestamptz NOT NULL DEFAULT now(),
  resolved_at    timestamptz,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_help_tickets_status ON help_tickets(status);
CREATE INDEX IF NOT EXISTS idx_help_tickets_created ON help_tickets(created_at);
