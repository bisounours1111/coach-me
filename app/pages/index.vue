<template>
  <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
    <div class="text-center">
      <h1 class="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
        Progressez avec des coachs vérifiés
      </h1>
      <p class="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
        CoachMe connecte les joueurs passionnés à des coachs experts pour un
        accompagnement personnalisé. Trouvez le mentor idéal, réservez vos
        sessions et améliorez votre niveau.
      </p>
      <div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <NuxtLink
          to="/coachs"
          class="rounded-md bg-indigo-600 px-6 py-3 text-base font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Trouver un coach
        </NuxtLink>
        <NuxtLink
          to="/login"
          class="rounded-md border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Connexion
        </NuxtLink>
        <NuxtLink
          to="/register"
          class="rounded-md border border-indigo-600 px-6 py-3 text-base font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          S'inscrire
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
