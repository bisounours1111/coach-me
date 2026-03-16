export interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  student: {
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
}

export const useReviews = () => {
  const client = useSupabaseClient();

  const fetchReviewsForProfile = async (
    profileId: string,
  ): Promise<ReviewItem[]> => {
    const { data: pgRoles } = await (client as any)
      .from("profile_game_roles")
      .select("coachings(id)")
      .eq("profile_id", profileId)
      .eq("is_coach", true);

    const coachingIds: string[] = (pgRoles ?? []).flatMap((pgr: any) =>
      (pgr.coachings ?? []).map((c: any) => c.id),
    );

    if (!coachingIds.length) return [];

    const { data: rawReviews } = await (client as any)
      .from("reviews")
      .select("id, rating, comment, created_at, student_id")
      .in("coach_id", coachingIds)
      .order("created_at", { ascending: false });

    if (!rawReviews?.length) return [];

    const studentIds = [
      ...new Set((rawReviews as any[]).map((r) => r.student_id).filter(Boolean)),
    ];

    const studentById = new Map<
      string,
      { full_name: string | null; avatar_url: string | null }
    >();

    if (studentIds.length) {
      const { data: students } = await (client as any)
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", studentIds);

      for (const s of students ?? []) {
        studentById.set(s.id, s);
      }
    }

    return (rawReviews as any[]).map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment ?? null,
      createdAt: r.created_at,
      student: studentById.has(r.student_id)
        ? {
            fullName: studentById.get(r.student_id)!.full_name,
            avatarUrl: studentById.get(r.student_id)!.avatar_url,
          }
        : null,
    }));
  };

  return { fetchReviewsForProfile };
};
