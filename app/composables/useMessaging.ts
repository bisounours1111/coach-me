export type ConversationRow = {
  id: string;
  student_id: string;
  coach_id: string;
  created_at: string;
  updated_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

export type ConversationWithOther = ConversationRow & {
  other: { id: string; full_name: string | null; avatar_url: string | null };
  lastMessage?: { content: string; created_at: string } | null;
};

export type MessageWithSender = MessageRow & {
  sender: { id: string; full_name: string | null; avatar_url: string | null };
};

export const useMessaging = () => {
  const client = useSupabaseClient();
  const user = useSupabaseUser();

  const authUserId = ref<string | null>(null);

  const ensureUserId = async (): Promise<string | null> => {
    const u = user.value as any;
    const direct = u?.id ?? u?.sub ?? authUserId.value;
    if (direct) return String(direct);
    const { data } = await (client as any).auth.getUser();
    const fetched = (data?.user as any)?.id ?? (data?.user as any)?.sub ?? null;
    authUserId.value = fetched ? String(fetched) : null;
    return authUserId.value;
  };

  onMounted(async () => {
    await ensureUserId();
  });

  const getCurrentUserId = (): string | null => {
    const u = user.value as any;
    const v = u?.id ?? u?.sub ?? authUserId.value;
    return v ? String(v) : null;
  };

  /** Crée ou récupère la conversation entre l'utilisateur connecté (élève) et un coach */
  const getOrCreateConversation = async (
    coachId: string,
  ): Promise<{ id: string } | null> => {
    const uid = await ensureUserId();
    if (!uid) return null;
    if (uid === coachId) return null;

    const { data, error } = await (client as any)
      .from("conversations")
      .upsert(
        { student_id: uid, coach_id: coachId },
        { onConflict: "student_id,coach_id" },
      )
      .select("id")
      .single();

    if (error) throw error;
    return data ? { id: data.id } : null;
  };

  /** Liste les conversations de l'utilisateur (élève ou coach) avec l'autre profil et dernier message */
  const listConversations = async (): Promise<ConversationWithOther[]> => {
    const uid = getCurrentUserId();
    if (!uid) return [];

    const { data: rows, error } = await (client as any)
      .from("conversations")
      .select(
        "id, student_id, coach_id, created_at, updated_at, student:profiles!student_id(id, full_name, avatar_url), coach:profiles!coach_id(id, full_name, avatar_url)",
      )
      .or(`student_id.eq.${uid},coach_id.eq.${uid}`)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    const list = (rows ?? []) as Array<Record<string, any>>;

    const withOther: ConversationWithOther[] = [];
    for (const row of list) {
      const isStudent = row.student_id === uid;
      const otherProfile = isStudent ? row.coach : row.student;
      const other = otherProfile
        ? {
            id: String(otherProfile.id),
            full_name: otherProfile.full_name ?? null,
            avatar_url: otherProfile.avatar_url ?? null,
          }
        : { id: "", full_name: null, avatar_url: null };

      withOther.push({
        id: row.id,
        student_id: row.student_id,
        coach_id: row.coach_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        other,
        lastMessage: undefined,
      });
    }

    if (withOther.length === 0) return withOther;

    const convIds = withOther.map((c) => c.id);
    const { data: lastMessages } = await (client as any)
      .from("messages")
      .select("conversation_id, content, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false });

    const lastByConv = new Map<string, { content: string; created_at: string }>();
    for (const m of (lastMessages ?? []) as Array<Record<string, any>>) {
      if (!lastByConv.has(m.conversation_id)) {
        lastByConv.set(m.conversation_id, {
          content: m.content,
          created_at: m.created_at,
        });
      }
    }
    withOther.forEach((c) => {
      c.lastMessage = lastByConv.get(c.id) ?? null;
    });

    return withOther;
  };

  /** Messages d'une conversation avec infos expéditeur */
  const getMessages = async (
    conversationId: string,
  ): Promise<MessageWithSender[]> => {
    const { data, error } = await (client as any)
      .from("messages")
      .select(
        "id, conversation_id, sender_id, content, read_at, created_at, sender:profiles!sender_id(id, full_name, avatar_url)",
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return ((data ?? []) as Array<Record<string, any>>).map((row) => ({
      id: row.id,
      conversation_id: row.conversation_id,
      sender_id: row.sender_id,
      content: row.content,
      read_at: row.read_at,
      created_at: row.created_at,
      sender: row.sender
        ? {
            id: String(row.sender.id),
            full_name: row.sender.full_name ?? null,
            avatar_url: row.sender.avatar_url ?? null,
          }
        : { id: "", full_name: null, avatar_url: null },
    }));
  };

  const sendMessage = async (
    conversationId: string,
    content: string,
  ): Promise<MessageWithSender | null> => {
    const uid = getCurrentUserId();
    if (!uid || !content.trim()) return null;

    const { data, error } = await (client as any)
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: uid,
        content: content.trim(),
      })
      .select(
        "id, conversation_id, sender_id, content, read_at, created_at, sender:profiles!sender_id(id, full_name, avatar_url)",
      )
      .single();

    if (error) throw error;
    const row = data as Record<string, any>;
    return row
      ? {
          id: row.id,
          conversation_id: row.conversation_id,
          sender_id: row.sender_id,
          content: row.content,
          read_at: row.read_at,
          created_at: row.created_at,
          sender: row.sender
            ? {
                id: String(row.sender.id),
                full_name: row.sender.full_name ?? null,
                avatar_url: row.sender.avatar_url ?? null,
              }
            : { id: "", full_name: null, avatar_url: null },
        }
      : null;
  };

  /** Abonnement Realtime aux nouveaux messages d'une conversation */
  const subscribeToMessages = (
    conversationId: string,
    onMessage: (payload: { new: MessageRow }) => void,
  ) => {
    const ch = (client as any).channel(`messages:${conversationId}`);
    ch.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: { new: MessageRow }) => onMessage(payload),
    ).subscribe();

    return () => {
      (client as any).removeChannel(ch);
    };
  };

  return {
    getCurrentUserId,
    getOrCreateConversation,
    listConversations,
    getMessages,
    sendMessage,
    subscribeToMessages,
  };
};
