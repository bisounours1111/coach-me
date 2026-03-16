<template>
  <div>
    <form class="space-y-4" @submit.prevent="onSubmit">
      <div class="space-y-1.5">
        <p class="text-xs font-medium text-slate-200/90">Je suis</p>
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-xl border bg-[#0b0f19]/45 p-4 text-left text-sm backdrop-blur transition"
            :class="
              role === 'student'
                ? 'border-[#14b8a6]/55 shadow-[0_0_0_4px_rgba(20,184,166,0.10)]'
                : 'border-white/10 hover:border-white/20'
            "
            @click="role = 'student'"
          >
            <p class="font-semibold text-slate-50">Élève</p>
            <p class="mt-1 text-[0.7rem] text-slate-200/60">
              Pour être coaché et suivre tes progrès.
            </p>
          </button>
          <button
            type="button"
            class="rounded-xl border bg-[#0b0f19]/45 p-4 text-left text-sm backdrop-blur transition"
            :class="
              role === 'coach'
                ? 'border-[#6366f1]/55 shadow-[0_0_0_4px_rgba(99,102,241,0.10)]'
                : 'border-white/10 hover:border-white/20'
            "
            @click="role = 'coach'"
          >
            <p class="font-semibold text-slate-50">Coach</p>
            <p class="mt-1 text-[0.7rem] text-slate-200/60">
              Pour accompagner des joueurs sur leurs jeux.
            </p>
          </button>
        </div>
      </div>
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

      <AuthSubmitButton :loading="loading"> Créer mon compte </AuthSubmitButton>

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
const router = useRouter();
const { signUp, loading, error } = useAuth();

const email = ref("");
const password = ref("");
const passwordConfirm = ref("");
const role = ref<"student" | "coach">("student");

const errorMessage = computed(() => error.value);
const successMessage = ref<string | null>(null);

const onSubmit = async () => {
  if (loading.value) return;

  successMessage.value = null;

  if (password.value.length < 6) {
    error.value = "Le mot de passe doit contenir au moins 6 caractères.";
    return;
  }

  if (password.value !== passwordConfirm.value) {
    error.value = "Les mots de passe ne correspondent pas.";
    return;
  }

  try {
    await signUp(email.value, password.value, role.value);
    successMessage.value =
      "Compte créé. Vérifie tes emails si une confirmation est requise.";
    await router.push("/onboarding/preferences");
  } catch {
    // l'erreur est déjà gérée dans le composable
  }
};
</script>
