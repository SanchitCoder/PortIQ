# Fix Empty Profiles Table

## Problem
Your `profiles` table is empty, but you can still login because authentication uses `auth.users` (which is separate). However, the app needs profiles to exist because:
- `feature_usage` table references `profiles(id)`
- `subscriptions` table references `profiles(id)`
- Profile management features won't work

## Solution

### Step 1: Run the Backfill Migration

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire content of `supabase/migrations/20251104000000_backfill_profiles.sql`
4. Click **Run**

This will:
- Create profiles for all existing users in `auth.users`
- Set up the trigger for future signups
- Ensure proper permissions

### Step 2: Verify Profiles Were Created

1. Go to **Table Editor** in Supabase Dashboard
2. Click on `profiles` table
3. You should now see rows for each user who has signed up
4. Each profile will have:
   - `id` (matching auth.users.id)
   - `email` (from auth.users)
   - `full_name` (from metadata or empty)

### Step 3: Verify Feature Usage Table

After profiles exist, the `feature_usage` table should work properly. Run the feature_usage migration if you haven't:

1. Go to **SQL Editor**
2. Run `supabase/migrations/20251103000001_create_feature_usage_table.sql`

## Manual Fix (If Migration Doesn't Work)

If the migration doesn't work, you can manually create profiles:

1. Go to **SQL Editor**
2. Run this query to see your auth users:

```sql
SELECT id, email, raw_user_meta_data, created_at
FROM auth.users;
```

3. Then create profiles manually:

```sql
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
VALUES (
  'your-user-id-from-auth-users',
  'your-email@example.com',
  'Your Name',
  NOW(),
  NOW()
);
```

Replace `'your-user-id-from-auth-users'` and other values with actual data from your auth.users table.

## Verify Everything Works

After running the backfill:

1. ✅ Profiles table should have rows
2. ✅ Feature usage counter should start working
3. ✅ Future signups will automatically create profiles (trigger handles it)
4. ✅ Settings page should load user profile data

## Why This Happened

This typically happens when:
- Users signed up before the trigger was created
- The trigger migration wasn't run
- The trigger failed silently

The backfill migration fixes this and ensures future signups work automatically.

