<template>
  <div class="min-h-screen bg-slate-950 text-slate-50">
    <!-- Hero -->
    <section class="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-16 md:flex-row md:items-center">
      <div class="flex-1 space-y-6">
        <p class="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-400">
          CoachMe · Alpha
        </p>
        <h1 class="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Test Tailwind &
          <span class="bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
            Nuxt 4
          </span>
        </h1>
        <p class="max-w-xl text-base text-slate-300 sm:text-lg">
          Cette page sert juste à vérifier que Tailwind fonctionne correctement :
          typographie, couleurs, boutons, cartes et layout responsive.
        </p>

        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 hover:shadow-indigo-400/40"
          >
            Bouton primaire
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-full border border-slate-600 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-400 hover:bg-slate-800"
          >
            Bouton secondaire
          </button>
          <span class="inline-flex items-center rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30">
            Tailwind chargé ✔
          </span>
        </div>
      </div>

      <!-- Carte de test -->
      <div class="flex-1">
        <div class="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/70 to-slate-900/30 p-6 shadow-xl shadow-black/40 backdrop-blur">
          <p class="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
            Aperçu UI
          </p>
          <h2 class="mt-3 text-lg font-semibold text-slate-50">
            Carte de test CoachMe
          </h2>
          <p class="mt-2 text-sm text-slate-300">
            Si tu vois des bordures arrondies, un dégradé, des ombres et des couleurs
            indigo/émeraude, Tailwind fonctionne.
          </p>

          <div class="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
            <div class="space-y-1 rounded-xl bg-slate-900/60 p-3">
              <p class="text-[0.7rem] font-medium uppercase tracking-wide text-slate-400">
                Typographie
              </p>
              <p class="font-semibold text-slate-50">text-*, font-bold, tracking-*</p>
            </div>
            <div class="space-y-1 rounded-xl bg-slate-900/60 p-3">
              <p class="text-[0.7rem] font-medium uppercase tracking-wide text-slate-400">
                Layout
              </p>
              <p class="font-semibold text-slate-50">flex, grid, gap, padding</p>
            </div>
            <div class="space-y-1 rounded-xl bg-slate-900/60 p-3">
              <p class="text-[0.7rem] font-medium uppercase tracking-wide text-slate-400">
                Couleurs
              </p>
              <p class="font-semibold text-slate-50">bg-*, text-*, ring-*</p>
            </div>
            <div class="space-y-1 rounded-xl bg-slate-900/60 p-3">
              <p class="text-[0.7rem] font-medium uppercase tracking-wide text-slate-400">
                Effets
              </p>
              <p class="font-semibold text-slate-50">shadow, backdrop-blur, gradients</p>
            </div>
          </div>

          <div class="mt-5 flex items-center justify-between border-t border-slate-800 pt-4 text-xs text-slate-400">
            <span>Nuxt 4 · Tailwind 3</span>
            <span class="rounded-full bg-slate-900 px-3 py-1 text-[0.7rem] font-medium text-slate-200">
              Page de test
            </span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

