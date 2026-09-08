-- ==============================================================================
-- CODE 24: MASTER ADMIN "GS HIPP" SUPABASE SETUP
-- ==============================================================================

-- 1. Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    new_auth_id uuid := gen_random_uuid();
    new_profile_id uuid := gen_random_uuid();
    default_phc_id uuid;
BEGIN
    -- Get the first available PHC ID to assign this admin to
    SELECT id INTO default_phc_id FROM public.phc_master LIMIT 1;
    
    -- Fallback if no PHC exists yet
    IF default_phc_id IS NULL THEN
        default_phc_id := gen_random_uuid();
        INSERT INTO public.phc_master (id, name, taluka, district, is_active)
        VALUES (default_phc_id, 'Primary Health Centre', 'Default', 'Default', true);
    END IF;

    -- 2. Create the user in auth.users
    -- This allows login using phone '9730266586' and password '123456'
    INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        phone,
        email,
        encrypted_password,
        email_confirmed_at,
        phone_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        new_auth_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        '9730266586',
        'gshipp@arogya.local', 
        crypt('123456', gen_salt('bf')),
        now(),
        now(),
        '{"provider": "phone", "providers": ["phone"]}',
        '{"name": "GS Hipp"}',
        now(),
        now(),
        '',
        '',
        '',
        ''
    );

    -- 3. Create the user profile mapped to the auth user
    INSERT INTO public.user_profiles (
        id,
        auth_user_id,
        role,
        email,
        mobile,
        display_name,
        phc_id,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        new_profile_id,
        new_auth_id,
        'phc_controller',
        'gshipp@arogya.local',
        '9730266586',
        'GS Hipp',
        default_phc_id,
        true,
        now(),
        now()
    );
END $$;
