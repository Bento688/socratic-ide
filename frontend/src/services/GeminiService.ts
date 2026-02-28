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

    // 1. Session expiration
    if (response.status === 401) {
      useUIStore.getState().openLoginModal();
      yield "\n\n*[System: Authentication required. Session expired.]*";
      return;
    }

    // 2. Velocity Throttle (Chat Spam)
    if (response.status === 429) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg =
        errorData.error || "Velocity limit exceeded. Please slow down.";

      // Optionally pop a toast AND print it in the chat
      useUIStore.getState().showToast("error", "Rate limit exceeded");
      yield `\n\n*[System: ${errorMsg}]*`;
      return; // Halt stream
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
