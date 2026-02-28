import { useUIStore } from "@/stores/useUIStore";
import axios from "axios";

export const api = axios.create({
  // This matches the exact port and base path we defined in your Hono index.ts
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080/api",

  // THE MOST IMPORTANT LINE FOR LATER:
  withCredentials: true,

  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  // 1. if the request succeeds, let it pass through
  (response) => response,

  // 2. if the request fails, intercept error before it hits the components
  (error) => {
    // 2.1 check if the server EXPLICITLY rejects the credentials
    if (error.response && error.response.status === 401) {
      console.warn(
        "Session expired or invalid. Triggering authentication wall.",
      );

      // fire zustand openloginmodal from outside react
      useUIStore.getState().openLoginModal();
    }

    return Promise.reject(error);
  },
);
