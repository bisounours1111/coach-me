<template>
  <div
    class="flex min-h-screen flex-col items-center justify-center bg-[#050812] px-4 text-slate-200"
  >
    <div class="max-w-md space-y-8 text-center">
      <div class="relative mx-auto h-24 w-24">
        <div
          class="absolute inset-0 animate-pulse rounded-full bg-teal-500/20 blur-2xl"
        />
        <div
          class="relative flex h-full w-full items-center justify-center rounded-full border border-teal-500/30 bg-teal-500/10 text-5xl"
        >
          ✅
        </div>
      </div>

      <div class="space-y-3">
        <h1 class="text-3xl font-black text-white">Réservation confirmée !</h1>
        <p class="text-slate-400">
          Ton paiement a été accepté. Le coach va te contacter pour fixer les
          détails de la session.
        </p>
      </div>

      <div
        class="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-left space-y-2"
      >
        <p class="text-xs font-black uppercase tracking-widest text-teal-500">
          Prochaines étapes
        </p>
        <ul class="space-y-2 text-sm text-slate-400">
          <li class="flex items-start gap-2">
            <span class="mt-0.5 text-teal-400">→</span>
            Tu recevras un email de confirmation Stripe
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-0.5 text-teal-400">→</span>
            Le coach prendra contact pour planifier la session
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-0.5 text-teal-400">→</span>
            La session apparaîtra dans ton dashboard
          </li>
        </ul>
      </div>

      <NuxtLink
        to="/dashboard/student"
        class="inline-flex items-center gap-2 rounded-2xl bg-teal-500 px-8 py-4 text-sm font-black text-slate-950 transition hover:bg-teal-400"
      >
        Voir mes sessions
        <UIcon name="i-heroicons-arrow-right" class="h-4 w-4" />
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: "Réservation confirmée · CoachMe" });
</script>
