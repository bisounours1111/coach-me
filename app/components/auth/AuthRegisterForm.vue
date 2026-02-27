<template>
  <div>
    <form class="space-y-4" @submit.prevent="onSubmit">
      <AuthTextField
        v-model="email"
        id="register-email"
        label="Email"
        type="email"
        inputmode="email"
        placeholder="toi@example.com"
        autocomplete="email"
        hint="On l’utilise uniquement pour la connexion et la récupération."
      />

      <AuthPasswordField
        :model-value="password"
        label="Mot de passe"
        id="register-password"
        autocomplete="new-password"
        hint="Minimum 6 caractères."
        @update:model-value="password = $event"
      />

      <AuthPasswordField
        :model-value="passwordConfirm"
        label="Confirmer le mot de passe"
        id="register-password-confirm"
        autocomplete="new-password"
        @update:model-value="passwordConfirm = $event"
      />

      <AuthSubmitButton :loading="loading">
        Créer mon compte
      </AuthSubmitButton>

      <div
        v-if="successMessage"
        class="rounded-xl border border-[#14b8a6]/35 bg-[#14b8a6]/10 px-3 py-2 text-xs text-emerald-100/90"
      >
        {{ successMessage }}
      </div>

      <div
        v-if="errorMessage"
        class="rounded-xl border border-[#f43f5e]/35 bg-[#f43f5e]/10 px-3 py-2 text-xs text-rose-100/90"
      >
        {{ errorMessage }}
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const client = useSupabaseClient();
const router = useRouter();

const email = ref("");
const password = ref("");
const passwordConfirm = ref("");

const loading = ref(false);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const onSubmit = async () => {
  if (loading.value) return;

  errorMessage.value = null;
  successMessage.value = null;

  if (password.value.length < 6) {
    errorMessage.value = "Le mot de passe doit contenir au moins 6 caractères.";
    return;
  }

  if (password.value !== passwordConfirm.value) {
    errorMessage.value = "Les mots de passe ne correspondent pas.";
    return;
  }

  loading.value = true;

  const { error } = await client.auth.signUp({
    email: email.value,
    password: password.value,
  });

  loading.value = false;

  if (error) {
    errorMessage.value = error.message || "Impossible de créer le compte.";
    return;
  }

  successMessage.value =
    "Compte créé. Vérifie tes emails si une confirmation est requise.";

  await router.push("/onboarding/preferences");
};
</script>
