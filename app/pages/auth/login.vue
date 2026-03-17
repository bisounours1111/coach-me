<template>
  <div class="flex min-h-screen items-center justify-center px-4 py-10">
    <AuthCard title="Connexion" subtitle="Accède à ton espace élève ou coach.">
      <AuthForm
        :model-value-email="email"
        :model-value-password="password"
        :loading="loading"
        :error-message="errorMessage"
        @update:model-value-email="email = $event"
        @update:model-value-password="password = $event"
        @submit="onSubmit"
      >
        <template #submit-label>Se connecter</template>
      </AuthForm>

      <p class="mt-4 text-center text-xs text-slate-300/80">
        Pas encore de compte ?
        <NuxtLink
          to="/auth/register"
          class="font-medium text-[#14b8a6] hover:text-[#14b8a6]/90"
        >
          Créer un compte
        </NuxtLink>
      </p>
    </AuthCard>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from "~/composables/useAuth";
import { useProfile } from "~/composables/useProfile";

definePageMeta({ layout: "auth" });

useHead({
  title: "Connexion · CoachMe",
});

const router = useRouter();
const client = useSupabaseClient();
const { signIn } = useAuth();
const { getUserRole } = useProfile();

const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMessage = ref<string | null>(null);

const onSubmit = async () => {
  if (loading.value) return;

  loading.value = true;
  errorMessage.value = null;

  try {
    await signIn(email.value, password.value);
    console.info("[login] signIn success");

    const userFromState = useSupabaseUser().value;
    const user = userFromState?.id
      ? userFromState
      : (await client.auth.getUser()).data.user;
    const role = user?.id ? await getUserRole(user.id) : null;
    console.info("[login] profile loaded", {
      userId: user?.id ?? null,
      email: user?.email ?? null,
      role,
    });

    if (!user?.id) {
      throw new Error("Session introuvable juste après connexion.");
    }

    if (role === "maintainer") {
      await router.push("/dashboard/admin");
      return;
    }

    const { data: gameRoles } = await (client as any)
      .from("profile_game_roles")
      .select("is_coach")
      .eq("profile_id", user.id);

    const hasAnyGame = Boolean(gameRoles?.length);
    const isCoach = (gameRoles ?? []).some(
      (gameRole: { is_coach: boolean }) => gameRole.is_coach,
    );
    console.info("[login] profile_game_roles loaded", {
      userId: user.id,
      gameRolesCount: gameRoles?.length ?? 0,
      hasAnyGame,
      isCoach,
    });

    if (isCoach) {
      await router.push("/dashboard/coach");
    } else if (hasAnyGame) {
      await router.push("/dashboard/student");
    } else {
      await router.push("/onboarding/preferences");
    }
  } catch (err: any) {
    errorMessage.value =
      err?.message || "Impossible de se connecter. Vérifie tes identifiants.";
  } finally {
    loading.value = false;
  }
};
</script>
