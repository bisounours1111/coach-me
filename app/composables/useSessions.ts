export type SessionStatus =
  | "pending"
  | "negotiating"
  | "accepted"
  | "rejected"
  | "paid"
  | "upcoming"
  | "done"
  | "canceled";

export interface Session {
  id: string;
  coach_id: string;
  student_id: string;
  start_at: string;
  end_at: string | null;
  duration_minutes: number;
  status: SessionStatus;
  price: number;
  negotiated_price: number | null;
  currency: string;
  student_notes: string | null;
  coach_notes: string | null;
  game: string | null;
  created_at: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeUuid = (value: unknown): string | null => {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "undefined" || raw === "null") return null;
  return UUID_REGEX.test(raw) ? raw : null;
};

export const useSessions = () => {
  const client = useSupabaseClient<any>();
  const user = useSupabaseUser();

  const getAuthenticatedUserId = async () => {
    const stateUserId = normalizeUuid(user.value?.id);
    if (stateUserId) return stateUserId;

    const { data, error } = await client.auth.getUser();
    if (error) throw error;

    const authUserId = normalizeUuid(data.user?.id);
    if (!authUserId) {
      throw new Error("User not authenticated");
    }

    return authUserId;
  };

  const getCoachCoachingIds = async (coachProfileId: string) => {
    const { data: roles, error: rolesError } = await client
      .from("profile_game_roles")
      .select("id")
      .eq("profile_id", coachProfileId)
      .eq("is_coach", true);

    if (rolesError) throw rolesError;

    const roleIds = (roles ?? []).map((r: any) => r.id).filter(Boolean);
    if (roleIds.length === 0) return [];

    const { data: coachings, error: coachingsError } = await client
      .from("coachings")
      .select("id")
      .in("profile_game_role_id", roleIds);

    if (coachingsError) throw coachingsError;
    return (coachings ?? []).map((c: any) => c.id).filter(Boolean);
  };

  /** Enrichit les sessions élève avec le nom du coach (coach_id → coachings → profile_game_roles → profiles). */
  const enrichSessionsWithCoachName = async (
    sessions: any[],
  ): Promise<any[]> => {
    const coachIds = [...new Set((sessions ?? []).map((s) => s.coach_id).filter(Boolean))];
    if (coachIds.length === 0) return sessions;

    const { data: coachings, error: e1 } = await client
      .from("coachings")
      .select("id, profile_game_role_id")
      .in("id", coachIds);
    if (e1 || !coachings?.length) return sessions;

    const pgrIds = coachings.map((c: any) => c.profile_game_role_id).filter(Boolean);
    const { data: pgrs, error: e2 } = await client
      .from("profile_game_roles")
      .select("id, profile_id")
      .in("id", pgrIds);
    if (e2 || !pgrs?.length) return sessions;

    const profileIds = pgrs.map((p: any) => p.profile_id).filter(Boolean);
    const { data: profiles, error: e3 } = await client
      .from("profiles")
      .select("id, full_name")
      .in("id", profileIds);
    if (e3 || !profiles?.length) return sessions;

    const pgrByPgrId = Object.fromEntries((pgrs as any[]).map((p) => [p.id, p.profile_id]));
    const nameByProfileId = Object.fromEntries(
      (profiles as any[]).map((p) => [p.id, String(p.full_name ?? "").trim() || "Coach"]),
    );
    const coachIdToProfileId = Object.fromEntries(
      (coachings as any[]).map((c) => [c.id, pgrByPgrId[c.profile_game_role_id]]),
    );
    const coachNameByCoachId: Record<string, string> = {};
    for (const [cid, pid] of Object.entries(coachIdToProfileId)) {
      if (pid) coachNameByCoachId[cid] = nameByProfileId[pid] ?? "Coach";
    }

    return sessions.map((s) => ({
      ...s,
      coach_name: coachNameByCoachId[s.coach_id] ?? "—",
    }));
  };

  /** Enrichit les sessions coach avec le nom de l'apprenti (student_id = profiles.id). */
  const enrichSessionsWithStudentName = async (
    sessions: any[],
  ): Promise<any[]> => {
    const studentIds = [...new Set((sessions ?? []).map((s) => s.student_id).filter(Boolean))];
    if (studentIds.length === 0) return sessions;

    const { data: profiles, error } = await client
      .from("profiles")
      .select("id, full_name")
      .in("id", studentIds);
    if (error || !profiles?.length) return sessions;

    const nameById = Object.fromEntries(
      (profiles as any[]).map((p) => [p.id, String(p.full_name ?? "").trim() || "Apprenti"]),
    );
    return sessions.map((s) => ({
      ...s,
      student_name: nameById[s.student_id] ?? "—",
    }));
  };

  const getSessions = async (role: "coach" | "student") => {
    const authenticatedUserId = await getAuthenticatedUserId();

    if (role === "student") {
      const { data, error } = await client
        .from("sessions")
        .select("*")
        .eq("student_id", authenticatedUserId)
        .order("start_at", { ascending: false });

      if (error) throw error;
      const list = data ?? [];
      return await enrichSessionsWithCoachName(list);
    }

    // coach_id référence public.coachings(id)
    const coachingIds = await getCoachCoachingIds(authenticatedUserId);
    if (coachingIds.length === 0) return [];

    const { data, error } = await client
      .from("sessions")
      .select("*")
      .in("coach_id", coachingIds)
      .order("start_at", { ascending: false });

    if (error) throw error;
    const list = data ?? [];
    return await enrichSessionsWithStudentName(list);
  };

  const createSessionRequest = async (
    session: Omit<
      Session,
      "id" | "status" | "created_at" | "negotiated_price" | "student_id"
    >,
  ) => {
    const authenticatedUserId = await getAuthenticatedUserId();

    const { data, error } = await client
      .from("sessions")
      .insert({
        ...session,
        student_id: authenticatedUserId,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const updateSessionStatus = async (
    sessionId: string,
    status: SessionStatus,
    negotiatedPrice?: number,
  ) => {
    const updates: any = { status };
    if (negotiatedPrice !== undefined) {
      updates.negotiated_price = negotiatedPrice;
    }

    const { data, error } = await client
      .from("sessions")
      .update(updates)
      .eq("id", sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  return {
    getSessions,
    createSessionRequest,
    updateSessionStatus,
  };
};
