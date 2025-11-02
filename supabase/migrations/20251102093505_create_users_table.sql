/*
  # Create Users Table and Authentication Setup

  ## Overview
  Sets up the user management system for PortIQ platform with email/password authentication.

  ## New Tables
  1. `profiles`
    - `id` (uuid, primary key) - Links to auth.users
    - `email` (text) - User email address
    - `full_name` (text) - User's full name
    - `created_at` (timestamptz) - Account creation timestamp
    - `updated_at` (timestamptz) - Last profile update timestamp

  ## Security
  - Enable Row Level Security on profiles table
  - Add policy for users to read their own profile
  - Add policy for users to update their own profile
  - Add policy for users to insert their own profile on signup

  ## Notes
  - User authentication is handled by Supabase Auth (auth.users table)
  - This profiles table stores additional user information
  - Password management is handled by Supabase Auth automatically
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();