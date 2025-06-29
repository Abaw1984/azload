-- Remove problematic migration that was causing constraint errors
-- Test users will be created through the application's createTestUsers function instead

-- This migration is intentionally minimal to avoid SQL constraint conflicts
-- The createTestUsers function in the auth context handles user creation properly

DO $$
BEGIN
    RAISE NOTICE 'Test user creation will be handled through the application auth system';
    RAISE NOTICE 'Use the "Create Test Users" button in the Auth Diagnostics component';
END;
$$;
