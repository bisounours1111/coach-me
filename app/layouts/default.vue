<template>
  <div class="relative min-h-screen overflow-hidden bg-[#050812] text-slate-50">
    <!-- Background gradients -->
    <div class="pointer-events-none absolute inset-0 opacity-90">
      <div class="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(99,102,241,0.14),transparent_60%)]" />
      <div class="absolute inset-0 bg-[radial-gradient(1000px_circle_at_85%_85%,rgba(20,184,166,0.10),transparent_62%)]" />
      <div class="absolute inset-0 app-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_80%)]" />
      <div class="absolute inset-0 app-noise opacity-[0.06]" />
    </div>

    <!-- Content -->
    <div class="relative flex min-h-screen flex-col">
      <AppNavbar />
      <main class="flex-1">
        <slot />
      </main>

      <!-- Footer -->
      <footer class="border-t border-white/5 px-4 py-10">
        <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-indigo-600 text-xs font-black text-white">
              C
            </div>
            <span class="text-sm font-black tracking-wider text-white">CoachMe</span>
          </div>
          <p class="text-[11px] text-slate-600">© 2026 CoachMe. Tous droits réservés.</p>
          <div class="flex gap-6 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <NuxtLink to="/sessions" class="transition hover:text-slate-400">Coachs</NuxtLink>
            <NuxtLink to="/auth/login" class="transition hover:text-slate-400">Connexion</NuxtLink>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>
