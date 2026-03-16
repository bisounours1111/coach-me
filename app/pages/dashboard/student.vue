<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "role"],
  requiredRole: "student",
});

useHead({
  title: "Dashboard élève · CoachMe",
});

const user = useSupabaseUser();

const displayName = computed(() => {
  if (!user.value) return "Joueur";
  const email = user.value.email ?? "";
  return email.split("@")[0];
});
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-12">
    <!-- Header -->
    <header class="mb-10">
      <p class="text-[10px] font-black uppercase tracking-[0.3em] text-teal-500/80">
        Espace élève
      </p>
      <h1 class="mt-2 text-3xl font-black text-white md:text-4xl">
        Bienvenue, <span class="text-teal-400">{{ displayName }}</span>
      </h1>
      <p class="mt-2 text-sm text-slate-400">
        Gère tes sessions de coaching et suis ta progression.
      </p>
    </header>

    <!-- Stats -->
    <div class="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
      <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <p class="text-[10px] font-black uppercase tracking-wider text-slate-500">À venir</p>
        <p class="mt-2 text-3xl font-black text-teal-400">0</p>
      </div>
      <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <p class="text-[10px] font-black uppercase tracking-wider text-slate-500">En attente</p>
        <p class="mt-2 text-3xl font-black text-amber-400">0</p>
      </div>
      <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <p class="text-[10px] font-black uppercase tracking-wider text-slate-500">Terminées</p>
        <p class="mt-2 text-3xl font-black text-slate-400">0</p>
      </div>
      <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <p class="text-[10px] font-black uppercase tracking-wider text-slate-500">Total</p>
        <p class="mt-2 text-3xl font-black text-indigo-400">0</p>
      </div>
    </div>

    <!-- Empty state -->
    <div class="rounded-3xl border border-white/5 bg-white/[0.02] p-16 text-center">
      <div class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10">
        <UIcon name="i-heroicons-calendar-days" class="h-8 w-8 text-teal-400" />
      </div>
      <h2 class="text-xl font-black text-white">Aucune session pour l'instant</h2>
      <p class="mx-auto mt-2 max-w-sm text-sm text-slate-500">
        Trouve un coach et réserve ta première session pour commencer à progresser.
      </p>
      <NuxtLink
        to="/sessions"
        class="mt-8 inline-flex items-center gap-2 rounded-2xl bg-teal-500 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-teal-500/20 transition hover:bg-teal-400 active:scale-95"
      >
        Trouver un coach
        <UIcon name="i-heroicons-arrow-right" class="h-4 w-4" />
      </NuxtLink>
    </div>
  </div>
</template>
