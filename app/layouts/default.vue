<template>
  <div class="app-gaming relative min-h-screen overflow-hidden text-slate-50">
    <div class="pointer-events-none absolute inset-0 opacity-90">
      <div class="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(99,102,241,0.14),transparent_60%)]" />
      <div class="absolute inset-0 bg-[radial-gradient(1000px_circle_at_85%_85%,rgba(20,184,166,0.10),transparent_62%)]" />
      <div class="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(11,15,25,0.55),rgba(26,32,44,0.95))]" />
      <div class="absolute inset-0 app-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_80%)]" />
      <div class="absolute inset-0 app-noise opacity-[0.06]" />
    </div>

    <div class="relative">
      <slot />
    </div>
  </div>
</template>

