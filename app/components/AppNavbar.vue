<script setup lang="ts">
import { useCoachProfile } from "../composables/useCoachProfile";
import { onClickOutside } from "@vueuse/core";

const user = useSupabaseUser();
const client = useSupabaseClient();

const { getCoachProfile } = useCoachProfile();

const isMobileMenuOpen = ref(false);
const isUserDropdownOpen = ref(false);
const userProfile = ref<{ avatarUrl?: string; fullName?: string } | null>(null);

const dropdownRef = ref<HTMLElement | null>(null);

if (import.meta.client) {
  onClickOutside(dropdownRef, () => {
    isUserDropdownOpen.value = false;
  });
}

const logout = async () => {
  await client.auth.signOut();
  isUserDropdownOpen.value = false;
  isMobileMenuOpen.value = false;
  navigateTo("/auth/login");
};

const fetchProfile = async () => {
  if (user.value?.sub) {
    try {
      const profile = await getCoachProfile(user.value.sub);
      userProfile.value = {
        avatarUrl: profile.avatarUrl,
        fullName: profile.fullName,
      };
    } catch (e) {
      console.error("Error fetching profile for navbar:", e);
    }
  }
};

onMounted(fetchProfile);

watch(
  user,
  (newUser) => {
    if (newUser?.sub) {
      fetchProfile();
    } else {
      userProfile.value = null;
    }
  },
  { immediate: true },
);
</script>

<template>
  <nav
    class="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md"
  >
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 items-center justify-between">
        <!-- Logo -->
        <div class="flex items-center">
          <NuxtLink
            to="/"
            class="flex items-center gap-2 group"
            @click="isMobileMenuOpen = false"
          >
            <div
              class="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform"
            >
              <span class="text-white font-bold text-lg">C</span>
            </div>
            <span class="text-xl font-bold tracking-tight text-slate-50">
              Coach<span class="text-indigo-400">Me</span>
            </span>
          </NuxtLink>
        </div>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex md:items-center md:gap-4">
          <template v-if="user">
            <!-- User Dropdown (Desktop) -->
            <div class="relative" ref="dropdownRef">
              <button
                @click="isUserDropdownOpen = !isUserDropdownOpen"
                class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-800 transition-colors hover:border-indigo-500 focus:outline-none overflow-hidden"
              >
                <img
                  v-if="userProfile?.avatarUrl"
                  :src="userProfile.avatarUrl"
                  :alt="userProfile.fullName"
                  class="h-full w-full object-cover"
                />
                <div
                  v-else
                  class="flex h-full w-full items-center justify-center bg-slate-800"
                >
                  <div class="h-5 w-5 i-lucide-user text-slate-400" />
                </div>
              </button>

              <!-- Dropdown Menu -->
              <Transition
                enter-active-class="transition duration-100 ease-out"
                enter-from-class="transform scale-95 opacity-0"
                enter-to-class="transform scale-100 opacity-100"
                leave-active-class="transition duration-75 ease-in"
                leave-from-class="transform scale-100 opacity-100"
                leave-to-class="transform scale-95 opacity-0"
              >
                <div
                  v-if="isUserDropdownOpen"
                  class="absolute right-0 mt-2 w-48 origin-top-right rounded-xl border border-slate-800 bg-slate-900 p-1 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none"
                >
                  <NuxtLink
                    :to="`/profile/${user.sub}`"
                    class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    @click="isUserDropdownOpen = false"
                  >
                    <div class="h-4 w-4 i-lucide-user" />
                    Voir mon profil
                  </NuxtLink>
                  <NuxtLink
                    to="/profile/edit"
                    class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    @click="isUserDropdownOpen = false"
                  >
                    <div class="h-4 w-4 i-lucide-settings" />
                    Éditer le profil
                  </NuxtLink>
                  <div class="my-1 border-t border-slate-800" />
                  <button
                    @click="logout"
                    class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <div class="h-4 w-4 i-lucide-log-out" />
                    Déconnexion
                  </button>
                </div>
              </Transition>
            </div>
          </template>
          <template v-else>
            <NuxtLink
              to="/auth/login"
              class="text-slate-300 hover:text-white text-sm font-medium"
            >
              Connexion
            </NuxtLink>
            <NuxtLink
              to="/auth/register"
              class="rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400 transition-all"
            >
              S'inscrire
            </NuxtLink>
          </template>
        </div>

        <!-- Mobile menu button -->
        <div class="flex md:hidden">
          <button
            @click="isMobileMenuOpen = !isMobileMenuOpen"
            class="inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white focus:outline-none"
          >
            <span class="sr-only">Ouvrir le menu</span>
            <div v-if="!isMobileMenuOpen" class="h-6 w-6 i-lucide-menu" />
            <div v-else class="h-6 w-6 i-lucide-x" />
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile menu -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="isMobileMenuOpen"
        class="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-4 space-y-4"
      >
        <template v-if="user">
          <div class="flex items-center gap-3 px-2 mb-4">
            <div
              v-if="userProfile?.avatarUrl"
              class="h-10 w-10 overflow-hidden rounded-full border border-slate-700"
            >
              <img
                :src="userProfile.avatarUrl"
                :alt="userProfile.fullName"
                class="h-full w-full object-cover"
              />
            </div>
            <div
              v-else
              class="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700"
            >
              <div class="h-5 w-5 i-lucide-user text-slate-400" />
            </div>
            <div>
              <p class="text-sm font-medium text-slate-50">
                {{ userProfile?.fullName || "Utilisateur" }}
              </p>
              <p class="text-xs text-slate-500 truncate">{{ user.email }}</p>
            </div>
          </div>

          <div class="space-y-1">
            <NuxtLink
              :to="`/profile/${user.sub}`"
              class="flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              @click="isMobileMenuOpen = false"
            >
              <div class="h-5 w-5 i-lucide-user" />
              Voir mon profil
            </NuxtLink>
            <NuxtLink
              to="/profile/edit"
              class="flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              @click="isMobileMenuOpen = false"
            >
              <div class="h-5 w-5 i-lucide-settings" />
              Éditer le profil
            </NuxtLink>
          </div>

          <div class="pt-4 border-t border-slate-800">
            <button
              @click="logout"
              class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-base font-medium text-rose-400 hover:bg-rose-500/10"
            >
              <div class="h-5 w-5 i-lucide-log-out" />
              Déconnexion
            </button>
          </div>
        </template>
        <template v-else>
          <div class="grid grid-cols-1 gap-2">
            <NuxtLink
              to="/auth/login"
              class="flex items-center justify-center rounded-lg px-3 py-3 text-base font-medium text-slate-300 hover:bg-slate-800"
              @click="isMobileMenuOpen = false"
            >
              Connexion
            </NuxtLink>
            <NuxtLink
              to="/auth/register"
              class="flex items-center justify-center rounded-lg bg-indigo-500 px-3 py-3 text-base font-medium text-white"
              @click="isMobileMenuOpen = false"
            >
              S'inscrire
            </NuxtLink>
          </div>
        </template>
      </div>
    </Transition>
  </nav>
</template>
