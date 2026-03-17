DROP POLICY IF EXISTS "Coaches can manage own availabilities"
ON public.coach_availabilities;

CREATE POLICY "Coaches can insert own availabilities"
  ON public.coach_availabilities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND coach_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update own availabilities"
  ON public.coach_availabilities
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND coach_id = auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND coach_id = auth.uid()
  );

CREATE POLICY "Coaches can delete own availabilities"
  ON public.coach_availabilities
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND coach_id = auth.uid()
  );
