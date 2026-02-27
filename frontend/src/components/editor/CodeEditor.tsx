import React, { useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import {
  Play,
  Terminal as TerminalIcon,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Terminal } from "./Terminal";
import { Button } from "../ui/Button";
import { useSessionStore } from "../../stores/useSessionStore";
import { useUIStore } from "../../stores/useUIStore";

const CodeEditor: React.FC = () => {
  // wire up UI store
  const isTerminalOpen = useUIStore((state) => state.isTerminalOpen);
  const setIsTerminalOpen = useUIStore((state) => state.setIsTerminalOpen);

  // wire up session store actions
  const setCode = useSessionStore((state) => state.setCode);
  const addLog = useSessionStore((state) => state.addLog);
  const clearLogs = useSessionStore((state) => state.clearLogs);
  const navigateHistory = useSessionStore((state) => state.navigateHistory);

  // wire up derived session state
  const code = useSessionStore((state) => {
    const session = state.sessions.find((s) => s.id === state.activeSessionId);
    return session ? session.history[session.currentStep].code : "";
  });

  const language = useSessionStore((state) => {
    const session = state.sessions.find((s) => s.id === state.activeSessionId);
    return session
      ? session.history[session.currentStep].language
      : "javascript";
  });

  const currentStep = useSessionStore((state) => {
    const session = state.sessions.find((s) => s.id === state.activeSessionId);
    return session ? session.currentStep : 0;
  });

  const totalSteps = useSessionStore((state) => {
    const session = state.sessions.find((s) => s.id === state.activeSessionId);
    return session ? session.history.length : 1;
  });

  const editorRef = useRef<any>(null);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
    }
  };

  const handleNavigation = (direction: -1 | 1) => {
    // Explicitly save the current state of the editor to the history context
    // before navigating away. This ensures the latest keystrokes are captured.
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue();
      setCode(currentValue);
    }
    navigateHistory(direction);
  };

  const handleRunCode = () => {
    if (!isTerminalOpen) setIsTerminalOpen(true);
    clearLogs();
    addLog("system", "Running script...");

    if (language !== "javascript") {
      setTimeout(() => {
        addLog(
          "error",
          `Runtime Error: The browser-based execution engine currently only supports JavaScript. To test ${language}, please request an "Audit" from the AI mentor.`,
        );
      }, 300);
      return;
    }

    try {
      // Create a sandbox for console output
      const sandboxLog = (message: any) => {
        const text =
          typeof message === "object"
            ? JSON.stringify(message, null, 2)
            : String(message);
        addLog("info", text);
      };

      const sandboxError = (message: any) => {
        const text =
          typeof message === "object"
            ? JSON.stringify(message)
            : String(message);
        addLog("error", text);
      };

      // Construct a function body that overrides the global console locally
      const wrappedCode = `
        const console = {
          log: (...args) => args.forEach(arg => __log(arg)),
          error: (...args) => args.forEach(arg => __error(arg)),
          warn: (...args) => args.forEach(arg => __log(arg)),
          info: (...args) => args.forEach(arg => __log(arg)),
        };
        try {
          ${code}
        } catch (err) {
          __error(err.message);
        }
      `;

      // Execute safely
      const run = new Function("__log", "__error", wrappedCode);
      run(sandboxLog, sandboxError);

      addLog("system", "Execution finished.");
    } catch (e: any) {
      addLog("error", `Syntax/Runtime Error: ${e.message}`);
    }
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    monaco.editor.defineTheme("helios-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#09090b",
        "editor.lineHighlightBackground": "#18181b",
        "editor.foreground": "#e4e4e7",
        "editorGutter.background": "#09090b",
        "editorWidget.background": "#18181b",
        "editorWidget.border": "#27272a",
      },
    });
    monaco.editor.setTheme("helios-dark");
  };

  const getFileName = (lang: string) => {
    switch (lang) {
      case "javascript":
        return "script.js";
      case "typescript":
        return "main.ts";
      case "python":
        return "main.py";
      case "sql":
        return "query.sql";
      case "go":
        return "main.go";
      case "rust":
        return "main.rs";
      case "cpp":
        return "main.cpp";
      case "java":
        return "Main.java";
      default:
        return "code.txt";
    }
  };

  return (
    <div className="h-full w-full bg-[#09090b] flex flex-col relative group">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-900 bg-[#09090b] shrink-0">
        {/* Left: File Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-zinc-500">
            <span className="text-[10px] uppercase tracking-widest font-bold">
              Source
            </span>
            <span className="text-xs text-zinc-300 font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-sm">
              {getFileName(language)}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* History Navigation */}
          <div className="flex items-center mr-2 border-r border-zinc-800 pr-2 gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleNavigation(-1)}
              disabled={currentStep === 0}
              className="h-7 w-7 px-0 text-zinc-500 disabled:opacity-20"
              title="Previous Task"
            >
              <ChevronLeft size={14} />
            </Button>
            <span className="text-[10px] text-zinc-600 font-mono min-w-7.5 text-center select-none">
              {currentStep + 1} / {totalSteps}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleNavigation(1)}
              disabled={currentStep === totalSteps - 1}
              className="h-7 w-7 px-0 text-zinc-500 disabled:opacity-20"
              title="Next Task"
            >
              <ChevronRight size={14} />
            </Button>
          </div>

          {!isTerminalOpen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTerminalOpen(true)}
              className="h-7 text-[10px] uppercase tracking-wider gap-2 text-zinc-500 hover:text-zinc-300"
            >
              <TerminalIcon size={12} />
              Console
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={handleRunCode}
            className="h-7 bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-none gap-2 text-[10px] uppercase tracking-widest px-4 rounded-sm"
          >
            <Play size={10} fill="currentColor" />
            Run
          </Button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="grow relative overflow-hidden">
        <Editor
          height="100%"
          language={language === "react" ? "javascript" : language}
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          loading={
            <div className="text-zinc-500 font-mono text-xs p-4">
              Initializing buffer...
            </div>
          }
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1.6,
            padding: { top: 24, bottom: 24 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            renderLineHighlight: "all",
            scrollbar: {
              useShadows: false,
              vertical: "visible",
              horizontal: "hidden",
              verticalScrollbarSize: 8,
            },
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
            // Allow editing previous steps if the user wants to experiment,
            // but effectively they are branching their own history locally until refresh.
            readOnly: false,
          }}
        />

        {/* Read-Only Indicator for History */}
        {currentStep < totalSteps - 1 && (
          <div className="absolute top-4 right-8 z-10 pointer-events-none">
            <span className="text-[10px] bg-zinc-800/90 text-zinc-400 px-2 py-1 rounded-sm border border-zinc-700/50 uppercase tracking-widest flex items-center gap-2 backdrop-blur-sm shadow-xl">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
              History Mode
            </span>
          </div>
        )}

        {/* Warning Overlay for Non-JS languages */}
        {language !== "javascript" && language !== "react" && (
          <div className="absolute bottom-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="bg-zinc-900/90 border border-amber-900/30 backdrop-blur-sm px-3 py-2 rounded-sm flex items-center gap-2 text-[10px] text-amber-500/80">
              <AlertTriangle size={12} />
              <span>Live Execution unavailable for {language}</span>
            </div>
          </div>
        )}
      </div>

      {/* Terminal Panel (Conditional) */}
      {isTerminalOpen && <Terminal />}
    </div>
  );
};

export default CodeEditor;
