<template>
  <div
    class="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
  >
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h2 class="mt-6 text-3xl font-bold tracking-tight text-white">
          Se connecter
        </h2>
      </div>
      <div
        class="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl backdrop-blur-sm"
      >
        <AuthForm
          class="flex flex-col items-center"
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

        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-slate-800"></div>
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="bg-slate-900 px-2 text-slate-500"
                >Nouveau sur CoachMe ?</span
              >
            </div>
          </div>

          <div class="mt-6">
            <NuxtLink
              to="/auth/register"
              class="flex w-full cursor-pointer justify-center rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 hover:border-slate-600"
            >
              Créer un compte
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Suppression de definePageMeta pour utiliser le layout par défaut (default.vue)
// definePageMeta({ layout: "auth" });

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

    if (!user?.id) {
      throw new Error("Session introuvable juste après connexion.");
    }

    // Le middleware onboarding s'occupera de rediriger si nécessaire
    // On redirige vers /games par défaut après le login
    await router.push("/games");
    return;
  } catch (err: any) {
    errorMessage.value =
      err?.message || "Impossible de se connecter. Vérifie tes identifiants.";
  } finally {
    loading.value = false;
  }
};
</script>
