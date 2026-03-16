<template>
  <div class="space-y-1.5">
    <label :for="id" class="text-xs font-medium text-slate-200/90">
      {{ label }}
    </label>
    <input
      :id="id"
      v-model="localValue"
      :type="type"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      class="w-full rounded-xl border border-white/10 bg-[#0b0f19]/45 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-400/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition focus:border-[#14b8a6]/50 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.12)]"
      :required="required"
    />
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
    type?: "text" | "email";
    placeholder?: string;
    autocomplete?: string;
    inputmode?: "text" | "email";
    hint?: string;
    required?: boolean;
  }>(),
  {
    modelValue: "",
    type: "text",
    placeholder: "",
    autocomplete: "off",
    inputmode: "text",
    hint: undefined,
    required: true,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const localValue = computed({
  get: () => props.modelValue ?? "",
  set: (value: string) => emit("update:modelValue", value),
});
</script>

