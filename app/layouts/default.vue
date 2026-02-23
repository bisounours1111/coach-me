<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />
    <main class="flex-1">
      <slot />
    </main>
    <footer class="border-t border-gray-200 py-6 text-center text-sm text-gray-500">
      © {{ new Date().getFullYear() }} CoachMe — Mise en relation joueurs & coachs
    </footer>
  </div>
</template>
