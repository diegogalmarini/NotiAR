-- Admin policies for user management
-- Allow super admin to manage all user profiles

-- Super admin can delete any user profile
DROP POLICY IF EXISTS "Super admin can delete users" ON public.user_profiles;
CREATE POLICY "Super admin can delete users" ON public.user_profiles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid() 
            AND email = 'diegogalmarini@gmail.com'
        )
    );

-- Super admin can update any user profile
DROP POLICY IF EXISTS "Super admin can update any user" ON public.user_profiles;
CREATE POLICY "Super admin can update any user" ON public.user_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid() 
            AND email = 'diegogalmarini@gmail.com'
        )
    );

-- Super admin can insert user profiles (for manual creation if needed)
DROP POLICY IF EXISTS "Super admin can insert users" ON public.user_profiles;
CREATE POLICY "Super admin can insert users" ON public.user_profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid() 
            AND email = 'diegogalmarini@gmail.com'
        )
    );
