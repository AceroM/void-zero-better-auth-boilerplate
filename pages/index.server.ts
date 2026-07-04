import { defineHandler, defineHead, type InferProps } from "void";
import { getUser } from "void/auth";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async () => {
  const user = getUser();
  return {
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
        }
      : null,
  };
});

export const head = defineHead(() => ({
  title: "Dashboard",
}));
