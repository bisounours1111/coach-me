ALTER TABLE public.coach_availabilities
DROP CONSTRAINT IF EXISTS check_time_range;

DROP INDEX IF EXISTS idx_availabilities_day_of_week;
DROP INDEX IF EXISTS idx_availabilities_specific_date;

ALTER TABLE public.coach_availabilities
DROP COLUMN IF EXISTS day_of_week,
DROP COLUMN IF EXISTS start_time,
DROP COLUMN IF EXISTS end_time,
DROP COLUMN IF EXISTS specific_date;
