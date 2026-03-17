export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser();
  const client = useSupabaseClient();
  const { getUserRole } = useProfile();

  let userId = user.value?.id || user.value?.sub;
  if (!userId) {
    const { data } = await client.auth.getUser();
    userId = data.user?.id || (data.user as any)?.sub;
  }

  if (!userId) {
    return navigateTo("/games");
  }

  const { data: gameRoles } = await (client as any)
    .from("profile_game_roles")
    .select("is_coach")
    .eq("profile_id", userId);

  const isCoach = (gameRoles ?? []).some(
    (gameRole: { is_coach: boolean }) => gameRole.is_coach,
  );

  if (isCoach) {
    return;
  }

  return navigateTo("/preferences");
});
