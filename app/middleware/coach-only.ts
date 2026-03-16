import { useProfile } from "~/composables/useProfile";

export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser();
  const client = useSupabaseClient();
  const { getUserRole } = useProfile();
  const resolvedUser = user.value?.id ? user.value : (await client.auth.getUser()).data.user;

  if (!resolvedUser?.id) {
    console.warn("[coach-only middleware] no user session");
    return abortNavigation(
      createError({
        statusCode: 401,
        statusMessage: "Connecte toi",
        message: "Connecte toi",
      }),
    );
  }

  const role = await getUserRole(resolvedUser.id);

  const { data: gameRoles } = await (client as any)
    .from("profile_game_roles")
    .select("is_coach")
    .eq("profile_id", resolvedUser.id);

  const hasAnyGame = Boolean(gameRoles?.length);
  const isCoach = (gameRoles ?? []).some((gameRole: { is_coach: boolean }) => gameRole.is_coach);
  console.info("[coach-only middleware] profile_game_roles loaded", {
    userId: resolvedUser.id,
    profileRole: role,
    gameRolesCount: gameRoles?.length ?? 0,
    hasAnyGame,
    isCoach,
  });

  if (!isCoach && role !== "maintainer") {
    return abortNavigation(
      createError({
        statusCode: 403,
        statusMessage: "Permissions insuffisantes",
        message: "Permissions insuffisantes: cette page est réservée aux coachs.",
      }),
    );
  }
});
