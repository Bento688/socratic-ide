import { Persona, Message } from "../types";

export const sendMessageStream = async function* (
  message: string,
  currentPersona: Persona,
  code: string = "",
  history: Message[] = [],
) {
  try {
    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: message,
        persona: currentPersona,
        code: code,
        history: history,
      }),
    });

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
