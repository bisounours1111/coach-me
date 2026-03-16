import { useProfile } from "~/composables/useProfile";

export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser();
  const client = useSupabaseClient();
  const { getUserRole } = useProfile();
  const resolvedUser = user.value?.id ? user.value : (await client.auth.getUser()).data.user;

  const requiredRole = (to.meta.requiredRole ?? null) as "coach" | "student" | "maintainer" | null;

  if (!requiredRole) {
    return;
  }

  if (!resolvedUser?.id) {
    console.warn("[role middleware] no user session", {
      path: to.path,
      requiredRole,
    });
    return abortNavigation(
      createError({
        statusCode: 401,
        statusMessage: "Connecte toi",
        message: "Connecte toi",
      }),
    );
  }

  const profileRole = await getUserRole(resolvedUser.id);

  if (requiredRole === "maintainer") {
    if (profileRole === "maintainer") {
      console.info("[role middleware] access granted", {
        path: to.path,
        requiredRole,
        userId: resolvedUser.id,
        profileRole,
      });
      return;
    }
    console.warn("[role middleware] access denied", {
      path: to.path,
      requiredRole,
      userId: resolvedUser.id,
      profileRole,
    });
    return abortNavigation(
      createError({
        statusCode: 403,
        statusMessage: "Permissions insuffisantes",
        message: "Permissions insuffisantes: accès admin réservé aux maintainers.",
      }),
    );
  }

  const { data: gameRoles } = await (client as any)
    .from("profile_game_roles")
    .select("is_coach")
    .eq("profile_id", resolvedUser.id);

  const hasAnyGame = Boolean(gameRoles?.length);
  const isCoach = (gameRoles ?? []).some((gameRole: { is_coach: boolean }) => gameRole.is_coach);
  console.info("[role middleware] profile_game_roles loaded", {
    path: to.path,
    requiredRole,
    userId: resolvedUser.id,
    profileRole,
    gameRolesCount: gameRoles?.length ?? 0,
    hasAnyGame,
    isCoach,
  });

  if (requiredRole === "coach" && !isCoach) {
    return abortNavigation(
      createError({
        statusCode: 403,
        statusMessage: "Permissions insuffisantes",
        message: "Permissions insuffisantes: aucun jeu avec statut coach pour ce compte.",
      }),
    );
  }

  if (requiredRole === "student" && !hasAnyGame) {
    return abortNavigation(
      createError({
        statusCode: 403,
        statusMessage: "Permissions insuffisantes",
        message: "Permissions insuffisantes: aucune préférence de jeu trouvée pour ce compte.",
      }),
    );
  }
});
