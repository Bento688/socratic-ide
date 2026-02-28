import { create } from "zustand";
import { Toast, ToastType } from "../types";

interface UIState {
  // --- State ---
  toasts: Toast[];
  isTerminalOpen: boolean;
  isLoginModalOpen: boolean;

  // --- Actions ---
  setIsTerminalOpen: (isOpen: boolean) => void;
  showToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial State
  toasts: [],
  isTerminalOpen: true, // Default to true, matching your original context
  isLoginModalOpen: false,

  // Actions
  setIsTerminalOpen: (isOpen) => set({ isTerminalOpen: isOpen }),

  showToast: (type, message) => {
    const id = Date.now().toString() + Math.random().toString();

    // 1. Add the new toast
    set((state) => ({
      toasts: [...state.toasts, { id, type, message }],
    }));

    // 2. Auto-remove after 4 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  openLoginModal: () => set({ isLoginModalOpen: true }),

  closeLoginModal: () => set({ isLoginModalOpen: false }),
}));
