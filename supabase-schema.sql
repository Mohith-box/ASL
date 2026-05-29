-- ══════════════════════════════════════════════════════════════
--  ASL — Abstream Sports League · Supabase Database Schema
--  Run this entire file in: Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════

-- ── Enable UUID extension ──
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ══════════════════════════════════════════════════════
--  TABLE: admins
-- ══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admins (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Link admins to Supabase Auth
-- The admin's Supabase Auth UID is stored as the id above.
-- We use Supabase Auth for all password handling (no plain-text passwords).


-- ══════════════════════════════════════════════════════
--  TABLE: players
-- ══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS players (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id          UUID UNIQUE,          -- Supabase auth.users.id (set after email confirm)
  name             TEXT NOT NULL,
  email            TEXT UNIQUE NOT NULL,
  sport            TEXT NOT NULL,
  category         TEXT NOT NULL,        -- 'singles-men', 'doubles-men', etc.
  location         TEXT NOT NULL DEFAULT 'Bengaluru', -- player location
  team             TEXT NOT NULL DEFAULT 'Independent', -- player team name
  initials         TEXT NOT NULL DEFAULT 'PL',
  avatar_gradient  TEXT DEFAULT 'linear-gradient(135deg, #ff8c00, #ff3c00)',
  photo_url        TEXT,                 -- Supabase Storage public URL
  points           INTEGER NOT NULL DEFAULT 1000,
  matches          INTEGER NOT NULL DEFAULT 0,
  wins             INTEGER NOT NULL DEFAULT 0,
  rank             INTEGER,              -- recalculated by trigger
  created_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ══════════════════════════════════════════════════════
--  TABLE: match_history
-- ══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS match_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  opponent     TEXT NOT NULL,
  score        TEXT NOT NULL,
  result       TEXT NOT NULL CHECK (result IN ('W', 'L', 'D')),
  points_delta INTEGER NOT NULL DEFAULT 0,   -- +/- points awarded for this match
  sport        TEXT,
  played_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ══════════════════════════════════════════════════════
--  TABLE: registrations
-- ══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS registrations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id  TEXT UNIQUE NOT NULL,
  tournament_type  TEXT NOT NULL CHECK (tournament_type IN ('open', 'corp')),
  full_name        TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT NOT NULL,
  dob              DATE,
  gender           TEXT,
  sport            TEXT NOT NULL,
  categories       TEXT[] NOT NULL,          -- e.g. ARRAY['singles-men','mixed-doubles']
  partner_name     TEXT,
  partner_phone    TEXT,
  partner_email    TEXT,
  company          TEXT,
  employee_id      TEXT,
  department       TEXT,
  t_shirt_size     TEXT,
  skill_level      TEXT,
  amount_paid      NUMERIC(10,2) NOT NULL,
  payment_status   TEXT NOT NULL DEFAULT 'pending',
  payment_id       TEXT,
  photo_url        TEXT,                     -- Supabase Storage public URL
  created_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ══════════════════════════════════════════════════════
--  FUNCTION + TRIGGER: auto-recalculate player ranks
--  Runs after any INSERT or UPDATE on players table
-- ══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION recalculate_player_ranks()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE players
  SET rank = sub.new_rank
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY location, sport, category ORDER BY points DESC) AS new_rank
    FROM players
  ) sub
  WHERE players.id = sub.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_recalculate_ranks ON players;
CREATE TRIGGER trigger_recalculate_ranks
AFTER INSERT OR UPDATE OF points ON players
FOR EACH STATEMENT
EXECUTE FUNCTION recalculate_player_ranks();


-- ══════════════════════════════════════════════════════
--  FUNCTION + TRIGGER: auto-update player points & stats
--  Runs after INSERT on match_history table
-- ══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_player_stats_on_match()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE players
  SET
    points  = points + NEW.points_delta,
    matches = matches + 1,
    wins    = wins + (CASE WHEN NEW.result = 'W' THEN 1 ELSE 0 END)
  WHERE id = NEW.player_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_player_stats ON match_history;
CREATE TRIGGER trigger_update_player_stats
AFTER INSERT ON match_history
FOR EACH ROW
EXECUTE FUNCTION update_player_stats_on_match();


