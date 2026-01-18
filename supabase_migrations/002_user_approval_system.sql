-- Add user approval system
-- This allows any user to register, but they need admin approval to access the system

-- Add approval status to user metadata
-- Note: This is done via Supabase Auth triggers, not directly in public schema

-- Create a profiles table to track user approval status
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Only approved users can update their own profile (name only)
CREATE POLICY "Approved users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id AND approval_status = 'approved')
    WITH CHECK (auth.uid() = id AND approval_status = 'approved');

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, approval_status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        -- Auto-approve super admins
        CASE 
            WHEN NEW.email = 'diegogalmarini@gmail.com' THEN 'approved'
            ELSE 'pending'
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Admin view to see all users
CREATE OR REPLACE VIEW public.admin_user_list AS
SELECT 
    id,
    email,
    full_name,
    approval_status,
    approved_at,
    created_at
FROM public.user_profiles
ORDER BY created_at DESC;

-- Grant access only to approved users (for admin checking)
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND email = 'diegogalmarini@gmail.com'
        )
    );
