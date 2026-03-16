<script setup lang="ts">
const props = defineProps<{
  profile: PublicProfileView;
  isCoach: boolean;
  minRate: number | null;
  isOwnProfile?: boolean;
}>();

const user = useSupabaseUser();
const client = useSupabaseClient();
const sessionUser = ref<any>(null);
const copied = ref(false);

onMounted(async () => {
  const { data } = await client.auth.getUser();
  if (data?.user) {
    sessionUser.value = data.user;
  }
});

const isOwnProfileComputed = computed(() => {
  if (props.isOwnProfile) return true;
  const u = user.value || sessionUser.value;
  const currentUserId = u?.id;
  const profileId = props.profile?.id;
  if (!currentUserId || !profileId) return false;
  return (
    String(currentUserId).toLowerCase() === String(profileId).toLowerCase()
  );
});

const socialConfig: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  youtube: {
    label: "YouTube",
    icon: "i-simple-icons-youtube",
    color: "#FF0000",
  },
  twitch: { label: "Twitch", icon: "i-simple-icons-twitch", color: "#9146FF" },
  twitter: { label: "X / Twitter", icon: "i-simple-icons-x", color: "#e2e8f0" },
  discord: {
    label: "Discord",
    icon: "i-simple-icons-discord",
    color: "#5865F2",
  },
  website: {
    label: "Site web",
    icon: "i-heroicons-globe-alt",
    color: "#14b8a6",
  },
};

const activeSocials = computed(() =>
  Object.entries(props.profile.socialLinks)
    .filter(([, url]) => url)
    .map(([key, url]) => ({
      key,
      url,
      ...(socialConfig[key] ?? {
        label: key,
        icon: "i-heroicons-link",
        color: "#94a3b8",
      }),
    })),
);

const coachGamesCount = computed(
  () => props.profile.games.filter((g) => g.isCoach).length,
);

const copyProfileLink = () => {
  if (process.client) {
    navigator.clipboard.writeText(window.location.href);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  }
};
</script>

