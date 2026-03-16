export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser();
  const { getUserRole } = useProfile();

  if (!user.value) {
    return navigateTo("/auth/login");
  }

  const role = await getUserRole(user.value.id);

  if (role !== "coach") {
    if (role === "student") {
      return navigateTo("/dashboard/student");
    }
    return navigateTo("/");
  }
});

