<template>
  <div class="space-y-1.5">
    <label :for="id" class="text-xs font-medium text-slate-200/90">
      {{ label }}
    </label>
    <div class="relative">
      <input
        :id="id"
        v-model="localValue"
        :type="visible ? 'text' : 'password'"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 pr-20 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#6366f1]/55 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.12)]"
        required
      />
      <button
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[0.7rem] font-medium text-slate-100/90 transition hover:bg-white/10"
        @click="visible = !visible"
      >
        {{ visible ? "Masquer" : "Afficher" }}
      </button>
    </div>
    <p v-if="hint" class="text-[0.7rem] leading-relaxed text-slate-200/55">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue?: string;
    label: string;
    id: string;
    placeholder?: string;
    autocomplete?: string;
    hint?: string;
  }>(),
  {
    modelValue: "",
    placeholder: "••••••••",
    autocomplete: "current-password",
    hint: undefined,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const visible = ref(false);

const localValue = computed({
  get: () => props.modelValue ?? "",
  set: (value: string) => emit("update:modelValue", value),
});
</script>

