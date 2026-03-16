<script setup lang="ts">
const user = useSupabaseUser();
const client = useSupabaseClient();
const router = useRouter();

const logout = async () => {
  await client.auth.signOut();
  await router.push("/");
};

const displayName = computed(() => {
  if (!user.value) return null;
  const email = user.value.email ?? "";
  return email.split("@")[0];
});
</script>

<template>
  <nav class="sticky top-0 z-50 border-b border-white/5 bg-[#050812]/90 backdrop-blur-xl">
    <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
      <!-- Logo -->
      <NuxtLink to="/" class="group flex items-center gap-2.5">
        <div
          class="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-indigo-600 text-xs font-black text-white shadow-lg shadow-teal-500/20 transition group-hover:shadow-teal-500/30"
        >
          C
        </div>
        <span class="text-sm font-black tracking-wider text-white">CoachMe</span>
      </NuxtLink>

      <!-- Nav links (desktop) -->
      <div class="hidden items-center gap-8 md:flex">
        <NuxtLink
          to="/sessions"
          class="text-xs font-bold uppercase tracking-wider text-slate-400 transition hover:text-white"
          active-class="!text-teal-400"
        >
          Trouver un coach
        </NuxtLink>
        <NuxtLink
          v-if="user"
          to="/dashboard"
          class="text-xs font-bold uppercase tracking-wider text-slate-400 transition hover:text-white"
          active-class="!text-teal-400"
        >
          Dashboard
        </NuxtLink>
      </div>

      <!-- Auth -->
      <div class="flex items-center gap-3">
        <template v-if="user">
          <span class="hidden text-xs text-slate-500 md:block">
            {{ displayName }}
          </span>
          <button
            class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10 active:scale-95"
            @click="logout"
          >
            Déconnexion
          </button>
        </template>
        <template v-else>
          <NuxtLink
            to="/auth/login"
            class="hidden text-xs font-bold text-slate-400 transition hover:text-white md:block"
          >
            Connexion
          </NuxtLink>
          <NuxtLink
            to="/auth/register"
            class="rounded-xl bg-teal-500 px-4 py-2 text-xs font-black text-slate-950 shadow-lg shadow-teal-500/20 transition hover:bg-teal-400 active:scale-95"
          >
            S'inscrire
          </NuxtLink>
        </template>
      </div>
    </div>
  </nav>
</template>
