<script setup lang="ts">
import { useCoachProfile } from "../composables/useCoachProfile";
import { useProfile } from "../composables/useProfile";
import { onClickOutside } from "@vueuse/core";

const user = useSupabaseUser();
const client = useSupabaseClient();

const { getCoachProfile } = useCoachProfile();
const { getUserRole } = useProfile();

const isMobileMenuOpen = ref(false);
const isUserDropdownOpen = ref(false);
const userProfile = ref<{
  avatarUrl?: string;
  fullName?: string;
  role?: string;
} | null>(null);

const dropdownRef = ref<HTMLElement | null>(null);

const dashboardShortcuts = computed(() => {
  return [
    {
      to: "/dashboard/coach",
      label: "Panel coach",
      icon: "i-lucide-layout-dashboard",
    },
    {
      to: "/dashboard/student",
      label: "Panel élève",
      icon: "i-lucide-graduation-cap",
    },
  ] as const;
});

if (import.meta.client) {
  onClickOutside(dropdownRef, () => {
    isUserDropdownOpen.value = false;
  });
}

const DEFAULT_AVATAR =
  "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";

const logout = async () => {
  await client.auth.signOut();
  isUserDropdownOpen.value = false;
  isMobileMenuOpen.value = false;
  navigateTo("/auth/login");
};

const fetchProfile = async () => {
  const userId = user.value?.id || user.value?.sub;
  if (userId) {
    try {
      const [profile, role] = await Promise.all([
        getCoachProfile(userId),
        getUserRole(userId),
      ]);
      userProfile.value = {
        avatarUrl: profile.avatarUrl,
        fullName: profile.fullName,
        role: role || "user",
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
    const userId = newUser?.id || newUser?.sub;
    if (userId) {
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
        <div class="hidden md:flex md:items-center md:gap-6">
          <template v-if="user">
            <!-- User Dropdown (Desktop) -->
            <div class="relative" ref="dropdownRef">
              <button
                @click="isUserDropdownOpen = !isUserDropdownOpen"
                class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-800 transition-colors hover:border-indigo-500 focus:outline-none overflow-hidden bg-slate-800"
              >
                <img
                  :src="userProfile?.avatarUrl || DEFAULT_AVATAR"
                  :alt="userProfile?.fullName || 'Utilisateur'"
                  class="h-full w-full object-cover"
                />
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
                    v-for="l in dashboardShortcuts"
                    :key="l.to"
                    :to="l.to"
                    class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    @click="isUserDropdownOpen = false"
                  >
                    <UIcon :name="l.icon" class="h-4 w-4" />
                    {{ l.label }}
                  </NuxtLink>
                  <div class="my-1 border-t border-slate-800" />

                  <NuxtLink
                    :to="`/profile/${user.id || user.sub}`"
                    class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    @click="isUserDropdownOpen = false"
                  >
                    <UIcon name="i-lucide-user" class="h-4 w-4" />
                    Voir mon profil
                  </NuxtLink>
                  <NuxtLink
                    to="/profile/edit"
                    class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    @click="isUserDropdownOpen = false"
                  >
                    <UIcon name="i-lucide-settings" class="h-4 w-4" />
                    Éditer le profil
                  </NuxtLink>
                  <template v-if="userProfile?.role === 'maintainer'">
                    <div class="my-1 border-t border-slate-800" />
                    <NuxtLink
                      to="/dashboard/admin"
                      class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                      @click="isUserDropdownOpen = false"
                    >
                      <UIcon name="i-lucide-layout-dashboard" class="h-4 w-4" />
                      Dashboard Admin
                    </NuxtLink>
                  </template>
                  <NuxtLink
                    to="/legal/privacy"
                    class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                    @click="isUserDropdownOpen = false"
                  >
                    <UIcon name="i-lucide-shield" class="h-4 w-4" />
                    Confidentialité
                  </NuxtLink>
                  <div class="my-1 border-t border-slate-800" />
                  <button
                    @click="logout"
                    class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <UIcon name="i-lucide-log-out" class="h-4 w-4" />
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
            <UIcon
              v-if="!isMobileMenuOpen"
              name="i-lucide-menu"
              class="h-6 w-6"
            />
            <UIcon v-else name="i-lucide-x" class="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>

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
        class="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-4 space-y-4 max-h-[calc(100vh-4rem)] overflow-y-auto"
      >
        <template v-if="user">
          <div class="flex items-center gap-3 px-2 mb-4">
            <div
              class="h-10 w-10 overflow-hidden rounded-full border border-slate-700 bg-slate-800"
            >
              <img
                :src="userProfile?.avatarUrl || DEFAULT_AVATAR"
                :alt="userProfile?.fullName || 'Utilisateur'"
                class="h-full w-full object-cover"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-slate-50 truncate">
                {{ userProfile?.fullName || "Utilisateur" }}
              </p>
              <p class="text-xs text-slate-500 truncate">{{ user.email }}</p>
            </div>
          </div>

          <div class="border-t border-slate-800" />

          <div class="space-y-1">
            <NuxtLink
              v-for="l in dashboardShortcuts"
              :key="l.to"
              :to="l.to"
              class="flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              @click="isMobileMenuOpen = false"
            >
              <UIcon :name="l.icon" class="h-5 w-5" />
              {{ l.label }}
            </NuxtLink>
            <div
              v-if="dashboardShortcuts.length"
              class="my-1 border-t border-slate-800"
            />

            <NuxtLink
              :to="`/profile/${user.id || user.sub}`"
              class="flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              @click="isMobileMenuOpen = false"
            >
              <UIcon name="i-lucide-user" class="h-5 w-5" />
              Voir mon profil
            </NuxtLink>
            <NuxtLink
              to="/profile/edit"
              class="flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              @click="isMobileMenuOpen = false"
            >
              <UIcon name="i-lucide-settings" class="h-5 w-5" />
              Éditer le profil
            </NuxtLink>
            <div class="border-t border-slate-800" />
            <template v-if="userProfile?.role === 'maintainer'">
              <NuxtLink
                to="/dashboard/admin"
                class="flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium text-indigo-400 hover:bg-indigo-500/10"
                @click="isMobileMenuOpen = false"
              >
                <UIcon name="i-lucide-layout-dashboard" class="h-5 w-5" />
                Dashboard Admin
              </NuxtLink>
            </template>
            <!-- Lien confidentialité (toujours visible) -->
            <NuxtLink
              to="/legal/privacy"
              class="flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              @click="isMobileMenuOpen = false"
            >
              <UIcon name="i-lucide-shield" class="h-3.5 w-3.5" />
              Politique de confidentialité
            </NuxtLink>
          </div>

          <div class="pt-4 border-t border-slate-800">
            <button
              @click="logout"
              class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-base font-medium text-rose-400 hover:bg-rose-500/10"
            >
              <UIcon name="i-lucide-log-out" class="h-5 w-5" />
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
