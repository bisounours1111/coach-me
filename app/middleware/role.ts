export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser();
  const client = useSupabaseClient();
  const { getUserRole } = useProfile();

  const requiredRole = (to.meta.requiredRole ?? null) as
    | "coach"
    | "student"
    | "maintainer"
    | null;

  if (!requiredRole) {
    return;
  }

  if (!user.value) {
    return navigateTo("/auth/login");
  }

  const profileRole = await getUserRole(user.value.id);

  if (requiredRole === "maintainer") {
    if (profileRole === "maintainer") {
      return;
    }
    return navigateTo("/");
  }

  const { data: gameRoles } = await (client as any)
    .from("profile_game_roles")
    .select("is_coach")
    .eq("profile_id", user.value.id);

  const hasAnyGame = Boolean(gameRoles?.length);
  const isCoach = (gameRoles ?? []).some(
    (gameRole: { is_coach: boolean }) => gameRole.is_coach,
  );

  if (requiredRole === "coach" && !isCoach) {
    if (profileRole === "maintainer") {
      return navigateTo("/dashboard/admin");
    }
    if (hasAnyGame) {
      return navigateTo("/dashboard/student");
    }
    return navigateTo("/onboarding/preferences");
  }

  if (requiredRole === "student" && !hasAnyGame) {
    if (profileRole === "maintainer") {
      return navigateTo("/dashboard/admin");
    }
    return navigateTo("/onboarding/preferences");
  }
});
