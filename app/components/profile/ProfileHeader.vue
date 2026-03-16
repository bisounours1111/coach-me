<script setup lang="ts">
const props = defineProps<{
  profile: PublicProfileView;
  isCoach: boolean;
  minRate: number | null;
}>();

const socialConfig: Record<
  string,
  { label: string; color: string; abbr: string }
> = {
  youtube: { label: "YouTube", color: "#FF0000", abbr: "YT" },
  twitch: { label: "Twitch", color: "#9146FF", abbr: "Tv" },
  twitter: { label: "X / Twitter", color: "#e2e8f0", abbr: "X" },
  discord: { label: "Discord", color: "#5865F2", abbr: "DC" },
  website: { label: "Site web", color: "#14b8a6", abbr: "🌐" },
};

const activeSocials = computed(() =>
  Object.entries(props.profile.socialLinks)
    .filter(([, url]) => url)
    .map(([key, url]) => ({
      key,
      url,
      ...(socialConfig[key] ?? {
        label: key,
        color: "#94a3b8",
        abbr: key.slice(0, 2).toUpperCase(),
      }),
    })),
);

const coachGamesCount = computed(
  () => props.profile.games.filter((g) => g.isCoach).length,
);
</script>

<template>
  <header class="relative overflow-hidden">
    <!-- Ambient glows -->
    <div
      class="pointer-events-none absolute left-1/4 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-teal-500/8 blur-3xl"
    />
    <div
      class="pointer-events-none absolute inset-0 bg-gradient-to-b from-teal-950/20 via-transparent to-transparent"
    />

    <div class="relative mx-auto max-w-6xl px-4 pb-10 pt-12">
      <div
        class="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm"
      >
        <!-- Inner gradient -->
        <div
          class="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-500/[0.04] via-transparent to-indigo-500/[0.04]"
        />
        <!-- Corner accent -->
        <div
          class="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl"
        />

        <!-- ─── Layout principal ─── -->
        <div class="relative flex flex-col md:flex-row">
          <!-- ═══════════════════════════════════
               COLONNE GAUCHE — Avatar + Nom + Bio
               ═══════════════════════════════════ -->
          <div
            class="flex flex-col items-center gap-5 border-b border-white/8 p-6 text-center md:w-72 md:min-w-[18rem] md:items-start md:border-b-0 md:border-r md:p-8 md:text-left lg:w-80 lg:min-w-[20rem]"
          >
            <!-- Avatar -->
            <div class="relative">
              <div
                class="h-28 w-28 overflow-hidden rounded-full ring-2 ring-teal-500/40 ring-offset-2 ring-offset-[#0b0f19] md:h-32 md:w-32"
              >
                <img
                  v-if="profile.avatarUrl"
                  :src="profile.avatarUrl"
                  :alt="profile.fullName"
                  class="h-full w-full object-cover"
                />
                <div
                  v-else
                  class="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-600 to-indigo-600 text-4xl font-black text-white"
                >
                  {{ profile.fullName.charAt(0).toUpperCase() }}
                </div>
              </div>
              <!-- Online dot -->
              <div
                v-if="isCoach"
                class="absolute bottom-1.5 right-1.5 h-4 w-4 rounded-full border-2 border-[#0b0f19] bg-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.9)]"
              />
            </div>

            <!-- Nom + badge -->
            <div class="space-y-2">
              <h1
                class="bg-gradient-to-r from-slate-50 to-slate-300 bg-clip-text text-2xl font-black text-transparent leading-tight"
              >
                {{ profile.fullName }}
              </h1>
              <div class="flex flex-wrap justify-center gap-2 md:justify-start">
                <span
                  v-if="isCoach"
                  class="rounded-full border border-teal-500/40 bg-teal-500/15 px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest text-teal-300"
                >
                  ✦ Coach
                </span>
                <span
                  v-else
                  class="rounded-full border border-slate-600/40 bg-slate-500/15 px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest text-slate-400"
                >
                  Joueur
                </span>
              </div>
            </div>

            <!-- Séparateur -->
            <div
              class="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
            />

            <!-- Bio -->
            <div class="flex-1">
              <p
                v-if="profile.bio"
                class="whitespace-pre-wrap text-sm leading-relaxed text-slate-400"
              >
                {{ profile.bio }}
              </p>
              <p v-else class="text-sm italic text-slate-600">
                Aucune biographie renseignée.
              </p>
            </div>
          </div>

          <!-- ═══════════════════════════════════
               COLONNE DROITE — Stats + Socials + CTA
               ═══════════════════════════════════ -->
          <div class="flex flex-1 flex-col justify-between gap-6 p-6 md:p-8">
            <!-- Stats (coach) -->
            <div v-if="isCoach" class="space-y-4">
              <p
                class="text-xs font-bold uppercase tracking-widest text-slate-600"
              >
                En un coup d'œil
              </p>
              <div class="flex flex-wrap gap-6">
                <div>
                  <div class="text-2xl font-black text-teal-400">
                    {{ coachGamesCount }}
                  </div>
                  <div class="text-xs text-slate-500">
                    Jeu{{ coachGamesCount > 1 ? "x" : "" }} coaché{{
                      coachGamesCount > 1 ? "s" : ""
                    }}
                  </div>
                </div>
                <div
                  v-if="minRate !== null"
                  class="border-l border-white/10 pl-6"
                >
                  <div class="text-2xl font-black text-teal-400">
                    {{ minRate }}€<span
                      class="text-sm font-medium text-slate-400"
                      >/h</span
                    >
                  </div>
                  <div class="text-xs text-slate-500">Tarif horaire min.</div>
                </div>
              </div>
            </div>

            <!-- Info joueur non-coach -->
            <div v-else class="space-y-2">
              <p
                class="text-xs font-bold uppercase tracking-widest text-slate-600"
              >
                Profil joueur
              </p>
              <p class="text-sm text-slate-500">
                {{ profile.games.length }} jeu{{
                  profile.games.length > 1 ? "x" : ""
                }}
                renseigné{{ profile.games.length > 1 ? "s" : "" }}
              </p>
            </div>

            <!-- Socials -->
            <div v-if="activeSocials.length" class="space-y-3">
              <p
                class="text-xs font-bold uppercase tracking-widest text-slate-600"
              >
                Retrouve-moi sur
              </p>
              <div class="flex flex-wrap gap-2">
                <a
                  v-for="social in activeSocials"
                  :key="social.key"
                  :href="social.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="social.label"
                  class="group flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-bold text-slate-400 transition-all duration-200 hover:-translate-y-px hover:scale-105 hover:border-white/20 hover:bg-white/10"
                >
                  <span :style="{ color: social.color }">{{
                    social.abbr
                  }}</span>
                  <span
                    class="text-slate-500 group-hover:text-slate-300 transition-colors"
                    >{{ social.label }}</span
                  >
                </a>
              </div>
            </div>

            <!-- CTA -->
            <div v-if="isCoach" class="mt-auto pt-2">
              <button
                class="group relative overflow-hidden rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-900/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-500/20 active:scale-95"
              >
                <span class="relative z-10 flex items-center gap-2.5">
                  <UIcon name="i-heroicons-calendar" class="h-4 w-4" />
                  Réserver une session
                </span>
                <div
                  class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
