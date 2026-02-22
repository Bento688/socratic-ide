export interface Message {
  id: string;
  role: "user" | "model" | "system";
  content: string;
  isStreaming?: boolean;
}

export type Persona = "helios" | "athena" | null;

export type LogType = "info" | "error" | "warn" | "system";

export interface LogEntry {
  id: string;
  type: LogType;
  message: string;
  timestamp: number;
}

export interface HistoryStep {
  code: string;
  activeTask: string;
  language: string;
}

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

export interface Session {
  id: string;
  title: string;
  persona: Persona;

  // Editor State
  history: HistoryStep[];
  currentStep: number; // Index in history

  // Chat State
  messages: Message[];

  // Terminal State
  logs: LogEntry[];
}

export interface IdeContextType {
  // Session Management
  sessions: Session[];
  activeSessionId: string;
  addSession: () => void;
  removeSession: (id: string) => void;
  switchSession: (id: string) => void;
  updateSessionTitle: (id: string, title: string) => void;

  // Active Session Facades (Proxies to activeSession)
  code: string;
  setCode: (code: string) => void;
  activeTask: string;
  setActiveTask: (task: string) => void;
  language: string;
  setLanguage: (lang: string) => void;

  persona: Persona;
  setPersona: (persona: Persona) => void;

  // Chat Facades
  messages: Message[];
  addMessage: (msg: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void; // Support functional updates

  // History Management
  currentStep: number;
  totalSteps: number;
  navigateHistory: (direction: -1 | 1) => void;
  advanceToNextLevel: (
    newTask: string,
    newCode: string,
    newLanguage: string,
  ) => void;
  updateCurrentStep: (updates: Partial<HistoryStep>) => void;

  // Terminal State
  logs: LogEntry[];
  addLog: (type: LogType, message: string) => void;
  clearLogs: () => void;
  isTerminalOpen: boolean;
  setIsTerminalOpen: (isOpen: boolean) => void;

  // Toast State
  toasts: Toast[];
  showToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

export enum ChatStatus {
  IDLE = "IDLE",
  LOADING = "LOADING",
  STREAMING = "STREAMING",
  ERROR = "ERROR",
}
