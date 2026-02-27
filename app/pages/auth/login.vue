<template>
  <div class="flex min-h-screen items-center justify-center px-4 py-10">
    <AuthCard
      title="Connexion"
      subtitle="Accède à ton espace élève ou coach."
    >
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
        <NuxtLink to="/auth/register" class="font-medium text-[#14b8a6] hover:text-[#14b8a6]/90">
          Créer un compte
        </NuxtLink>
      </p>
    </AuthCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "auth" });

useHead({
  title: "Connexion · CoachMe",
});

const client = useSupabaseClient();
const router = useRouter();

const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMessage = ref<string | null>(null);

const onSubmit = async () => {
  if (loading.value) return;

  loading.value = true;
  errorMessage.value = null;

  const { error } = await client.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  });

  loading.value = false;

  if (error) {
    errorMessage.value = error.message || "Impossible de se connecter. Vérifie tes identifiants.";
    return;
  }

  // TODO: une fois les rôles / profils en place, rediriger selon le rôle (élève / coach).
  await router.push("/");
};
</script>

