<template>
  <form
    class="space-y-4 w-full flex flex-col items-center"
    @submit.prevent="onSubmit"
  >
    <AuthTextField
      class="w-full"
      v-model="username"
      id="register-username"
      label="Nom d'utilisateur"
      type="text"
      placeholder="Ton pseudo"
      autocomplete="username"
    />

    <AuthTextField
      class="w-full"
      v-model="email"
      id="register-email"
      label="Email"
      type="email"
      inputmode="email"
      placeholder="toi@example.com"
      autocomplete="email"
    />

    <AuthPasswordField
      class="w-full"
      :model-value="password"
      label="Mot de passe"
      id="register-password"
      autocomplete="new-password"
      hint="Minimum 6 caractères."
      @update:model-value="password = $event"
    />

    <AuthPasswordField
      class="w-full"
      :model-value="passwordConfirm"
      label="Confirmer le mot de passe"
      id="register-password-confirm"
      autocomplete="new-password"
      @update:model-value="passwordConfirm = $event"
    />

    <AuthSubmitButton class="w-full" :loading="loading">
      Créer mon compte
    </AuthSubmitButton>

    <div
      v-if="successMessage"
      class="w-full rounded-xl border border-[#14b8a6]/35 bg-[#14b8a6]/10 px-3 py-2 text-xs text-emerald-100/90"
    >
      {{ successMessage }}
    </div>

    <div
      v-if="errorMessage"
      class="w-full rounded-xl border border-[#f43f5e]/35 bg-[#f43f5e]/10 px-3 py-2 text-xs text-rose-100/90"
    >
      {{ errorMessage }}
    </div>
  </form>
</template>

<script setup lang="ts">
const router = useRouter();
const { signUp, loading, error } = useAuth();

const email = ref("");
const username = ref("");
const password = ref("");
const passwordConfirm = ref("");

const errorMessage = computed(() => error.value);
const successMessage = ref<string | null>(null);

const onSubmit = async () => {
  if (loading.value) return;

  successMessage.value = null;

  if (!username.value.trim()) {
    error.value = "Le nom d'utilisateur est requis.";
    return;
  }

  if (password.value.length < 6) {
    error.value = "Le mot de passe doit contenir au moins 6 caractères.";
    return;
  }

  if (password.value !== passwordConfirm.value) {
    error.value = "Les mots de passe ne correspondent pas.";
    return;
  }

  try {
    // On passe 'student' par défaut et le username
    await signUp(email.value, password.value, "student", username.value.trim());
    successMessage.value =
      "Compte créé. Vérifie tes emails si une confirmation est requise.";
    await router.push("/onboarding/preferences");
  } catch {
    // l'erreur est déjà gérée dans le composable
  }
};
</script>
