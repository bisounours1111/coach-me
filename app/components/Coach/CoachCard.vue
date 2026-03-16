<template>
  <article
    class="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#020617]/80 p-4 shadow-lg shadow-black/40 backdrop-blur"
  >
    <header class="flex items-center gap-4">
      <div
        class="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-100"
      >
        <img
          v-if="coach.avatarUrl"
          :src="coach.avatarUrl"
          alt=""
          class="h-14 w-14 rounded-full object-cover"
        />
        <span v-else>{{ initials }}</span>
      </div>
      <div>
        <h2 class="text-sm font-semibold text-slate-50">
          {{ coach.fullName || "Coach anonyme" }}
        </h2>
        <p class="text-[0.7rem] text-slate-400">
          {{ primaryGame?.gameName || "Jeu non précisé" }}
          <span v-if="primaryGame?.playerRank"> · {{ primaryGame.playerRank }}</span>
        </p>
      </div>
    </header>

    <p v-if="coach.bio" class="text-xs text-slate-300/90">
      {{ coach.bio }}
    </p>

    <div class="flex flex-wrap gap-1.5 text-[0.65rem]">
      <span
        v-for="game in coach.games"
        :key="game.gameId"
        class="rounded-full bg-slate-800/70 px-2 py-0.5 text-slate-200"
      >
        {{ game.gameName }} <span v-if="game.playerRank">· {{ game.playerRank }}</span>
      </span>
    </div>

    <footer class="mt-auto flex items-center justify-between border-t border-white/10 pt-3 text-[0.7rem]">
      <div class="text-slate-300">
        <span v-if="primaryGame?.hourlyRate != null">
          À partir de
          <span class="font-semibold text-emerald-300">{{ primaryGame.hourlyRate.toFixed(2) }} €</span>
          / h
        </span>
        <span v-else class="text-slate-400">Tarif à définir</span>
      </div>
      <NuxtLink
        :to="`/profiles/${coach.profileId}`"
        class="inline-flex items-center gap-1 rounded-full bg-indigo-500 px-3 py-1.5 text-[0.7rem] font-semibold text-slate-50 shadow shadow-indigo-500/30 transition hover:bg-indigo-400"
      >
        Voir le profil
      </NuxtLink>
    </footer>
  </article>
</template>

<script setup lang="ts">
import type { CoachSearchResult } from "~/types/coach";

const props = defineProps<{
  coach: CoachSearchResult;
  selectedGameSlug: string | null;
}>();

const primaryGame = computed(() => {
  if (!props.selectedGameSlug) return props.coach.games[0] ?? null;
  return props.coach.games.find((g) => g.gameSlug === props.selectedGameSlug) ?? props.coach.games[0] ?? null;
});

const initials = computed(() => {
  if (!props.coach.fullName) return "C";
  const parts = props.coach.fullName.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0];
  const second = parts[1]?.[0];
  return (first ?? "C") + (second ?? "").toUpperCase();
});
</script>
