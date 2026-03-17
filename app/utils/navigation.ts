import type { Router } from "vue-router";
import type { UserRole } from "../../../types/auth";

export const redirectByRole = async (
  router: Router,
  userRole: UserRole | null | undefined,
) => {
  if (userRole === "maintainer") {
    await router.push("/dashboard/admin");
    return;
  }

  await router.push("/games");
};
