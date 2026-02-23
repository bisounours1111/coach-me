<template>
  <nav class="border-b border-gray-200 bg-white">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 items-center justify-between">
        <!-- Logo / Brand -->
        <NuxtLink to="/" class="flex items-center gap-2 font-bold text-indigo-600">
          <span class="text-xl">CoachMe</span>
        </NuxtLink>

        <!-- Navigation links -->
        <div class="hidden md:flex md:items-center md:gap-6">
          <NuxtLink
            to="/"
            class="text-gray-600 hover:text-indigo-600 transition-colors"
          >
            Accueil
          </NuxtLink>
          <NuxtLink
            to="/coachs"
            class="text-gray-600 hover:text-indigo-600 transition-colors"
          >
            Trouver un coach
          </NuxtLink>

          <!-- User menu (si connecté) -->
          <template v-if="user">
            <NuxtLink
              to="/dashboard"
              class="text-gray-600 hover:text-indigo-600 transition-colors"
            >
              Mon espace
            </NuxtLink>
            <button
              type="button"
              class="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              @click="handleLogout"
            >
              Déconnexion
            </button>
          </template>

          <!-- Login / Register (si non connecté) -->
          <template v-else>
            <NuxtLink
              to="/login"
              class="text-gray-600 hover:text-indigo-600 transition-colors"
            >
              Connexion
            </NuxtLink>
            <NuxtLink
              to="/register"
              class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              S'inscrire
            </NuxtLink>
          </template>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
const user = useSupabaseUser()
const supabase = useSupabaseClient()

async function handleLogout() {
  await supabase.auth.signOut()
  await navigateTo('/')
}
</script>
