<script setup lang="ts">
useHead({
  title: "CoachMe · Trouve ton coach gaming",
  meta: [
    {
      name: "description",
      content:
        "CoachMe met en relation des joueurs avec les meilleurs coachs gaming. Progresse plus vite avec un coach expert sur ton jeu.",
    },
  ],
});

const stats = [
  { value: "500+", label: "Coachs vérifiés" },
  { value: "12+", label: "Jeux disponibles" },
  { value: "98%", label: "Joueurs satisfaits" },
  { value: "4.9★", label: "Note moyenne" },
];

const steps = [
  {
    number: "01",
    title: "Choisis ton jeu",
    description: "Sélectionne le jeu sur lequel tu veux progresser et filtre par rôle ou rang.",
    icon: "i-heroicons-magnifying-glass",
  },
  {
    number: "02",
    title: "Trouve ton coach",
    description: "Consulte les profils, les vidéos et les avis des coachs. Compare les tarifs.",
    icon: "i-heroicons-user-group",
  },
  {
    number: "03",
    title: "Réserve une session",
    description: "Paiement sécurisé via Stripe. Le coach n'est payé qu'une fois la session terminée.",
    icon: "i-heroicons-calendar-days",
  },
  {
    number: "04",
    title: "Progresse vraiment",
    description: "Analyse de tes replays, coaching en direct, plan de progression personnalisé.",
    icon: "i-heroicons-chart-bar-square",
  },
];

const features = [
  {
    icon: "i-heroicons-shield-check",
    color: "text-teal-400",
    bg: "bg-teal-500/10",
    title: "Paiement sécurisé",
    description: "Toutes les transactions sont protégées par Stripe. Tu es remboursé si la session n'a pas lieu.",
  },
  {
    icon: "i-heroicons-star",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    title: "Coachs vérifiés",
    description: "Chaque coach est validé par notre équipe. Profils avec rangs, vidéos et avis authentiques.",
  },
  {
    icon: "i-heroicons-bolt",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    title: "Résultats rapides",
    description: "Nos coachs utilisent des méthodes éprouvées pour te faire progresser dès la première session.",
  },
  {
    icon: "i-heroicons-video-camera",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    title: "Coaching vidéo",
    description: "Sessions en live ou analyse de replays. Chaque coach propose ses formats préférés.",
  },
];
</script>

