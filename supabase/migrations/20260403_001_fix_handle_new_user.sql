-- Migration: Fix handle_new_user() trigger for duplicate key error
-- Date: 2026-04-03
-- Issue: Login fails with "Database error creating new user" due to duplicate key

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.user_profiles (id, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        updated_at = now();

    RETURN NEW;
END;
$function$;
