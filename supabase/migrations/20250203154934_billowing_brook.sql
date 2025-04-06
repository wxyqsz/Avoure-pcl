/*
  # Initial Blog Schema Setup

  1. New Tables
    - `articles`
      - `id` (uuid, primary key)
      - `title` (text)
      - `excerpt` (text)
      - `content` (text)
      - `category` (text)
      - `image` (text)
      - `author_id` (uuid, references users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `users`
      - `id` (uuid, primary key)
      - `email` (text)
      - `name` (text)
      - `created_at` (timestamp)
      
  2. Security
    - Enable RLS on all tables
    - Add policies for article access and creation
    - Add policies for user data access
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  name text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT email_length CHECK (char_length(email) >= 3)
);

-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  excerpt text,
  content text,
  category text NOT NULL,
  image text,
  author_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT title_length CHECK (char_length(title) >= 3),
  CONSTRAINT valid_category CHECK (category IN ('fashion', 'beauty', 'lifestyle'))
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Policies for users
CREATE POLICY "Users can read their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Policies for articles
CREATE POLICY "Anyone can read articles"
  ON articles
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can create articles"
  ON articles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own articles"
  ON articles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);