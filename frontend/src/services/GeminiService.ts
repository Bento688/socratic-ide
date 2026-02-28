import { useUIStore } from "@/stores/useUIStore";
import { Persona, Message } from "../types";

export const sendMessageStream = async function* (
  message: string,
  currentPersona: Persona,
  workspaceId: string,
  code: string = "",
  history: Message[] = [],
  isReview: boolean = false,
) {
  try {
    // =====================
    // FORMULATING RESPONSES
    // =====================
    const response = await fetch(`${import.meta.env.VITE_API_URL}/chat`, {
      method: "POST",

      credentials: "include",

      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceId: workspaceId,
        prompt: message,
        persona: currentPersona,
        code: code,
        history: history,
        isReview,
      }),
    });

    // =========================
    // AFTER RECEIVING RESPONSES
    // =========================

    // === (ERROR: 401 Unauthorized) ===
    if (response.status === 401) {
      useUIStore.getState().openLoginModal();
      yield "\n\n*[System: Authentication required. Session expired.]*";
      return;
    }

    // === (ERROR: 429 Too many requests) ===
    if (response.status === 429) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg =
        errorData.error || "Velocity limit exceeded. Please slow down.";

      // Optionally pop a toast AND print it in the chat
      useUIStore.getState().showToast("error", "Rate limit exceeded");
      yield `\n\n*[System: ${errorMsg}]*`;
      return; // Halt stream
    }

    // === (ERROR: 402 Payment required) ===
    if (response.status === 402) {
      const errorData = await response.json().catch(() => ({}));

      let timeString = "tomorrow";

      if (errorData.unlockTime) {
        // === trigger global modal with timestamp ===
        useUIStore.getState().openQuotaModal(errorData.unlockTime);
      }

      yield `\n\n*[System: Daily energy depleted. See the pop-up for details.]*`;
      return; // == halt the generator ==
    }

    if (!response.ok || !response.body) {
      throw new Error("Network response was not ok");
    }

    // Native browser stream reader to process the Hono stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value, { stream: true });
    }
  } catch (error) {
    console.error("Error sending message to backend:", error);
    yield "\n\n*[Connection Error]*";
  }
};
