<template>
  <div
    class="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
  >
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h2 class="mt-6 text-3xl font-bold tracking-tight text-white">
          Mot de passe oublié
        </h2>
        <p class="mt-2 text-sm text-slate-400">
          Saisis ton email pour recevoir un lien de réinitialisation.
        </p>
      </div>
      <div
        class="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl backdrop-blur-sm"
      >
        <form class="space-y-4" @submit.prevent="onSubmit">
          <AuthTextField
            v-model="email"
            class="w-full"
            id="email"
            label="Email"
            type="email"
            inputmode="email"
            placeholder="toi@example.com"
            autocomplete="email"
          />
          <div
            v-if="errorMessage"
            class="w-full rounded-xl border border-[#f43f5e]/35 bg-[#f43f5e]/10 px-3 py-2 text-xs text-rose-100/90"
          >
            {{ errorMessage }}
          </div>
          <div
            v-if="successMessage"
            class="w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100/90"
          >
            {{ successMessage }}
          </div>
          <AuthSubmitButton class="w-full" :loading="loading">
            Envoyer le lien
          </AuthSubmitButton>
        </form>

        <div class="mt-6">
          <NuxtLink
            to="/auth/login"
            class="flex w-full justify-center rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 hover:border-slate-600"
          >
            Retour à la connexion
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: "Mot de passe oublié · CoachMe",
});

const supabase = useSupabaseClient();
const email = ref("");
const loading = ref(false);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const onSubmit = async () => {
  if (loading.value) return;
  const trimmed = email.value?.trim();
  if (!trimmed) {
    errorMessage.value = "Saisis ton adresse email.";
    return;
  }

  loading.value = true;
  errorMessage.value = null;
  successMessage.value = null;

  try {
    const { data, error } = await supabase.functions.invoke<{ message?: string }>(
      "send-password-recovery",
      { body: { email: trimmed } },
    );
    if (error) throw error;
    successMessage.value =
      data?.message ??
      "Si un compte existe pour cette adresse, un email de réinitialisation a été envoyé.";
  } catch (err: unknown) {
    errorMessage.value =
      (err as { message?: string })?.message ?? "Une erreur est survenue. Réessaie.";
  } finally {
    loading.value = false;
  }
};
</script>
