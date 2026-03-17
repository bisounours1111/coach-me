<template>
  <div
    class="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
  >
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h2 class="mt-6 text-3xl font-bold tracking-tight text-white">
          Nouveau mot de passe
        </h2>
        <p class="mt-2 text-sm text-slate-400">
          Choisis un nouveau mot de passe pour ton compte.
        </p>
      </div>
      <div
        v-if="!ready && !invalidLink"
        class="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl backdrop-blur-sm text-center text-slate-400"
      >
        Vérification du lien…
      </div>
      <div
        v-else-if="invalidLink"
        class="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl backdrop-blur-sm"
      >
        <p class="text-slate-300">
          Ce lien est invalide ou a déjà été utilisé. Demande un nouveau lien depuis la page « Mot de passe oublié ».
        </p>
        <div class="mt-6">
          <NuxtLink
            to="/auth/forgot-password"
            class="flex w-full justify-center rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Mot de passe oublié
          </NuxtLink>
        </div>
      </div>
      <div
        v-else
        class="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl backdrop-blur-sm"
      >
        <form class="space-y-4" @submit.prevent="onSubmit">
          <AuthPasswordField
            v-model="password"
            class="w-full"
            id="password"
            label="Nouveau mot de passe"
            placeholder="••••••••"
            autocomplete="new-password"
          />
          <AuthPasswordField
            v-model="confirmPassword"
            class="w-full"
            id="confirmPassword"
            label="Confirmer le mot de passe"
            placeholder="••••••••"
            autocomplete="new-password"
          />
          <div
            v-if="errorMessage"
            class="w-full rounded-xl border border-[#f43f5e]/35 bg-[#f43f5e]/10 px-3 py-2 text-xs text-rose-100/90"
          >
            {{ errorMessage }}
          </div>
          <AuthSubmitButton class="w-full" :loading="loading">
            Définir le mot de passe
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
  title: "Nouveau mot de passe · CoachMe",
});

const router = useRouter();
const supabase = useSupabaseClient();
const ready = ref(false);
const invalidLink = ref(false);
const password = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const errorMessage = ref<string | null>(null);

onMounted(async () => {
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const type = params.get("type");

  try {
    if (type === "recovery") {
      const accessToken = params.get("access_token") ?? undefined;
      const refreshToken = params.get("refresh_token") ?? undefined;

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error || !data.session) {
          invalidLink.value = true;
        } else {
          ready.value = true;
        }
      } else {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error || !session) {
          invalidLink.value = true;
        } else {
          ready.value = true;
        }
      }
    } else {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        ready.value = true;
      } else {
        invalidLink.value = true;
      }
    }
  } catch {
    invalidLink.value = true;
  }
});

const onSubmit = async () => {
  if (loading.value) return;
  const p = password.value?.trim() ?? "";
  const c = confirmPassword.value?.trim() ?? "";
  if (p.length < 6) {
    errorMessage.value = "Le mot de passe doit faire au moins 6 caractères.";
    return;
  }
  if (p !== c) {
    errorMessage.value = "Les deux mots de passe ne correspondent pas.";
    return;
  }

  loading.value = true;
  errorMessage.value = null;

  try {
    const { error } = await supabase.auth.updateUser({ password: p });
    if (error) throw error;
    await supabase.auth.signOut();
    await router.push("/auth/login?reset=ok");
  } catch (err: unknown) {
    errorMessage.value =
      (err as { message?: string })?.message ?? "Une erreur est survenue. Réessaie.";
  } finally {
    loading.value = false;
  }
};
</script>
