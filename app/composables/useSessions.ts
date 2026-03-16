import type { SessionListItem, SessionStatus } from "~/types/session";

export const useSessions = () => {
  const client = useSupabaseClient();
  const user = useSupabaseUser();

  const sessions = ref<SessionListItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchAsStudent = async () => {
    if (!user.value?.id) return;
    loading.value = true;
    error.value = null;

    const { data: rawSessions, error: err } = await (client as any)
      .from("sessions")
      .select(
        "id, coach_id, start_at, end_at, duration_minutes, status, price, currency, game, student_notes, created_at",
      )
      .eq("student_id", user.value.id)
      .order("start_at", { ascending: false });

    if (err) {
      error.value = err.message;
      loading.value = false;
      return;
    }

    const coachingIds = [
      ...new Set(
        (rawSessions ?? []).map((s: any) => s.coach_id).filter(Boolean),
      ),
    ];
    const coachByCoachingId = new Map<
      string,
      { id: string; full_name: string | null; avatar_url: string | null }
    >();

    if (coachingIds.length > 0) {
      const { data: coachData } = await (client as any)
        .from("coachings")
        .select("id, profile_game_roles(profiles(id, full_name, avatar_url))")
        .in("id", coachingIds);

      for (const c of coachData ?? []) {
        const profile = c.profile_game_roles?.profiles;
        if (profile) coachByCoachingId.set(c.id, profile);
      }
    }

    sessions.value = (rawSessions ?? []).map((row: any) => ({
      id: row.id,
      startAt: row.start_at,
      endAt: row.end_at ?? null,
      durationMinutes: row.duration_minutes ?? null,
      status: row.status as SessionStatus,
      price: row.price ?? null,
      currency: row.currency ?? "EUR",
      game: row.game ?? null,
      notes: row.student_notes ?? null,
      createdAt: row.created_at,
      otherParty: coachByCoachingId.has(row.coach_id)
        ? {
            id: coachByCoachingId.get(row.coach_id)!.id,
            fullName: coachByCoachingId.get(row.coach_id)!.full_name,
            avatarUrl: coachByCoachingId.get(row.coach_id)!.avatar_url,
          }
        : null,
    }));

    loading.value = false;
  };

  const fetchAsCoach = async () => {
    if (!user.value?.id) return;
    loading.value = true;
    error.value = null;

    const { data: pgRoles } = await (client as any)
      .from("profile_game_roles")
      .select("coachings(id)")
      .eq("profile_id", user.value.id)
      .eq("is_coach", true);

    const coachingIds: string[] = (pgRoles ?? []).flatMap((pgr: any) =>
      (pgr.coachings ?? []).map((c: any) => c.id),
    );

    if (coachingIds.length === 0) {
      sessions.value = [];
      loading.value = false;
      return;
    }

    const { data: rawSessions, error: err } = await (client as any)
      .from("sessions")
      .select(
        "id, student_id, start_at, end_at, duration_minutes, status, price, currency, game, coach_notes, created_at",
      )
      .in("coach_id", coachingIds)
      .order("start_at", { ascending: false });

    if (err) {
      error.value = err.message;
      loading.value = false;
      return;
    }

    const studentIds = [
      ...new Set(
        (rawSessions ?? []).map((s: any) => s.student_id).filter(Boolean),
      ),
    ];
    const studentById = new Map<
      string,
      { id: string; full_name: string | null; avatar_url: string | null }
    >();

    if (studentIds.length > 0) {
      const { data: studentData } = await (client as any)
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", studentIds);

      for (const s of studentData ?? []) {
        studentById.set(s.id, s);
      }
    }

    sessions.value = (rawSessions ?? []).map((row: any) => ({
      id: row.id,
      startAt: row.start_at,
      endAt: row.end_at ?? null,
      durationMinutes: row.duration_minutes ?? null,
      status: row.status as SessionStatus,
      price: row.price ?? null,
      currency: row.currency ?? "EUR",
      game: row.game ?? null,
      notes: row.coach_notes ?? null,
      createdAt: row.created_at,
      otherParty: studentById.has(row.student_id)
        ? {
            id: studentById.get(row.student_id)!.id,
            fullName: studentById.get(row.student_id)!.full_name,
            avatarUrl: studentById.get(row.student_id)!.avatar_url,
          }
        : null,
    }));

    loading.value = false;
  };

  return { sessions, loading, error, fetchAsStudent, fetchAsCoach };
};
