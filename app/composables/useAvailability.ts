export type AvailabilityStatus =
  | "available"
  | "upcoming"
  | "booked"
  | "confirmed"
  | "canceled"
  // rétro-compat
  | "pending"
  | "blocked";

export interface Availability {
  id: string;
  coach_id: string;
  start_at: string;
  end_at: string;
  status: AvailabilityStatus;
  is_active: boolean;
}

export interface AvailabilitySlotInput {
  start_at: string;
  end_at: string;
  status: AvailabilityStatus;
}

export interface AvailabilitySelectionInput {
  start: Date | string;
  end: Date | string;
}

const HOUR_IN_MS = 60 * 60 * 1000;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeUuid = (value: unknown): string | null => {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "undefined" || raw === "null") return null;
  return UUID_REGEX.test(raw) ? raw : null;
};

const toDate = (value: Date | string) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("La plage sélectionnée est invalide.");
  }

  return date;
};

export const splitSelectionIntoHourlySlots = ({
  start,
  end,
}: AvailabilitySelectionInput): AvailabilitySlotInput[] => {
  const selectionStart = toDate(start);
  const selectionEnd = toDate(end);
  const duration = selectionEnd.getTime() - selectionStart.getTime();

  if (duration <= 0) {
    throw new Error("La plage sélectionnée doit avoir une durée positive.");
  }

  if (
    selectionStart.getMinutes() !== 0 ||
    selectionStart.getSeconds() !== 0 ||
    selectionEnd.getMinutes() !== 0 ||
    selectionEnd.getSeconds() !== 0 ||
    duration % HOUR_IN_MS !== 0
  ) {
    throw new Error(
      "La sélection doit correspondre à des créneaux complets d'une heure.",
    );
  }

  const now = Date.now();
  const slots: AvailabilitySlotInput[] = [];
  let cursor = new Date(selectionStart);

  while (cursor.getTime() < selectionEnd.getTime()) {
    const slotEnd = new Date(cursor.getTime() + HOUR_IN_MS);

    if (cursor.getTime() < now) {
      throw new Error("Impossible de créer des créneaux dans le passé.");
    }

    slots.push({
      start_at: cursor.toISOString(),
      end_at: slotEnd.toISOString(),
      status: "available",
    });

    cursor = slotEnd;
  }

  return slots;
};

export const useAvailability = () => {
  const client = useSupabaseClient<any>();
  const user = useSupabaseUser();

  const getAuthenticatedUserId = async () => {
    const stateUserId = normalizeUuid(user.value?.id);
    if (stateUserId) return stateUserId;

    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    const authUserId = normalizeUuid(data.user?.id);
    if (!authUserId) {
      throw new Error("Utilisateur non authentifié.");
    }

    return authUserId;
  };

  const getCoachAvailabilities = async (coachId: string) => {
    const normalizedCoachId = normalizeUuid(coachId);
    if (!normalizedCoachId) {
      throw new Error("Identifiant coach invalide.");
    }

    const { data, error } = await client
      .from("coach_availabilities")
      .select("*")
      .eq("coach_id", normalizedCoachId)
      .eq("is_active", true)
      .eq("status", "available")
      .order("start_at", { ascending: true });

    if (error) throw error;
    return data as Availability[];
  };

  const addAvailability = async (availability: AvailabilitySlotInput) => {
    const authenticatedUserId = await getAuthenticatedUserId();

    const { data, error } = await client
      .from("coach_availabilities")
      .insert({
        ...availability,
        coach_id: authenticatedUserId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Availability;
  };

  const addAvailabilitySlots = async (slots: AvailabilitySlotInput[]) => {
    if (!slots.length) return [];

    const authenticatedUserId = await getAuthenticatedUserId();

    const { data, error } = await client
      .from("coach_availabilities")
      .insert(
        slots.map((slot) => ({
          ...slot,
          coach_id: authenticatedUserId,
        })),
      )
      .select();

    if (error) throw error;
    return (data ?? []) as Availability[];
  };

  const updateAvailability = async (
    id: string,
    updates: Partial<Availability>,
  ) => {
    const { data, error } = await client
      .from("coach_availabilities")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Availability;
  };

  const deleteAvailability = async (id: string) => {
    const { error } = await client
      .from("coach_availabilities")
      .delete()
      .eq("id", id);

    if (error) throw error;
  };

  return {
    getCoachAvailabilities,
    addAvailability,
    addAvailabilitySlots,
    updateAvailability,
    deleteAvailability,
  };
};
