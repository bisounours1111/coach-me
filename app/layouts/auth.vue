<template>
  <div class="relative min-h-screen overflow-hidden text-slate-50">
    <!-- Background (palette: 0b0f19 / 1a202c / 6366f1 / 14b8a6 / f43f5e) -->
    <div class="pointer-events-none absolute inset-0 opacity-90">
      <div class="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(99,102,241,0.14),transparent_60%)]" />
      <div class="absolute inset-0 bg-[radial-gradient(1000px_circle_at_85%_85%,rgba(20,184,166,0.10),transparent_62%)]" />
      <div class="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(11,15,25,0.55),rgba(26,32,44,0.95))]" />
      <div class="absolute inset-0 app-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_80%)]" />
      <div class="absolute inset-0 app-noise opacity-[0.06]" />
    </div>

    <div class="relative mx-auto grid min-h-screen max-w-5xl items-center gap-10 px-4 py-10 lg:grid-cols-2">
      <!-- Panneau “marketing” (desktop) -->
      <div class="hidden lg:block">
        <p class="text-xs font-semibold uppercase tracking-[0.35em] text-[#14b8a6]/90">
          Coach Me
        </p>
        <h2 class="mt-4 text-4xl font-semibold tracking-tight">
          Moderne.
          <span class="bg-gradient-to-r from-[#14b8a6] via-[#6366f1] to-[#f43f5e] bg-clip-text text-transparent">
            Rapide.
          </span>
          Clair.
        </h2>
        <p class="mt-4 max-w-md text-sm leading-relaxed text-slate-200/80">
          Une expérience d’auth simple, propre, et orientée produit — prête pour la redirection par rôle
          (élève / coach).
        </p>

        <div class="mt-8 grid max-w-md gap-3">
          <div class="rounded-xl border border-white/10 bg-[#0b0f19]/40 p-4 backdrop-blur">
            <p class="text-xs font-medium text-slate-100">Sécurité avancée</p>
            <p class="mt-1 text-xs text-slate-200/70">Sessions et accès gérés de façon fiable et sécurisée.</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-[#0b0f19]/40 p-4 backdrop-blur">
            <p class="text-xs font-medium text-slate-100">UI réutilisable</p>
            <p class="mt-1 text-xs text-slate-200/70">Composants de champs réutilisés partout dans l’app.</p>
          </div>
        </div>
      </div>

      <div class="flex justify-center lg:justify-end">
        <slot />
      </div>
    </div>
  </div>
</template>

