/*
  # Add Security and Analytics Features

  1. New Tables
    - `reports`
      - User-submitted content reports
      - Tracks reported content and status
    - `moderation_logs`
      - Tracks moderation actions
    - `analytics_events`
      - User engagement tracking
    - `ip_blocks`
      - Blocked IP addresses
    - `admin_logs`
      - System activity logs

  2. Security
    - Enable RLS on all tables
    - Admin-only access where appropriate
    - Public access where needed
*/

-- Reports for content moderation
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id),
  content_type text NOT NULL CHECK (content_type IN ('post', 'comment', 'user')),
  content_id uuid NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
  notes text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id)
);

-- Moderation action logs
CREATE TABLE IF NOT EXISTS moderation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id uuid REFERENCES auth.users(id) NOT NULL,
  action_type text NOT NULL,
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  page_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  user_agent text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- IP blocking for security
CREATE TABLE IF NOT EXISTS ip_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  reason text NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Admin activity logs
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add is_admin field to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Enable Row Level Security
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Reports policies
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Moderation logs policies
CREATE POLICY "Only admins can view moderation logs"
  ON moderation_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Only admins can create moderation logs"
  ON moderation_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Analytics events policies
CREATE POLICY "Analytics events are insertable by anyone"
  ON analytics_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Only admins can view analytics"
  ON analytics_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- IP blocks policies
CREATE POLICY "IP blocks are viewable by everyone"
  ON ip_blocks FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage IP blocks"
  ON ip_blocks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admin logs policies
CREATE POLICY "Only admins can view admin logs"
  ON admin_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS reports_content_id_idx ON reports(content_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status);
CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS analytics_events_event_type_idx ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS ip_blocks_ip_address_idx ON ip_blocks(ip_address);

-- Functions for analytics
CREATE OR REPLACE FUNCTION get_post_analytics(post_id uuid)
RETURNS TABLE (
  view_count bigint,
  like_count bigint,
  comment_count bigint,
  bookmark_count bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM analytics_events WHERE event_type = 'view' AND metadata->>'post_id' = post_id::text),
    (SELECT COUNT(*) FROM likes WHERE likes.post_id = $1),
    (SELECT COUNT(*) FROM comments WHERE comments.post_id = $1),
    (SELECT COUNT(*) FROM bookmarks WHERE bookmarks.post_id = $1);
END;
$$;