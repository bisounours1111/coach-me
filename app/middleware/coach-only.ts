export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser();
  const client = useSupabaseClient();
  const { getUserRole } = useProfile();

  console.log(
    "[Middleware:coach-only] Vérification d'accès pour:",
    useRoute().path,
  );

  // 1. Récupération robuste de l'ID (SSR friendly)
  let userId = user.value?.id;
  if (!userId) {
    const { data } = await client.auth.getUser();
    userId = data.user?.id;
  }

  if (!userId) {
    console.log(
      "[Middleware:coach-only] Aucun utilisateur trouvé, redirection vers login",
    );
    return navigateTo("/auth/login");
  }

  // 2. Vérification du rôle global
  const role = await getUserRole(userId);
  console.log("[Middleware:coach-only] Rôle détecté:", role);

  if (role === "maintainer" || role === "coach") {
    console.log("[Middleware:coach-only] Accès AUTORISÉ (rôle)");
    return;
  }

  // 3. Vérification des rôles par jeu (fallback)
  const { data: gameRoles } = await (client as any)
    .from("profile_game_roles")
    .select("is_coach")
    .eq("profile_id", userId);

  const isCoach = (gameRoles ?? []).some(
    (gameRole: { is_coach: boolean }) => gameRole.is_coach,
  );
  console.log("[Middleware:coach-only] Coach via jeux:", isCoach);

  if (isCoach) {
    console.log("[Middleware:coach-only] Accès AUTORISÉ (jeux)");
    return;
  }

  // 4. Refus d'accès
  console.log("[Middleware:coach-only] Accès REFUSÉ, redirection...");
  if (role === "student") {
    return navigateTo("/dashboard/student");
  }
  return navigateTo("/");
});
