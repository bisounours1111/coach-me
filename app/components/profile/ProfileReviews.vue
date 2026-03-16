<template>
  <section class="space-y-6">
    <div class="flex items-center gap-3">
      <UIcon
        name="i-heroicons-star"
        class="h-5 w-5 text-amber-400"
      />
      <h3 class="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
        Avis des élèves
      </h3>
    </div>

    <!-- Average rating -->
    <div
      v-if="reviews.length"
      class="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-5"
    >
      <div class="text-center">
        <p class="text-4xl font-black text-white">{{ averageRating }}</p>
        <div class="mt-1 flex gap-0.5">
          <UIcon
            v-for="i in 5"
            :key="i"
            :name="i <= Math.round(averageRatingNum) ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
            class="h-3.5 w-3.5"
            :class="i <= Math.round(averageRatingNum) ? 'text-amber-400' : 'text-slate-600'"
          />
        </div>
        <p class="mt-1 text-[10px] text-slate-500">
          {{ reviews.length }} avis
        </p>
      </div>
      <div class="h-12 w-px bg-white/10" />
      <p class="text-xs text-slate-400">
        Note moyenne basée sur {{ reviews.length }}
        {{ reviews.length > 1 ? "sessions terminées" : "session terminée" }}.
      </p>
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center"
    >
      <p class="text-sm text-slate-500">Aucun avis pour le moment.</p>
    </div>

    <!-- Reviews list -->
    <div v-if="reviews.length" class="space-y-4">
      <article
        v-for="review in reviews"
        :key="review.id"
        class="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-3"
      >
        <header class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-100"
            >
              <img
                v-if="review.student?.avatarUrl"
                :src="review.student.avatarUrl"
                alt=""
                class="h-8 w-8 rounded-full object-cover"
              />
              <span v-else>{{ initials(review.student?.fullName) }}</span>
            </div>
            <div>
              <p class="text-sm font-semibold text-slate-200">
                {{ review.student?.fullName || "Élève anonyme" }}
              </p>
              <p class="text-[0.65rem] text-slate-500">
                {{ formatDate(review.createdAt) }}
              </p>
            </div>
          </div>
          <div class="flex shrink-0 gap-0.5">
            <UIcon
              v-for="i in 5"
              :key="i"
              :name="i <= review.rating ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
              class="h-3.5 w-3.5"
              :class="i <= review.rating ? 'text-amber-400' : 'text-slate-600'"
            />
          </div>
        </header>
        <p v-if="review.comment" class="text-sm leading-relaxed text-slate-400">
          {{ review.comment }}
        </p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ReviewItem } from "~/composables/useReviews";

const props = defineProps<{ reviews: ReviewItem[] }>();

const averageRatingNum = computed(() => {
  if (!props.reviews.length) return 0;
  return (
    props.reviews.reduce((sum, r) => sum + r.rating, 0) / props.reviews.length
  );
});

const averageRating = computed(() => averageRatingNum.value.toFixed(1));

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));

const initials = (name: string | null | undefined) => {
  if (!name) return "E";
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "E";
};
</script>
