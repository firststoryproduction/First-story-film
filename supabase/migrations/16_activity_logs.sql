-- Migration 16: Activity Logs Table
-- Central audit trail for all user actions in the system

CREATE TABLE IF NOT EXISTS activity_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name    TEXT NOT NULL DEFAULT '',
  action_type  TEXT NOT NULL CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT')),
  module_name  TEXT NOT NULL DEFAULT '',
  record_id    TEXT,
  description  TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'Success' CHECK (status IN ('Success', 'Failed')),
  ip_address   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id    ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module_name ON activity_logs(module_name);
CREATE INDEX IF NOT EXISTS idx_activity_logs_status      ON activity_logs(status);

-- RLS: Only ADMIN can read/delete logs via service role bypass
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (API uses service role key)
CREATE POLICY "service_role_all_activity_logs"
  ON activity_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
