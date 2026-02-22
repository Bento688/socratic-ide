import axios from "axios";

export const api = axios.create({
  baseURL: process.env.VITE_API_URL || "http://localhost:8080/api",
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// interceptors
// outbound : frontend => backend
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// inbound : backend => frontend
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // TODO : trigger logout or token refresh
      console.warn("Unauthorized! Redirecting to login...");
    }
    return Promise.reject(error);
  },
);
