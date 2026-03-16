import type { UserRole } from "../types/auth";

export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser();
  const { getUserRole } = useProfile();

  const requiredRole = (to.meta.requiredRole ?? null) as UserRole | null;

  if (!requiredRole) {
    return;
  }

  if (!user.value) {
    return navigateTo("/auth/login");
  }

  const role = await getUserRole(user.value.id);

  if (role !== requiredRole) {
    // Redirige vers le bon dashboard si possible
    if (role === "coach") {
      return navigateTo("/dashboard/coach");
    }
    if (role === "student") {
      return navigateTo("/dashboard/student");
    }

    return navigateTo("/");
  }
});

