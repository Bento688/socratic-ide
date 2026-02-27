import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Code2,
  AlertCircle,
  Sparkles,
  BrainCircuit,
  HeartHandshake,
  Hash,
  X,
  RefreshCw,
  Layers,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "../ui/Button";
import { sendMessageStream } from "../../services/GeminiService";
import { Message, ChatStatus, Persona } from "../../types";
import { useSessionStore } from "../../stores/useSessionStore";
import { useUIStore } from "../../stores/useUIStore";
import { api } from "../../lib/axios";

const ChatInterface: React.FC = () => {
  // wire up ui store
  const showToast = useUIStore((state) => state.showToast);

  // wire up session store actions
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const setCode = useSessionStore((state) => state.setCode);
  const syncCurrentCodeToDB = useSessionStore(
    (state) => state.syncCurrentCodeToDB,
  );
  const setActiveTask = useSessionStore((state) => state.setActiveTask);
  const setLanguage = useSessionStore((state) => state.setLanguage);
  const setPersona = useSessionStore((state) => state.setPersona);
  const advanceToNextLevel = useSessionStore(
    (state) => state.advanceToNextLevel,
  );
  const addMessage = useSessionStore((state) => state.addMessage);
  const updateMessage = useSessionStore((state) => state.updateMessage);
  const setMessages = useSessionStore((state) => state.setMessages);

  // wire up specific derived session states
  const code = useSessionStore((state) => {
    const session = state.sessions.find((s) => s.id === state.activeSessionId);
    return session ? session.history[session.currentStep].code : "";
  });

  const activeTask = useSessionStore((state) => {
    const session = state.sessions.find((s) => s.id === state.activeSessionId);
    return session ? session.history[session.currentStep].activeTask : "";
  });

  const persona = useSessionStore((state) => {
    const session = state.sessions.find((s) => s.id === state.activeSessionId);
    return session ? session.persona : null;
  });

  const messages = useSessionStore((state) => {
    const session = state.sessions.find((s) => s.id === state.activeSessionId);
    return session ? session.messages : [];
  });

  const [input, setInput] = useState("");
  const [status, setStatus] = useState<ChatStatus>(ChatStatus.IDLE);
  const [pendingPersona, setPendingPersona] = useState<Persona>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, status, persona]);

  // Handle Request to Change Persona
  const initiatePersonaSwitch = (newPersona: Persona) => {
    // If no active session (onboarding), switch immediately
    if (messages.length === 0) {
      handleSelectPersona(newPersona);
      return;
    }
    // Otherwise, show confirmation
    if (newPersona !== persona) {
      setPendingPersona(newPersona);
    }
  };

  // Execute the Persona Switch (Handover)
  const confirmPersonaSwitch = async () => {
    if (!pendingPersona) return;

    const oldPersona = persona;
    const newPersona = pendingPersona;

    // 1. Update State
    setPersona(newPersona);
    setPendingPersona(null);
    setStatus(ChatStatus.STREAMING);

    // 2. Add System Divider
    addMessage({
      id: `sys-switch-${Date.now()}`,
      role: "system",
      content: `Switched to ${newPersona}`,
    });

    // 3. Re-initialize Chat with HISTORY
    // We pass the existing messages so the new bot knows the context
    // We construct the array manually to ensure the latest system message is included
    // before the context update propagates.
    const currentMsgs = [
      ...messages,
      {
        id: `sys-switch-${Date.now()}`,
        role: "system" as const,
        content: `Switched to ${newPersona}`,
      },
    ];

    // 4. Trigger Handover Response
    const modelMessageId = `handover-${Date.now()}`;
    addMessage({
      id: modelMessageId,
      role: "model",
      content: "",
      isStreaming: true,
    });

    const handoverPrompt = `[SYSTEM: The user has explicitly switched the active mentor from ${oldPersona} to YOU (${newPersona}). 
    Read the previous conversation history. 
    1. Acknowledge the switch immediately. 
    2. Make a sassy or grumpy comment about your predecessor (Helios thinks Athena is crazy; Athena thinks Helios is trying to steal your attention).
    3. Ask the user how you can help with the current code.]`;

    let fullResponse = "";

    try {
      const stream = sendMessageStream(
        handoverPrompt,
        newPersona,
        activeSessionId,
        code,
        currentMsgs,
      );

      for await (const chunk of stream) {
        fullResponse += chunk;
        const visibleContent = fullResponse.split("|||JSON|||")[0];

        updateMessage(modelMessageId, { content: visibleContent });
      }

      updateMessage(modelMessageId, { isStreaming: false });
      setStatus(ChatStatus.IDLE);
    } catch (e) {
      console.error("Handover failed", e);
      setStatus(ChatStatus.ERROR);
      updateMessage(modelMessageId, {
        isStreaming: false,
        content: "*[Connection Terminated]*",
      });
    }
  };

  // Initial Selection (Onboarding)
  const handleSelectPersona = (p: Persona) => {
    setPersona(p);

    const greeting =
      p === "helios"
        ? "### System Online\nI am **Helios**. I assume you want to learn something, or you just like being roasted. \n\n> What topic or language do you want to tackle today?"
        : "### There you are! 💖\nI am **Athena**. I've been waiting *forever* for you. 🥺\nI'll teach you everything, so don't look at anyone else, okay?\n\n> What are we building together today?";

    // We use setMessages here to reset the thread for the initial onboarding
    setMessages([
      {
        id: "welcome",
        role: "model",
        content: greeting,
      },
    ]);

    setActiveTask("Waiting for topic selection...");
    setCode("// Tell your mentor what you want to learn in the chat...");
  };

  const handleSend = async (text: string, isReview: boolean = false) => {
    if ((!text.trim() && !isReview) || status === ChatStatus.STREAMING) return;
    if (!persona) return;

    // sync user's current draft to MySQL
    syncCurrentCodeToDB();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: isReview ? "Review my code." : text,
    };

    addMessage(userMessage);
    setInput("");
    setStatus(ChatStatus.STREAMING);

    const modelMessageId = (Date.now() + 1).toString();
    addMessage({
      id: modelMessageId,
      role: "model",
      content: "",
      isStreaming: true,
    });

    let fullResponse = "";

    try {
      const currentMsgs = [...messages, userMessage];

      const stream = sendMessageStream(
        text,
        persona,
        activeSessionId,
        code,
        currentMsgs,
        isReview,
      );

      for await (const chunk of stream) {
        fullResponse += chunk;
        const visibleContent = fullResponse.split("|||JSON|||")[0];

        updateMessage(modelMessageId, { content: visibleContent });
      }

      const parts = fullResponse.split("|||JSON|||");
      if (parts.length > 1) {
        try {
          const metadataStr = parts[1].trim();
          const jsonStart = metadataStr.indexOf("{");
          const jsonEnd = metadataStr.lastIndexOf("}") + 1;

          if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonStr = metadataStr.substring(jsonStart, jsonEnd);

            // --- INJECT OBSERVABILITY HERE ---
            console.log("RAW JSON STRING FROM LLM:", jsonStr);
            // ---------------------------------

            const metadata = JSON.parse(jsonStr);

            const nextObjective = metadata.newObjective || "Next Task";
            const nextCode = metadata.newSnippet || code;
            const nextLang = metadata.language || "javascript";

            // Check if we are in the onboarding phase based on the current task title
            const isOnboarding =
              activeTask === "Waiting for topic selection..." ||
              activeTask === "Pending Onboarding...";

            if (
              metadata.pass === true ||
              (isOnboarding && metadata.newSnippet)
            ) {
              // Determine toast message based on context
              const toastMessage = isOnboarding
                ? "Topic Initialized"
                : "Objective Complete";
              showToast("success", toastMessage);

              const systemMsg: Message = {
                id: `sys-${Date.now()}`,
                role: "system",
                content: `🎯 Current Task: ${nextObjective}`,
              };

              // 1. Update Local UI
              setMessages((prev) => {
                const targetIndex = prev.findIndex(
                  (m) => m.id === modelMessageId,
                );
                if (targetIndex !== -1) {
                  const newArr = [...prev];
                  newArr.splice(targetIndex + 1, 0, systemMsg);
                  return newArr;
                }
                return [...prev, systemMsg];
              });

              // 2. save the divider to the DB permanently
              api
                .post("/chat/system", {
                  workspaceId: activeSessionId,
                  content: nextObjective,
                })
                .catch((err) =>
                  console.error("Failed to save system message:", err),
                );

              setTimeout(() => {
                advanceToNextLevel(nextObjective, nextCode, nextLang);
              }, 1000);
            } else {
              if (isReview) {
                showToast("error", "Revision Needed. Check feedback.");
              }
              if (metadata.newObjective) setActiveTask(metadata.newObjective);
              if (metadata.language) setLanguage(metadata.language);
              // Only update code if explicitly provided and we aren't passing a level (passing handles update via advanceToNextLevel)
              if (metadata.newSnippet && metadata.pass !== true) {
                setCode(metadata.newSnippet);

                // silently sync the AI's hint to MySQL
                setTimeout(() => {
                  syncCurrentCodeToDB();
                }, 100);
              }
            }
          }
        } catch (e) {
          console.error("Failed to parse metadata:", e);
        }
      }

      updateMessage(modelMessageId, { isStreaming: false });
      setStatus(ChatStatus.IDLE);
    } catch (error) {
      console.error("Chat error:", error);
      setStatus(ChatStatus.ERROR);
      updateMessage(modelMessageId, {
        content: fullResponse + "\n\n*[Connection Terminated]*",
        isStreaming: false,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  // --- RENDER: ONBOARDING ---
  if (!persona && messages.length === 0) {
    return (
      <div className="flex flex-col h-full bg-[#09090b] text-zinc-300 border-l border-zinc-900 items-center justify-center p-8">
        <h2 className="text-xl font-bold text-white mb-8 tracking-tight">
          Select Your Mentor
        </h2>
        <div className="grid grid-cols-1 gap-6 w-full max-w-sm">
          <button
            onClick={() => initiatePersonaSwitch("helios")}
            className="group relative p-6 bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-900 rounded-sm text-left transition-all duration-300"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-10 h-10 bg-[#09090b] border border-zinc-700 rounded-sm flex items-center justify-center group-hover:border-emerald-500 transition-colors">
                <BrainCircuit className="w-5 h-5 text-zinc-400 group-hover:text-emerald-500" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">HELIOS</h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                  Senior Staff Engineer
                </p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Strict, dry, and refuses to write code for you. Best for those who
              want to be challenged.
            </p>
          </button>
          <button
            onClick={() => initiatePersonaSwitch("athena")}
            className="group relative p-6 bg-zinc-900/50 border border-zinc-800 hover:border-purple-500/50 hover:bg-zinc-900 rounded-sm text-left transition-all duration-300"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-10 h-10 bg-[#09090b] border border-zinc-700 rounded-sm flex items-center justify-center group-hover:border-purple-500 transition-colors">
                <HeartHandshake className="w-5 h-5 text-zinc-400 group-hover:text-purple-500" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">ATHENA</h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                  Obsessive Prodigy
                </p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Obsessive, cute, and possessive. She wants your code (and your
              attention) all to herself.
            </p>
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER: MAIN CHAT ---
  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-300 border-l border-zinc-900 relative">
      {/* Switch Confirmation Modal */}
      {pendingPersona && (
        <div className="absolute inset-0 z-50 bg-[#09090b]/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-sm shadow-2xl max-w-xs w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-sm uppercase tracking-wider">
                Confirm Handover
              </h3>
              <button
                onClick={() => setPendingPersona(null)}
                className="text-zinc-500 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Are you sure you want to switch to
              <span
                className={
                  pendingPersona === "helios"
                    ? " text-emerald-400 font-bold"
                    : " text-purple-400 font-bold"
                }
              >
                {" "}
                {pendingPersona.toUpperCase()}
              </span>
              ?
              <br />
              <br />
              The current mentor might be offended, but the history will be
              preserved.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setPendingPersona(null)}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                className="flex-1 bg-white text-black hover:bg-zinc-200"
                onClick={confirmPersonaSwitch}
              >
                Switch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-[#09090b] shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className={`w-8 h-8 rounded-sm bg-zinc-900 flex items-center justify-center border border-zinc-800`}
            >
              <Sparkles
                className={`w-4 h-4 ${persona === "helios" ? "text-emerald-500" : "text-purple-500"}`}
              />
            </div>
          </div>
          <div>
            <h2 className="font-bold text-white text-sm tracking-tight leading-none uppercase">
              {persona}
            </h2>
            <p className="text-[10px] text-zinc-600 font-mono mt-1">ONLINE</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              initiatePersonaSwitch(persona === "helios" ? "athena" : "helios")
            }
            className="hidden sm:flex items-center gap-2 border-zinc-800 opacity-50 hover:opacity-100"
            disabled={status === ChatStatus.STREAMING}
          >
            <RefreshCw size={10} />
            <span className="font-mono text-[10px]">SWITCH</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSend("", true)}
            disabled={status === ChatStatus.STREAMING}
            className="hidden sm:flex items-center gap-2 border-zinc-800"
          >
            <Code2 size={12} />
            <span className="font-mono text-[10px] uppercase tracking-wider">
              Audit
            </span>
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-thin">
        {messages.map((msg) => {
          if (msg.role === "system") {
            // Enhanced System Message Visualization
            return (
              <div
                key={msg.id}
                className="flex flex-col items-center gap-2 my-8 select-none animate-in fade-in slide-in-from-bottom-2 duration-500"
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="h-px bg-linear-to-r from-transparent via-zinc-800 to-transparent flex-1" />
                  <div className="bg-zinc-900/80 border border-zinc-800/50 px-4 py-1.5 rounded-full flex items-center gap-3 shadow-sm backdrop-blur-sm">
                    <Layers
                      size={12}
                      className={
                        persona === "helios"
                          ? "text-emerald-500"
                          : "text-purple-500"
                      }
                    />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
                      {msg.content}
                    </span>
                  </div>
                  <div className="h-px bg-linear-to-r from-transparent via-zinc-800 to-transparent flex-1" />
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`w-6 h-6 rounded-sm flex items-center justify-center shrink-0 mt-0.5 ${
                  msg.role === "user"
                    ? "bg-white text-black"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                }`}
              >
                {msg.role === "user" ? <User size={12} /> : <Bot size={12} />}
              </div>

              <div
                className={`flex flex-col max-w-[85%] space-y-1 ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`text-sm font-light ${
                    msg.role === "user"
                      ? "text-zinc-100 bg-zinc-900/50 px-3 py-2 rounded-sm border border-zinc-800"
                      : "text-zinc-300 w-full"
                  }`}
                >
                  {msg.role === "model" ? (
                    <div className="w-full">
                      <ReactMarkdown
                        components={{
                          h1: ({ node, ...props }) => (
                            <h1
                              className="text-xl font-bold text-white mb-4 mt-2 tracking-tight"
                              {...props}
                            />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2
                              className="text-lg font-bold text-white mb-3 mt-5 first:mt-0 tracking-tight"
                              {...props}
                            />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3
                              className="text-sm font-bold text-zinc-100 mb-2 mt-4 uppercase tracking-wider border-b border-zinc-800 pb-1 w-fit"
                              {...props}
                            />
                          ),
                          p: ({ node, ...props }) => (
                            <p
                              className="mb-4 last:mb-0 leading-7 text-zinc-300/90 font-normal"
                              {...props}
                            />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul
                              className="list-disc pl-4 mb-4 space-y-2 text-zinc-300 marker:text-zinc-600"
                              {...props}
                            />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol
                              className="list-decimal pl-4 mb-4 space-y-2 text-zinc-300 marker:text-zinc-600"
                              {...props}
                            />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="pl-1 leading-7" {...props} />
                          ),
                          blockquote: ({ node, ...props }) => (
                            <blockquote
                              className={`border-l-2 pl-4 py-2 my-4 rounded-r-sm ${persona === "helios" ? "border-emerald-500/50 bg-emerald-950/5 text-emerald-400" : "border-purple-500/50 bg-purple-950/5 text-purple-400"}`}
                              {...props}
                            >
                              <div className="font-medium italic">
                                {props.children}
                              </div>
                            </blockquote>
                          ),
                          code: ({ node, ...props }) => {
                            const { inline, className, children } =
                              props as any;
                            const match = /language-(\w+)/.exec(
                              className || "",
                            );
                            return !inline ? (
                              <div className="relative my-4 rounded-sm border border-zinc-800 bg-[#0c0c0e] overflow-hidden group">
                                <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/30">
                                  <span className="text-[10px] text-zinc-500 font-mono uppercase">
                                    {match?.[1] || "code"}
                                  </span>
                                </div>
                                <pre className="p-3 overflow-x-auto text-xs font-mono text-zinc-300 leading-relaxed">
                                  <code>{children}</code>
                                </pre>
                              </div>
                            ) : (
                              <code
                                className="bg-white/5 text-zinc-200 px-1.5 py-0.5 rounded-xs font-mono text-[0.85em] align-baseline border border-white/5 mx-0.5"
                                {...props}
                              />
                            );
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                      {msg.isStreaming && (
                        <span className="inline-block w-1.5 h-3 ml-1 bg-white animate-pulse align-middle"></span>
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {status === ChatStatus.ERROR && (
          <div className="flex items-center justify-center gap-2 text-red-500 text-xs py-2 font-mono uppercase tracking-widest border border-red-900/20 bg-red-950/5 mx-auto w-fit px-4 rounded-sm">
            <AlertCircle size={12} />
            <span>Connection Terminated</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-zinc-900 bg-[#09090b] shrink-0">
        <div className="relative group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-sm pl-4 pr-12 py-3 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-zinc-600 focus:ring-0 resize-none scrollbar-thin transition-colors"
            rows={1}
            style={{ minHeight: "48px", maxHeight: "150px" }}
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || status === ChatStatus.STREAMING}
            className="absolute right-2 bottom-2 p-1.5 text-zinc-500 hover:text-black hover:bg-white rounded-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-zinc-700"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
