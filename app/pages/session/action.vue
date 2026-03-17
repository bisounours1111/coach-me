<script setup lang="ts">
/**
 * Page de retour après clic sur « Confirmer » ou « Annuler » dans le mail coach.
 * Appelée en redirect depuis l’Edge Function session-action (?result=confirmed | result=canceled).
 */
definePageMeta({
  layout: "default",
  auth: false,
});

const route = useRoute();
const result = computed(() => {
  const r = String(route.query.result ?? "").toLowerCase();
  return r === "confirmed" || r === "canceled" ? r : null;
});

const isConfirmed = computed(() => result.value === "confirmed");
const isCanceled = computed(() => result.value === "canceled");
const isValid = computed(() => result.value !== null);

useHead({
  title: () =>
    result.value === "confirmed"
      ? "Session confirmée · CoachMe"
      : result.value === "canceled"
        ? "Session annulée · CoachMe"
        : "Résultat · CoachMe",
});
</script>

<template>
  <div class="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16">
    <!-- Lien invalide ou expiré -->
    <div
      v-if="!isValid"
      class="w-full rounded-3xl border border-amber-500/20 bg-amber-500/5 p-8 text-center"
    >
      <div
        class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10"
      >
        <UIcon name="i-heroicons-exclamation-triangle" class="h-8 w-8 text-amber-400" />
      </div>
      <h1 class="text-xl font-black text-white">
        Lien invalide ou expiré
      </h1>
      <p class="mt-2 text-sm text-slate-400">
        Ce lien a expiré ou a déjà été utilisé.
      </p>
      <NuxtLink
        to="/"
        class="mt-8 inline-flex items-center gap-2 rounded-2xl bg-teal-500 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-teal-400"
      >
        Retour à l’accueil
        <UIcon name="i-heroicons-arrow-right" class="h-4 w-4" />
      </NuxtLink>
    </div>

    <!-- Session confirmée -->
    <div
      v-else-if="isConfirmed"
      class="w-full rounded-3xl border border-white/5 bg-white/[0.02] p-8 text-center"
    >
      <div
        class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/20"
      >
        <UIcon name="i-heroicons-check-badge" class="h-8 w-8 text-teal-400" />
      </div>
      <h1 class="text-2xl font-black text-white">
        Session confirmée
      </h1>
      <p class="mt-3 text-slate-400">
        Vous avez confirmé cette session. L’apprenti a été notifié par email.
      </p>
      <NuxtLink
        to="/dashboard/coach"
        class="mt-8 inline-flex items-center gap-2 rounded-2xl bg-teal-500 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-teal-400"
      >
        Retour au tableau de bord
        <UIcon name="i-heroicons-arrow-right" class="h-4 w-4" />
      </NuxtLink>
    </div>

    <!-- Session annulée -->
    <div
      v-else
      class="w-full rounded-3xl border border-white/5 bg-white/[0.02] p-8 text-center"
    >
      <div
        class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-500/20"
      >
        <UIcon name="i-heroicons-x-circle" class="h-8 w-8 text-slate-400" />
      </div>
      <h1 class="text-2xl font-black text-white">
        Session annulée
      </h1>
      <p class="mt-3 text-slate-400">
        Vous avez annulé cette session. L’apprenti a été notifié et le paiement sera remboursé.
      </p>
      <NuxtLink
        to="/dashboard/coach"
        class="mt-8 inline-flex items-center gap-2 rounded-2xl bg-teal-500 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-teal-400"
      >
        Retour au tableau de bord
        <UIcon name="i-heroicons-arrow-right" class="h-4 w-4" />
      </NuxtLink>
    </div>
  </div>
</template>