<template>
  <div class="text-slate-200 selection:bg-teal-500/30">
    <!-- ── HERO ──────────────────────────────────────────────── -->
    <section class="relative overflow-hidden">
      <div class="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <div class="h-[600px] w-[600px] rounded-full bg-teal-500/5 blur-[120px]" />
        <div class="absolute h-[400px] w-[400px] -translate-x-32 translate-y-20 rounded-full bg-indigo-500/5 blur-[100px]" />
      </div>

      <div class="relative mx-auto max-w-6xl px-4 pb-24 pt-20 md:pt-32">
        <div class="mb-8 flex justify-center">
          <span class="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-teal-400">
            <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-400" />
            Plateforme gaming #1
          </span>
        </div>

        <h1 class="mx-auto max-w-4xl text-center text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
          Monte de rang avec
          <span class="bg-gradient-to-r from-teal-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
            le bon coach
          </span>
        </h1>

        <p class="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-slate-400">
          CoachMe connecte les joueurs ambitieux aux meilleurs coachs gaming.
          Progresse plus vite, joue mieux, dépasse tes limites.
        </p>

        <div class="mt-10 flex flex-wrap items-center justify-center gap-4">
          <NuxtLink
            to="/sessions"
            class="group inline-flex items-center gap-2 rounded-2xl bg-teal-500 px-8 py-4 text-sm font-black tracking-wider text-slate-950 shadow-xl shadow-teal-500/25 transition-all duration-300 hover:bg-teal-400 hover:shadow-teal-400/30 active:scale-95"
          >
            Trouver un coach
            <UIcon name="i-heroicons-arrow-right" class="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </NuxtLink>
          <NuxtLink
            to="/auth/register"
            class="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-sm font-black tracking-wider text-white transition-all duration-300 hover:border-white/20 hover:bg-white/10 active:scale-95"
          >
            Devenir coach
          </NuxtLink>
        </div>

        <!-- Stats -->
        <div class="mx-auto mt-20 grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="rounded-2xl border border-white/5 bg-white/[0.03] p-5 text-center backdrop-blur-sm"
          >
            <p class="text-2xl font-black text-white">{{ stat.value }}</p>
            <p class="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── HOW IT WORKS ──────────────────────────────────────── -->
    <section class="mx-auto max-w-6xl px-4 py-24">
      <div class="mb-16 text-center">
        <p class="text-[10px] font-black uppercase tracking-[0.3em] text-teal-500/80">Simple & efficace</p>
        <h2 class="mt-3 text-3xl font-black text-white md:text-4xl">Comment ça marche ?</h2>
      </div>

      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="step in steps"
          :key="step.number"
          class="group relative rounded-3xl border border-white/5 bg-white/[0.02] p-8 transition-all duration-500 hover:border-teal-500/20 hover:bg-white/[0.04]"
        >
          <span class="text-5xl font-black text-white/5 transition-colors duration-500 group-hover:text-teal-500/10">
            {{ step.number }}
          </span>
          <div class="mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-teal-400 transition-colors duration-300 group-hover:bg-teal-500/10">
            <UIcon :name="step.icon" class="h-6 w-6" />
          </div>
          <h3 class="mt-5 text-base font-black text-white">{{ step.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-slate-500">{{ step.description }}</p>
        </div>
      </div>
    </section>

    <!-- ── FEATURES ──────────────────────────────────────────── -->
    <section class="relative overflow-hidden py-24">
      <div class="pointer-events-none absolute inset-0" aria-hidden="true">
        <div class="absolute right-0 top-0 h-80 w-80 rounded-full bg-indigo-500/5 blur-[100px]" />
      </div>
      <div class="relative mx-auto max-w-6xl px-4">
        <div class="mb-16 text-center">
          <p class="text-[10px] font-black uppercase tracking-[0.3em] text-teal-500/80">Pourquoi CoachMe</p>
          <h2 class="mt-3 text-3xl font-black text-white md:text-4xl">La plateforme faite pour les gamers</h2>
        </div>

        <div class="grid gap-6 md:grid-cols-2">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="flex gap-5 rounded-3xl border border-white/5 bg-white/[0.02] p-8 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]"
          >
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" :class="feature.bg">
              <UIcon :name="feature.icon" class="h-6 w-6" :class="feature.color" />
            </div>
            <div>
              <h3 class="text-base font-black text-white">{{ feature.title }}</h3>
              <p class="mt-2 text-sm leading-relaxed text-slate-500">{{ feature.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── CTA ───────────────────────────────────────────────── -->
    <section class="mx-auto max-w-6xl px-4 py-24">
      <div class="relative overflow-hidden rounded-3xl border border-teal-500/10 bg-gradient-to-br from-teal-500/5 via-transparent to-indigo-500/5 p-12 text-center md:p-20">
        <div class="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <div class="h-64 w-64 rounded-full bg-teal-500/10 blur-[80px]" />
        </div>
        <div class="relative">
          <p class="text-[10px] font-black uppercase tracking-[0.3em] text-teal-500/80">Commence maintenant</p>
          <h2 class="mt-4 text-3xl font-black text-white md:text-5xl">Prêt à passer au niveau supérieur ?</h2>
          <p class="mx-auto mt-4 max-w-lg text-slate-400">
            Rejoins des milliers de joueurs qui ont déjà amélioré leur niveau grâce à CoachMe.
          </p>
          <div class="mt-10 flex flex-wrap items-center justify-center gap-4">
            <NuxtLink
              to="/sessions"
              class="group inline-flex items-center gap-2 rounded-2xl bg-teal-500 px-8 py-4 text-sm font-black tracking-wider text-slate-950 shadow-xl shadow-teal-500/25 transition-all duration-300 hover:bg-teal-400 active:scale-95"
            >
              Trouver mon coach
              <UIcon name="i-heroicons-arrow-right" class="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </NuxtLink>
            <NuxtLink
              to="/auth/login"
              class="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-sm font-black tracking-wider text-white transition-all duration-300 hover:bg-white/10 active:scale-95"
            >
              Se connecter
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
