export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser();
  const client = useSupabaseClient();
  const resolvedUser = user.value?.id ? user.value : (await client.auth.getUser()).data.user;

  if (!resolvedUser?.id) {
    console.warn("[auth middleware] no user session");
    return abortNavigation(
      createError({
        statusCode: 401,
        statusMessage: "Connecte toi",
        message: "Connecte toi",
      }),
    );
  }

  console.info("[auth middleware] user session ok", {
    userId: resolvedUser.id,
    email: resolvedUser.email ?? null,
  });
});
