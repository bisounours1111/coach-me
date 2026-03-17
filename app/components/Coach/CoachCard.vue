<script setup lang="ts">
import type { CoachSearchResult } from "~/types/coach";

const props = defineProps<{
  coach: CoachSearchResult;
  selectedGameSlug: string | null;
}>();

const primaryGame = computed(() => {
  if (!props.selectedGameSlug) return props.coach.games[0] ?? null;
  return (
    props.coach.games.find((g) => g.gameSlug === props.selectedGameSlug) ??
    props.coach.games[0] ??
    null
  );
});

const initials = computed(() => {
  if (!props.coach.fullName) return "C";
  const parts = props.coach.fullName.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0];
  const second = parts[1]?.[0];
  return (first ?? "C") + (second ?? "").toUpperCase();
});
</script>

<template>
  <article
    class="group flex flex-col gap-5 rounded-3xl border border-white/5 bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]"
  >
    <!-- Header -->
    <header class="flex items-center gap-4">
      <div
        class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-sm font-black text-slate-100 overflow-hidden"
      >
        <img
          v-if="coach.avatarUrl"
          :src="coach.avatarUrl"
          alt=""
          class="h-14 w-14 object-cover"
        />
        <span v-else>{{ initials }}</span>
      </div>
      <div class="min-w-0 flex-1">
        <h2 class="truncate text-sm font-black text-white">
          {{ coach.fullName || "Coach anonyme" }}
        </h2>
        <p class="text-xs text-slate-500">
          {{ primaryGame?.gameName || "Jeu non précisé" }}
          <span v-if="primaryGame?.playerRank">
            · {{ primaryGame.playerRank }}</span
          >
        </p>
      </div>
    </header>

    <!-- Bio -->
    <p
      v-if="coach.bio"
      class="text-xs leading-relaxed text-slate-400 line-clamp-2"
    >
      {{ coach.bio }}
    </p>

    <!-- Game tags -->
    <div class="flex flex-wrap gap-1.5">
      <span
        v-for="game in coach.games"
        :key="game.gameId"
        class="rounded-full border border-white/5 bg-white/5 px-2.5 py-0.5 text-[0.65rem] font-bold text-slate-400"
      >
        {{ game.gameName
        }}<span v-if="game.playerRank"> · {{ game.playerRank }}</span>
      </span>
    </div>

    <!-- Footer -->
    <footer
      class="mt-auto flex items-center justify-between border-t border-white/5 pt-4"
    >
      <div class="text-xs">
        <span v-if="primaryGame?.hourlyRate != null" class="text-slate-400">
          À partir de
          <span class="font-black text-teal-400"
            >{{ primaryGame.hourlyRate.toFixed(2) }} €</span
          >
          / h
        </span>
        <span v-else class="text-slate-600">Tarif à définir</span>
      </div>
      <NuxtLink
        :to="`/profile/${coach.profileId}`"
        class="inline-flex items-center gap-1.5 rounded-xl bg-teal-500 px-4 py-2 text-xs font-black text-slate-950 shadow-lg shadow-teal-500/20 transition hover:bg-teal-400 active:scale-95"
      >
        Voir le profil
        <UIcon name="i-heroicons-arrow-right" class="h-3.5 w-3.5" />
      </NuxtLink>
    </footer>
  </article>
</template>