-- ══════════════════════════════════════════════════════
--  ROW LEVEL SECURITY (RLS) Policies
-- ══════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE admins         ENABLE ROW LEVEL SECURITY;
ALTER TABLE players        ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations  ENABLE ROW LEVEL SECURITY;

-- ── admins: only the admin themselves can read their own row ──
CREATE POLICY "admins: own row read" ON admins
  FOR SELECT USING (auth.uid() = id);

-- ── admins: allow inserts during signup ──
CREATE POLICY "admins: insert on signup" ON admins
  FOR INSERT WITH CHECK (true);

-- ── players: anyone can read all players (for public rankings) ──
CREATE POLICY "players: public read" ON players
  FOR SELECT USING (true);

-- ── players: only the player themselves can update their own row ──
CREATE POLICY "players: own row update" ON players
  FOR UPDATE USING (auth.uid() = auth_id);

-- ── players: allow insert by authenticated users (signup flow) ──
CREATE POLICY "players: insert on signup" ON players
  FOR INSERT WITH CHECK (true);

-- ── match_history: public read ──
CREATE POLICY "match_history: public read" ON match_history
  FOR SELECT USING (true);

-- ── match_history: allow insert by authenticated admins ──
CREATE POLICY "match_history: admin insert" ON match_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.id = auth.uid()
    )
  );

-- ── registrations: admins can read all; players read their own ──
CREATE POLICY "registrations: public insert" ON registrations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "registrations: own read" ON registrations
  FOR SELECT USING (true);  -- Narrow down on frontend by player email


-- ══════════════════════════════════════════════════════
--  STORAGE BUCKET: player-photos
--  Creates the bucket and defines RLS storage policies.
-- ══════════════════════════════════════════════════════

-- Create player-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('player-photos', 'player-photos', true)
ON CONFLICT (id) DO NOTHING;


-- Allow public read access to player-photos bucket
CREATE POLICY "Public Read Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'player-photos');

-- Allow anyone to upload photos to player-photos bucket (during signup/registration/profile update)
CREATE POLICY "Public Insert Access" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'player-photos');

-- Allow anyone to update/overwrite their photos in player-photos bucket
CREATE POLICY "Public Update Access" ON storage.objects
  FOR UPDATE USING (bucket_id = 'player-photos') WITH CHECK (bucket_id = 'player-photos');


-- ══════════════════════════════════════════════════════
--  SEED: default demo players (optional)
--  Uncomment and run if you want pre-seeded data
-- ══════════════════════════════════════════════════════
/*
INSERT INTO players (name, email, sport, category, initials, avatar_gradient, points, matches, wins) VALUES
  ('Arjun Sharma',   'arjun@abstreamsl.com',   'badminton',  'singles-men',    'AS', 'linear-gradient(135deg, #ff8c00, #ff3c00)', 2450, 32, 27),
  ('Priya Patel',    'priya@abstreamsl.com',    'badminton',  'singles-women',  'PP', 'linear-gradient(135deg, #00f0ff, #0076ff)', 2180, 28, 22),
  ('Rahul Krishnan', 'rahul@abstreamsl.com',    'badminton',  'singles-men',    'RK', 'linear-gradient(135deg, #a64eff, #ff3860)', 1940, 25, 18),
  ('Ananya Reddy',   'ananya@abstreamsl.com',   'pickleball', 'singles-women',  'AR', 'linear-gradient(135deg, #00ff88, #0076ff)', 1820, 22, 17),
  ('Vikram Singh',   'vikram@abstreamsl.com',   'badminton',  'doubles-men',    'VS', 'linear-gradient(135deg, #e0a300, #ff8c00)', 1760, 26, 18);
*/

-- ══════════════════════════════════════════════════════
--  DEVELOPMENT/TEST: Auto-confirm user emails
--  This trigger automatically marks all new signups as confirmed.
--  Run this in Supabase Dashboard → SQL Editor.
-- ══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION auto_confirm_user_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email_confirmed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_confirm_email ON auth.users;
CREATE TRIGGER trigger_auto_confirm_email
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION auto_confirm_user_email();

-- Run this once to confirm any existing unconfirmed users:
-- UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;

