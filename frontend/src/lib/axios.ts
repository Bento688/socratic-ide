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
