-- 0009_message_sender.sql — track which business sent a business-role message
-- (null for consumer messages). Enables per-business message attribution in threads.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_contractor_id text;
