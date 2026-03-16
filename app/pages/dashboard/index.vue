<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const user = useSupabaseUser();
const { getUserRole } = useProfile();

const role = await getUserRole(user.value!.id);

if (role === "maintainer") {
  await navigateTo("/dashboard/admin", { replace: true });
} else if (role === "coach") {
  await navigateTo("/dashboard/coach", { replace: true });
} else {
  await navigateTo("/dashboard/student", { replace: true });
}
</script>