<template>
  <div class="relative">
    <!-- ─── Full-width Integrated Background ─── -->
    <div class="absolute inset-0 z-0">
      <!-- Base dark tint -->
      <div class="absolute inset-0 bg-[#0b0f19]/40" />

      <!-- Animated glows -->
      <div
        class="absolute -left-24 -top-24 h-[500px] w-[500px] animate-pulse rounded-full bg-teal-500/10 blur-[120px]"
      />
      <div
        class="absolute -right-24 top-0 h-[500px] w-[500px] animate-pulse rounded-full bg-indigo-500/10 blur-[120px] [animation-delay:2s]"
      />

      <!-- Smooth transition to page background -->
      <div
        class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050812]"
      />

      <!-- Subtle bottom border fade -->
      <div
        class="absolute bottom-0 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />
    </div>

    <!-- ─── Header Content ─── -->
    <header class="relative z-10 mx-auto max-w-6xl px-4 pt-16 pb-12">
      <div class="flex flex-col md:flex-row gap-8 md:gap-12">
        <!-- ═══════════════════════════════════
             SECTION GAUCHE — Avatar & Identity
             ═══════════════════════════════════ -->
        <div
          class="flex flex-col items-center md:items-start gap-6 md:w-80 shrink-0"
        >
          <!-- Avatar Section -->
          <div class="relative group">
            <div class="relative h-36 w-36 md:h-44 md:w-44">
              <!-- Decorative rotating ring -->
              <div
                class="absolute inset-0 animate-spin-slow rounded-full bg-gradient-to-tr from-teal-500 via-transparent to-indigo-500 opacity-50"
              />
              <div class="absolute inset-1 rounded-full bg-[#050812]" />

              <div
                class="absolute inset-2 overflow-hidden rounded-full ring-1 ring-white/10"
              >
                <img
                  v-if="profile.avatarUrl"
                  :src="profile.avatarUrl"
                  :alt="profile.fullName"
                  class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div
                  v-else
                  class="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-600 to-indigo-600 text-5xl font-black text-white"
                >
                  {{ profile.fullName.charAt(0).toUpperCase() }}
                </div>
              </div>
            </div>

            <!-- Status Badge -->
            <div
              v-if="isCoach"
              class="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#050812] bg-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.6)]"
            >
              <UIcon
                name="i-heroicons-check-badge"
                class="h-4 w-4 text-slate-950"
              />
            </div>
          </div>

          <!-- Name & Bio -->
          <div class="space-y-4 w-full text-center md:text-left">
            <div class="space-y-2">
              <h1
                class="text-4xl font-black tracking-tight text-white md:text-5xl leading-tight"
              >
                {{ profile.fullName }}
              </h1>
            </div>

            <p
              v-if="profile.bio"
              class="text-sm leading-relaxed text-slate-300/90 whitespace-pre-wrap italic"
            >
              "{{ profile.bio }}"
            </p>
          </div>
        </div>

        <!-- ═══════════════════════════════════
             SECTION DROITE — Stats, Socials & Actions
             ═══════════════════════════════════ -->
        <div class="flex-1 flex flex-col justify-between py-2">
          <div class="grid gap-10 lg:grid-cols-2">
            <!-- Stats -->
            <div class="space-y-4">
              <h3
                class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500"
              >
                Performances
              </h3>
              <div class="flex gap-10">
                <div class="space-y-1">
                  <div class="text-4xl font-black text-white">
                    {{ coachGamesCount }}
                  </div>
                  <div
                    class="text-[10px] font-bold uppercase tracking-wider text-slate-500"
                  >
                    Jeux coachés
                  </div>
                </div>
                <div
                  v-if="minRate !== null"
                  class="space-y-1 border-l border-white/10 pl-10"
                >
                  <div class="flex items-baseline gap-1">
                    <span class="text-4xl font-black text-teal-400"
                      >{{ minRate }}€</span
                    >
                    <span class="text-xs font-bold text-slate-500">/h</span>
                  </div>
                  <div
                    class="text-[10px] font-bold uppercase tracking-wider text-slate-500"
                  >
                    Tarif min.
                  </div>
                </div>
              </div>
            </div>

            <!-- Socials -->
            <div class="space-y-4">
              <h3
                class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500"
              >
                Contact & Partage
              </h3>
              <div class="flex flex-wrap gap-2">
                <a
                  v-for="social in activeSocials"
                  :key="social.key"
                  :href="social.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="group flex h-11 items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 text-xs font-bold text-slate-300 transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10"
                >
                  <UIcon
                    :name="social.icon"
                    class="h-5 w-5"
                    :style="{ color: social.color }"
                  />
                  <span class="hidden xl:inline">{{ social.label }}</span>
                </a>

                <button
                  @click="copyProfileLink"
                  class="flex h-11 items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 text-xs font-bold text-slate-300 transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10 active:scale-95"
                >
                  <UIcon
                    :name="copied ? 'i-heroicons-check' : 'i-heroicons-share'"
                    class="h-5 w-5 text-indigo-400"
                  />
                  <span class="hidden xl:inline">{{
                    copied ? "Copié !" : "Partager"
                  }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- CTAs -->
          <div class="mt-12 flex flex-wrap items-center justify-between gap-6">
            <div class="flex gap-4">
              <button
                v-if="isCoach && !isOwnProfileComputed"
                class="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-teal-500 px-10 py-4 text-sm font-black text-slate-950 transition-all hover:scale-105 hover:bg-teal-400 active:scale-95 shadow-xl shadow-teal-900/20"
              >
                <UIcon name="i-heroicons-calendar-days" class="h-5 w-5" />
                RÉSERVER UN COACHING
                <div
                  class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-500 group-hover:translate-x-full"
                />
              </button>

              <button
                v-if="!isOwnProfileComputed"
                class="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-sm font-bold text-white transition-all hover:bg-white/10 active:scale-95"
              >
                <UIcon
                  name="i-heroicons-chat-bubble-left-right"
                  class="h-5 w-5 text-slate-400"
                />
                MESSAGE
              </button>
            </div>

            <!-- Edit (Owner) -->
            <NuxtLink
              v-if="isOwnProfileComputed"
              to="/profile/edit"
              class="flex items-center gap-3 rounded-2xl bg-indigo-500 px-8 py-4 text-sm font-black text-white shadow-xl shadow-indigo-900/20 transition-all hover:scale-105 hover:bg-indigo-400 active:scale-95"
            >
              <UIcon name="i-heroicons-pencil-square" class="h-5 w-5" />
              MODIFIER MON PROFIL
            </NuxtLink>
          </div>
        </div>
      </div>
    </header>
  </div>
</template>

<style scoped>
.animate-spin-slow {
  animation: spin 12s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
