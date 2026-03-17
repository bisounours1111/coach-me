export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser();
  const { getUserRole } = useProfile();

  const requiredRole = (to.meta.requiredRole ?? null) as "user" | "maintainer";

  if (!requiredRole) {
    return;
  }

  if (!user.value) {
    return navigateTo("/auth/login");
  }

  const profileRole = await getUserRole(user.value.id || user.value.sub);

  if (requiredRole === "maintainer") {
    if (profileRole === "maintainer") {
      return;
    }
    return navigateTo("/");
  }

  if (requiredRole === "user" && !user.value) {
    return navigateTo("/auth/login");
  }
});
