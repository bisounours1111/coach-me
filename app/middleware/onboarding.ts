export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser();
  const client = useSupabaseClient();

  if (!user.value) {
    return navigateTo("/auth/login");
  }

  // Si on est déjà sur la page d'édition du profil, on ne fait rien pour éviter une boucle
  if (to.path === "/profile/edit") {
    return;
  }

  const userId = user.value.id || user.value.sub;

  // Vérifier si l'utilisateur a au moins un rôle de jeu configuré
  const { data: gameRoles, error } = await (client as any)
    .from("profile_game_roles")
    .select("id")
    .eq("profile_id", userId)
    .limit(1);

  if (error) {
    console.error("[onboarding middleware] Error checking game roles:", error);
    return;
  }

  // Si aucun jeu n'est configuré, on redirige vers /profile/edit
  if (!gameRoles || gameRoles.length === 0) {
    return navigateTo("/profile/edit");
  }
});
