<template>
  <div
    class="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
  >
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h2 class="mt-6 text-3xl font-bold tracking-tight text-white">
          Créer un compte
        </h2>
      </div>

      <div
        class="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl backdrop-blur-sm"
      >
        <AuthRegisterForm />

        <p class="mt-4 text-center text-xs text-slate-500">
          En créant un compte, vous acceptez notre
          <NuxtLink to="/legal/privacy" class="text-teal-400 hover:underline">politique de confidentialité</NuxtLink>.
          Vos données (profil, messages, réservations) sont conservées conformément au RGPD.
        </p>

        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-slate-800"></div>
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="bg-slate-900 px-2 text-slate-500"
                >Déjà inscrit ?</span
              >
            </div>
          </div>

          <div class="mt-6">
            <NuxtLink
              to="/auth/login"
              class="flex w-full justify-center rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 hover:border-slate-600"
            >
              Se connecter
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
  title: "Créer un compte · CoachMe",
});
</script>
