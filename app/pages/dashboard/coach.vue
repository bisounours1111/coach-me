<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "role"],
  requiredRole: "coach",
});

useHead({
  title: "Dashboard coach · CoachMe",
});

const user = useSupabaseUser();

const displayName = computed(() => {
  if (!user.value) return "Coach";
  const email = user.value.email ?? "";
  return email.split("@")[0];
});
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-12">
    <!-- Header -->
    <header class="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-[10px] font-black uppercase tracking-[0.3em] text-teal-500/80">
          Espace coach
        </p>
        <h1 class="mt-2 text-3xl font-black text-white md:text-4xl">
          Bienvenue, <span class="text-teal-400">{{ displayName }}</span>
        </h1>
        <p class="mt-2 text-sm text-slate-400">
          Gère tes sessions et ton profil de coaching.
        </p>
      </div>
      <NuxtLink
        to="/profile/edit"
        class="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-black text-white transition hover:bg-white/10 active:scale-95"
      >
        <UIcon name="i-heroicons-pencil-square" class="h-4 w-4" />
        Modifier mon profil
      </NuxtLink>
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
        <p class="text-[10px] font-black uppercase tracking-wider text-slate-500">Revenus</p>
        <p class="mt-2 text-3xl font-black text-indigo-400">0 €</p>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="mb-10 grid gap-4 md:grid-cols-2">
      <div class="rounded-3xl border border-white/5 bg-white/[0.02] p-8">
        <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10">
          <UIcon name="i-heroicons-user-circle" class="h-6 w-6 text-teal-400" />
        </div>
        <h3 class="text-base font-black text-white">Mon profil public</h3>
        <p class="mt-1 text-sm text-slate-500">Configure tes offres, tes jeux et ta bio pour attirer plus d'élèves.</p>
        <NuxtLink
          to="/profile/edit"
          class="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-teal-400 transition hover:text-teal-300"
        >
          Modifier mon profil
          <UIcon name="i-heroicons-arrow-right" class="h-3.5 w-3.5" />
        </NuxtLink>
      </div>

      <div class="rounded-3xl border border-white/5 bg-white/[0.02] p-8">
        <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10">
          <UIcon name="i-heroicons-calendar-days" class="h-6 w-6 text-indigo-400" />
        </div>
        <h3 class="text-base font-black text-white">Mes sessions</h3>
        <p class="mt-1 text-sm text-slate-500">Aucune session planifiée pour l'instant. Tes élèves pourront te réserver depuis ton profil.</p>
        <span class="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-slate-600">
          En attente d'élèves…
        </span>
      </div>
    </div>
  </div>
</template>
