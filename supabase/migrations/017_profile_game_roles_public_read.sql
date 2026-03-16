-- Allow everyone to read profile_game_roles (needed to list coaches by game)
-- Sans cette policy, les users ne voient que leurs propres lignes via "Users can manage own profile_game_roles"
CREATE POLICY "Profile game roles are viewable by everyone"
  ON public.profile_game_roles
  FOR SELECT
  USING (true);
