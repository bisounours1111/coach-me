<script setup lang="ts">
useHead({
  title: "CoachMe · Trouvez un coach pour progresser",
  meta: [
    {
      name: "description",
      content:
        "CoachMe met en relation des joueurs avec les meilleurs coachs gaming. Réservez des sessions et progressez plus vite.",
    },
  ],
});

const benefits = [
  {
    icon: "i-heroicons-user-group",
    color: "text-teal-400",
    bg: "bg-teal-500/10",
    title: "Des coachs qualifiés",
    description:
      "Parcourez des profils vérifiés, consultez les rangs, les vidéos et les avis laissés par d'autres joueurs.",
  },
  {
    icon: "i-heroicons-calendar-days",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    title: "Réservation simple",
    description:
      "Choisissez un créneau disponible en quelques clics et confirmez votre session directement depuis l'app.",
  },
  {
    icon: "i-heroicons-chart-bar-square",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    title: "Progressez rapidement",
    description:
      "Analyse de replays, coaching en direct ou plan de progression — adaptés à votre niveau et votre jeu.",
  },
];
</script>

<template>
  <div class="flex min-h-screen flex-col px-4 pb-12 sm:pb-0">
    <!-- ── HERO ──────────────────────────────────────────────────────── -->
    <section class="relative py-24 sm:py-32">
      <!-- Glow de fond -->
      <div
        class="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <div class="h-[600px] w-[600px] rounded-full bg-teal-500/5 blur-[120px]" />
        <div class="absolute h-[400px] w-[400px] -translate-x-32 translate-y-20 rounded-full bg-indigo-500/5 blur-[100px]" />
      </div>

      <div class="relative mx-auto max-w-4xl text-center">


        <!-- Titre -->
        <h1 class="text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
          Trouvez un coach pour
          <span class="bg-gradient-to-r from-teal-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
            progresser
          </span>
        </h1>

        <!-- Sous-titre -->
        <p class="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-400">
          Réservez des sessions de coaching personnalisées avec des joueurs
          expérimentés sur vos jeux favoris. Montez en niveau, à votre rythme.
        </p>

        <!-- CTA principal -->
        <div class="mt-8 flex flex-wrap items-center justify-center gap-4">
          <NuxtLink
            to="/games"
            class="group inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-teal-500 px-8 py-4 text-sm font-black tracking-wider text-slate-950 shadow-xl shadow-teal-500/25 transition-all duration-300 hover:bg-teal-400 hover:shadow-teal-400/30 active:scale-95"
          >
            Trouver une session
            <UIcon
              name="i-heroicons-arrow-right"
              class="h-4 w-4 transition-transform group-hover:translate-x-1"
            />
          </NuxtLink>
          <NuxtLink
            to="/auth/login"
            class="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-sm font-black tracking-wider text-white transition-all duration-300 hover:border-white/20 hover:bg-white/10 active:scale-95"
          >
            Se connecter
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ── BÉNÉFICES (3 blocs) ────────────────────────────────────────── -->
    <section class="mx-auto mt-16 w-full max-w-6xl">
      <div class="grid gap-4 sm:grid-cols-3">
        <div
          v-for="benefit in benefits"
          :key="benefit.title"
          class="rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]"
        >
          <div
            class="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl"
            :class="benefit.bg"
          >
            <UIcon :name="benefit.icon" class="h-6 w-6" :class="benefit.color" />
          </div>
          <h3 class="mb-2 text-base font-black text-white">{{ benefit.title }}</h3>
          <p class="text-sm leading-relaxed text-slate-500">{{ benefit.description }}</p>
        </div>
      </div>
    </section>
  </div>
</template>
