ALTER TABLE public.coach_availabilities
ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ;

ALTER TABLE public.coach_availabilities
ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ;

ALTER TABLE public.coach_availabilities
ADD COLUMN IF NOT EXISTS status TEXT;

UPDATE public.coach_availabilities
SET status = 'available'
WHERE status IS NULL;

ALTER TABLE public.coach_availabilities
ALTER COLUMN status SET DEFAULT 'available';

ALTER TABLE public.coach_availabilities
ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.coach_availabilities
DROP CONSTRAINT IF EXISTS coach_availabilities_status_check;

ALTER TABLE public.coach_availabilities
ADD CONSTRAINT coach_availabilities_status_check
CHECK (status IN ('available', 'booked'));

ALTER TABLE public.coach_availabilities
DROP CONSTRAINT IF EXISTS coach_availabilities_datetime_range_check;

ALTER TABLE public.coach_availabilities
ADD CONSTRAINT coach_availabilities_datetime_range_check
CHECK (
  start_at IS NULL
  OR end_at IS NULL
  OR start_at < end_at
);

CREATE INDEX IF NOT EXISTS idx_availabilities_coach_start_at
ON public.coach_availabilities (coach_id, start_at);
