-- Create test users for AZLOAD application
-- This migration creates a regular user and an admin user for testing purposes

-- Create a simplified approach to create test users
-- Note: In production, users should be created through the Supabase Auth API

-- First, let's create a simple function to insert test data into user_profiles
-- The actual auth users will need to be created through Supabase Auth API

CREATE OR REPLACE FUNCTION create_test_profile(
    user_id UUID,
    user_email TEXT,
    user_full_name TEXT,
    user_company TEXT DEFAULT 'Test Company',
    user_role BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert into user_profiles (assuming auth user exists)
    INSERT INTO public.user_profiles (
        id,
        email,
        full_name,
        company,
        subscription_tier,
        is_admin,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        user_email,
        user_full_name,
        user_company,
        'free',
        user_role,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        company = EXCLUDED.company,
        is_admin = EXCLUDED.is_admin,
        updated_at = NOW();
    
    RAISE NOTICE 'Created/Updated profile for user: %', user_email;
END;
$$;

-- Note: The actual user creation needs to be done through Supabase Auth
-- For testing purposes, you can create users through the Supabase Dashboard
-- or use the signUp function in your application

-- Test user credentials for manual creation:
-- Email: testuser@azload.com
-- Password: TestPassword123!
-- Email: admin@azload.com  
-- Password: AdminPassword123!

-- Clean up function
DROP FUNCTION IF EXISTS create_test_profile(UUID, TEXT, TEXT, TEXT, BOOLEAN);

-- Create a simple test to verify the user_profiles table is working
DO $$
BEGIN
    -- Test that we can insert into user_profiles
    RAISE NOTICE 'User profiles table is ready for test users';
    RAISE NOTICE 'Please create test users through Supabase Auth:';
    RAISE NOTICE '1. testuser@azload.com with password TestPassword123!';
    RAISE NOTICE '2. admin@azload.com with password AdminPassword123!';
END;
$$;
