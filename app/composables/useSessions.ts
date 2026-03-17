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

  const getSessions = async (role: "coach" | "student") => {
    const authenticatedUserId = await getAuthenticatedUserId();

    const { data, error } = await client
      .from("sessions")
      .select("*")
      .eq(role === "coach" ? "coach_id" : "student_id", authenticatedUserId)
      .order("start_at", { ascending: false });

    if (error) throw error;
    return data;
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
