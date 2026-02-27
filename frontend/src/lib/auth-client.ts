import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_API_URL,
});

// specific hooks and functions to use in the UI
export const { signIn, signUp, signOut, useSession } = authClient;
