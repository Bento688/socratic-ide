import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  Session,
  Message,
  Persona,
  HistoryStep,
  LogType,
  LogEntry,
} from "../types";
import { api } from "../lib/axios";
import { useUIStore } from "@/stores/useUIStore";

/**
 * --- INTERFACES FOR WHAT THE BACKEND RETURNS ---
 */
interface DBWorkspace {
  id: string;
  persona: Persona;
  userId: string;
  updatedAt: string;
  workspaceLevels?: { taskTitle: string }[];
}

// the exact shape of a message row from MySQL
interface DBMessage {
  id: string;
  role: "user" | "model" | "system";
  content: string;
  createdAt: string;
  workspaceId: string;
}

// the exact shape of a level row from MySQL
interface DBWorkspaceLevel {
  id: string;
  stepNumber: number;
  taskTitle: string;
  codeSnapshot: string;
  language: string;
  workspaceId: string;
}

/**
 * * HELPER TO CREATE INITIAL SESSION
 *
 * @param id
 * @param persona
 * @param title
 * @returns
 */
const createInitialSession = (
  id: string,
  persona: Persona = null,
  title: string = "New Tab",
): Session => ({
  id,
  title,
  persona,
  history: [
    {
      code: "// Select a mentor to begin...",
      activeTask: "Pending Onboarding...",
      language: "javascript",
    },
  ],
  currentStep: 0,
  messages: [],
  logs: [],
});

/**
 * Session State Interface
 */
interface SessionState {
  hasInitialized: boolean;
  // --- State ---
  sessions: Session[];
  activeSessionId: string;
  deletingIds: string[];

  // --- Tab Management ---
  addSession: () => void;
  removeSession: (id: string) => Promise<void>;
  switchSession: (id: string) => void;
  updateSessionTitle: (id: string, title: string) => void;

  // --- Bootstrapping & Data Fetching ---
  loadSessions: () => Promise<void>;
  fetchWorkspacePayload: (id: string) => Promise<void>;

  // --- Workspace Actions (Operating on the Active Session) ---
  setCode: (newCode: string) => void;
  syncCurrentCodeToDB: () => void;
  setActiveTask: (newTask: string) => void;
  setLanguage: (newLang: string) => void;
  setPersona: (newPersona: Persona) => void;

  // --- History Navigation ---
  navigateHistory: (direction: -1 | 1) => void;
  advanceToNextLevel: (
    newTask: string,
    newCode: string,
    newLanguage: string,
  ) => void;

  // --- Chat Actions ---
  addMessage: (msg: Message) => void;
  updateMessage: (msgId: string, updates: Partial<Message>) => void;
  setMessages: (msgsOrFn: Message[] | ((prev: Message[]) => Message[])) => void;

  // --- Terminal Actions ---
  addLog: (type: LogType, message: string) => void;
  clearLogs: () => void;
}

/**
 * Session State Store
 */
