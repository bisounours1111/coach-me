// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  modules: ["@nuxt/ui", "@nuxtjs/supabase"],

  css: ["~/assets/css/main.css"],

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SECRET_KEY,
    redirectOptions: {
      login: "/auth/login",
      callback: "/confirm",
      exclude: ["/"],
    },
    redirect: false,
  },
});