export const useSessionStore = create<SessionState>()(
  immer((set, get) => ({
    // Initial State
    hasInitialized: false,
    sessions: [createInitialSession("default-session")],
    activeSessionId: "default-session",
    deletingIds: [],

    // --- Bootstrapping & fetching data ---
    loadSessions: async () => {
      // if the app has finished initializing, return true immediately (to prevent strict mode from firing twice)
      if (get().hasInitialized) return;

      // lock the state so that the second mount is ignored
      set((draft) => {
        draft.hasInitialized = true;
      });

      try {
        const response = await api.get("/workspaces");
        const dbWorkspaces = response.data.workspaces;

        // scenario A: db is completely empty (first time user)
        if (dbWorkspaces.length === 0) {
          // 1. provision a real bucket in MySQL immediately
          const newWsResponse = await api.post("/workspaces", {
            persona: "helios",
          });
          const realDbId = newWsResponse.data.workspace.id;

          // 2. overwrite the frontend ghost session with the real ID
          set((draft) => {
            // pass 'null' for the persona so that the UI detects that the user
            // hasn't made a choice yet
            const initialSession = createInitialSession(
              realDbId,
              null,
              "New Tab",
            );

            draft.sessions = [initialSession];
            draft.activeSessionId = realDbId;
          });

          return;
        }

        // scenario B: the user has existing workspaces
        set((draft) => {
          // map db rows into zustand session objects
          draft.sessions = dbWorkspaces.map((ws: DBWorkspace) => {
            // check of the workspace has started any levels
            const hasStarted =
              ws.workspaceLevels && ws.workspaceLevels.length > 0;

            // extract the title safely, defaulting to "New Tab" if no levels exist yet
            let tabTitle = "New Tab";
            if (hasStarted) {
              const rawTitle = ws.workspaceLevels![0].taskTitle;
              tabTitle =
                rawTitle.length > 15
                  ? rawTitle.substring(0, 15) + "..."
                  : rawTitle;
            }

            return {
              id: ws.id,
              title: tabTitle,
              persona: hasStarted ? ws.persona : null, // preserved from MySQL
              history: [
                {
                  code: hasStarted
                    ? `// Establishing secure connection...\n// Restoring ${ws.persona} workspace state...\n`
                    : "// Select a mentor to begin...",
                  activeTask: hasStarted
                    ? "Loading Workspace..."
                    : "Pending Onboarding...", // Still safely bypasses onboarding!
                  language: "javascript",
                },
              ],
              currentStep: 0,
              messages: hasStarted
                ? [
                    {
                      id: `sys-restore-${ws.id}`,
                      role: "system", // System role renders cleaner for loading states
                      content: `*Synchronizing chat history from server...*`,
                    },
                  ]
                : [],
              logs: [],
            };
          });

          // set the most recently updated workspace as the active tab
          draft.activeSessionId = dbWorkspaces[0].id;
        });

        await get().fetchWorkspacePayload(dbWorkspaces[0].id);
      } catch (error) {
        console.error("Failed to load workspaces from database:", error);
      }
    },

    fetchWorkspacePayload: async (id) => {
      try {
        const response = await api.get(`/workspaces/${id}`);
        const { messages, workspaceLevels } = response.data.workspace; // extract the payload

        set((draft) => {
          const session = draft.sessions.find((s) => s.id === id);
          if (session) {
            // 1. map the messages directly into local memory
            session.messages = messages.map((m: DBMessage) => ({
              id: m.id,
              role: m.role,
              content: m.content,
            }));

            // fallback: if db returned 0 messages, show a system note
            // instead of a totally blank screen.
            if (session.messages.length === 0 && session.persona !== null) {
              session.messages = [
                {
                  id: `sys-empty-${id}`,
                  role: "system",
                  content: `*No chat history found for this workspace.*`,
                },
              ];
            }

            // 2. map code levels (NEW CODE)
            if (workspaceLevels && workspaceLevels.length > 0) {
              session.history = workspaceLevels.map(
                (lvl: DBWorkspaceLevel) => ({
                  code: lvl.codeSnapshot,
                  activeTask: lvl.taskTitle,
                  language: lvl.language,
                }),
              );

              // automatically jump to the latest level
              session.currentStep = session.history.length - 1;

              // update the tab title to match the latest task
              const latestTask =
                session.history[session.currentStep].activeTask;
              session.title =
                latestTask.length > 15
                  ? latestTask.substring(0, 15) + "..."
                  : latestTask;
            }
          }
        });
      } catch (error) {
        console.error(
          `Failed to fetch heavy payload for workspace ${id}:`,
          error,
        );
      }
    },

    // --- Tab Management ---
    addSession: async () => {
      try {
        // 1. read the current state outside of the mutation block
        const state = get();

        // === if workspaces >= 5, refuse ===
        if (state.sessions.length >= 5) {
          useUIStore
            .getState()
            .showToast(
              "error",
              "Workspace limit reached (5/5). Please delete an old workspace to create a new one.",
            );
          return;
        }

        const activeSession = state.sessions.find(
          (s) => s.id === state.activeSessionId,
        );

        // db requires strict string, default to helios if null
        const currentPersona = activeSession?.persona || "helios";

        // 2. call the backend api
        const response = await api.post("/workspaces", {
          persona: currentPersona,
        });

        // 3. extract the id generated by the backend
        const dbWorkspaceId = response.data.workspace.id;

        // 4. synchronously update the local UI memory
        set((draft) => {
          const newSession = createInitialSession(
            dbWorkspaceId,
            currentPersona,
            "New Tab",
          );

          // agent reaction logic
          if (currentPersona) {
            newSession.messages.push({
              id: `reaction-${Date.now()}`,
              role: "model",
              content:
                currentPersona === "helios"
                  ? "### Context Switch Detected\nWhy did you change the topic? Giving up already? I knew I couldn't trust you.\n\n> What is this distraction about?"
                  : "### New Canvas\nBabe! did I give you a hard time? A fresh start then 🙄.\n\n> What shall we create here?",
            });
            newSession.history[0].activeTask = "Waiting for topic selection...";
            newSession.history[0].code = `// Fresh start with ${currentPersona.toUpperCase()}...`;
          }

          draft.sessions.push(newSession);
          draft.activeSessionId = dbWorkspaceId;
        });
      } catch (error) {
        console.error("Failed to provision workspace in database:", error);
      }
    },

    removeSession: async (id) => {
      const state = get();

      if (state.sessions.length === 1) return; // prevent closing last tab

      // === record if the tab being deleted is the one we are currently looking at ===
      const wasActive = state.activeSessionId === id;

      // 1. lock UI
      set((draft) => {
        if (!draft.deletingIds.includes(id)) {
          draft.deletingIds.push(id);
        }
      });

      try {
        // 2. explicitly wait for the server's verdict
        await api.delete(`/workspaces/${id}`);

        // 3. success: physically remove the tab and clear the lock
        set((draft) => {
          // 3.1 find index
          const index = draft.sessions.findIndex((s) => s.id === id);
          // 3.2 remove
          if (index !== -1) draft.sessions.splice(index, 1);

          // 3.3 if the deleted workspace is the current active one,
          // default activeSession into the last one
          if (draft.activeSessionId === id) {
            draft.activeSessionId =
              draft.sessions[draft.sessions.length - 1].id;
          }

          // 3.4 release the lock
          draft.deletingIds = draft.deletingIds.filter((dId) => dId !== id);
        });

        // 3.5 hydrate the fallback tab
        if (wasActive) {
          const newActiveId = get().activeSessionId;
          get().fetchWorkspacePayload(newActiveId);
        }
      } catch (error) {
        // 4. (429 throttle): release the lock, leave the tab alive
        console.error(`Deletion rejected for workspace ${id}:`, error);

        set((draft) => {
          draft.deletingIds = draft.deletingIds.filter((dId) => dId !== id);
        });
      }
    },

    switchSession: async (id) => {
      // instantly switch the tab in the UI
      set((draft) => {
        draft.activeSessionId = id;
      });

      // silently fetch the heavy payload in the background
      await get().fetchWorkspacePayload(id);
    },

    updateSessionTitle: (id, title) =>
      set((draft) => {
        const session = draft.sessions.find((s) => s.id === id);
        if (session) session.title = title;
      }),

    // --- Workspace Actions ---
    setCode: (newCode) =>
      set((draft) => {
        const session = draft.sessions.find(
          (s) => s.id === draft.activeSessionId,
        );
        if (session) session.history[session.currentStep].code = newCode;
      }),

    syncCurrentCodeToDB: () => {
      const state = get();
      const session = state.sessions.find(
        (s) => s.id === state.activeSessionId,
      );
      if (!session) return;

      const currentStep = session.history[session.currentStep];

      // security check: don't try to save the dummy onboarding placeholders
      if (
        currentStep.activeTask === "Pending Onboarding..." ||
        currentStep.activeTask === "Waiting for topic selection..." ||
        currentStep.activeTask === "Restored Session"
      ) {
        return;
      }

      // update the codeSnapshot to DB
      api
        .patch("/levels", {
          workspaceId: session.id,
          stepNumber: session.currentStep,
          codeSnapshot: currentStep.code,
        })
        .catch((err) => console.error("Failed to sync code snapshot:", err));
    },

    setActiveTask: (newTask) =>
      set((draft) => {
        const session = draft.sessions.find(
          (s) => s.id === draft.activeSessionId,
        );
        if (session) {
          session.history[session.currentStep].activeTask = newTask;

          if (
            newTask !== "Pending Onboarding..." &&
            newTask !== "Waiting for topic selection..."
          ) {
            // logic to prevent ui overflow
            session.title =
              newTask.length > 20 ? newTask.substring(0, 18) + "..." : newTask;
          }
        }
      }),

    setLanguage: (newLang) =>
      set((draft) => {
        const session = draft.sessions.find(
          (s) => s.id === draft.activeSessionId,
        );
        if (session) session.history[session.currentStep].language = newLang;
      }),

    setPersona: (persona) => {
      // 1. read outside mutation block to get the active ID
      const state = get();

      const activeId = state.activeSessionId;

      // 2. background network call
      if (persona) {
        api
          .patch(`/workspaces/${activeId}`, { persona })
          .catch((err) =>
            console.error("Failed to update persona in DB:", err),
          );
      }

      set((draft) => {
        const session = draft.sessions.find(
          (s) => s.id === draft.activeSessionId,
        );
        if (session) session.persona = persona;
      });
    },

    // --- History Navigation ---
    navigateHistory: (direction) =>
      set((draft) => {
        const session = draft.sessions.find(
          (s) => s.id === draft.activeSessionId,
        );

        if (session) {
          const nextStep = session.currentStep + direction;
          if (nextStep >= 0 && nextStep < session.history.length) {
            session.currentStep = nextStep;
          }
        }
      }),

    advanceToNextLevel: (newTask, newCode, newLanguage) => {
      // 1. Read outside the mutation block
      const state = get();
      const session = state.sessions.find(
        (s) => s.id === state.activeSessionId,
      );
      if (!session) return;

      const isOnboarding =
        session.history.length === 1 &&
        (session.history[0].activeTask === "Pending Onboarding..." ||
          session.history[0].activeTask === "Waiting for topic selection..." ||
          session.history[0].activeTask === "Restored Session");

      // The instant UI update
      set((draft) => {
        const draftSession = draft.sessions.find(
          (s) => s.id === draft.activeSessionId,
        );
        if (draftSession) {
          const newTitle =
            newTask.length > 15 ? newTask.substring(0, 15) + "..." : newTask;

          const newStep: HistoryStep = {
            activeTask: newTask,
            code: newCode,
            language: newLanguage,
          };

          if (isOnboarding) {
            draftSession.history = [newStep];
            draftSession.currentStep = 0;
          } else {
            draftSession.history.push(newStep);
            draftSession.currentStep += 1;
          }
          draftSession.title = newTitle;
        }
      });
    },

    // --- Chat Actions ---
    addMessage: (msg) =>
      set((draft) => {
        const session = draft.sessions.find(
          (s) => s.id === draft.activeSessionId,
        );
        if (session) session.messages.push(msg);
      }),

    updateMessage: (msgId, updates) =>
      set((draft) => {
        const session = draft.sessions.find(
          (s) => s.id === draft.activeSessionId,
        );
        if (session) {
          const msg = session.messages.find((m) => m.id === msgId);
          if (msg) Object.assign(msg, updates);
        }
      }),

    setMessages: (msgsOrFn) =>
      set((draft) => {
        const session = draft.sessions.find(
          (s) => s.id === draft.activeSessionId,
        );
        if (session) {
          session.messages =
            typeof msgsOrFn === "function"
              ? msgsOrFn(session.messages)
              : msgsOrFn;
        }
      }),

    // --- Terminal Actions ---
    addLog: (type, message) =>
      set((draft) => {
        const session = draft.sessions.find(
          (s) => s.id === draft.activeSessionId,
        );
        if (session) {
          session.logs.push({
            id: Date.now().toString() + Math.random().toString(),
            type,
            message,
            timestamp: Date.now(),
          });
        }
      }),

    clearLogs: () =>
      set((draft) => {
        const session = draft.sessions.find(
          (s) => s.id === draft.activeSessionId,
        );
        if (session) session.logs = [];
      }),
  })),
);
